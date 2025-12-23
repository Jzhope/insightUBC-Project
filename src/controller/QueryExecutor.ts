// src/controller/QueryExecutor.ts
// Execute a validated query over in-memory rows.
// Handles WHERE, optional TRANSFORMATIONS (GROUP/APPLY),
// projection, ORDER, and the 5000-row cap.

import QueryValidator from "./QueryValidator";
import { ResultTooLargeError } from "./IInsightFacade";
import Decimal from "decimal.js";

const MAX_QUERY_RESULTS = 5000;

type OrderSpec =
	| string
	| {
			dir: "UP" | "DOWN";
			keys: string[];
	  };

type Transformations = {
	GROUP: string[];
	APPLY: Array<Record<string, Partial<Record<"MAX" | "MIN" | "AVG" | "SUM" | "COUNT", string>>>>;
};

type QueryShape = {
	WHERE: any;
	OPTIONS: {
		COLUMNS: string[];
		ORDER?: OrderSpec;
	};
	TRANSFORMATIONS?: Transformations;
};

function isObject(v: any): v is Record<string, any> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isEmptyWhereClause(where: any): boolean {
	return isObject(where) && Object.keys(where).length === 0;
}

// Map a query key to the actual row property
function getRowValue(row: any, key: string, datasetId: string): any {
	if (row === null || row === undefined) return undefined;

	if (key in row) return row[key];

	if (key.includes("_")) {
		const idx = key.indexOf("_");
		const id = key.slice(0, idx);
		const field = key.slice(idx + 1);
		if (id !== datasetId) return undefined;
		if (field in row) return row[field];
		return undefined;
	}

	return row[key];
}

function wildcardToRegex(pattern: string): RegExp {
	const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&").replace(/\*/g, ".*");
	return new RegExp(`^${escaped}$`);
}

// Logical ops
function matchesLogicalOperator(op: string, val: any, row: any, datasetId: string): boolean {
	switch (op) {
		case "AND":
			return Array.isArray(val) && val.every((sub) => matchesWhere(row, sub, datasetId));
		case "OR":
			return Array.isArray(val) && val.some((sub) => matchesWhere(row, sub, datasetId));
		case "NOT":
			return !matchesWhere(row, val, datasetId);
		default:
			return false;
	}
}

// LT/GT/EQ
function matchesComparisonOperator(op: string, val: any, row: any, datasetId: string): boolean {
	const k = Object.keys(val)[0];
	const v = val[k];
	const rowVal = getRowValue(row, k, datasetId);
	if (typeof rowVal !== "number" || typeof v !== "number") return false;

	if (op === "LT") return rowVal < v;
	if (op === "GT") return rowVal > v;
	return rowVal === v;
}

// IS
function matchesIsOperator(val: any, row: any, datasetId: string): boolean {
	const k = Object.keys(val)[0];
	const v = val[k];
	const rowVal = getRowValue(row, k, datasetId);
	if (typeof rowVal !== "string" || typeof v !== "string") return false;
	return wildcardToRegex(v).test(rowVal);
}

// WHERE
function matchesWhere(row: any, where: any, datasetId: string): boolean {
	if (!isObject(where) || Object.keys(where).length === 0) {
		// empty WHERE matches all
		return true;
	}

	const op = Object.keys(where)[0];
	const val = where[op];

	if (op === "AND" || op === "OR" || op === "NOT") {
		return matchesLogicalOperator(op, val, row, datasetId);
	}

	if (op === "LT" || op === "GT" || op === "EQ") {
		return matchesComparisonOperator(op, val, row, datasetId);
	}

	if (op === "IS") {
		return matchesIsOperator(val, row, datasetId);
	}

	return false;
}

// GROUP/APPLY helpers
function groupBy(rows: any[], keys: string[], datasetId: string): Map<string, any[]> {
	const map = new Map<string, any[]>();
	for (const r of rows) {
		const tuple = keys.map((k) => getRowValue(r, k, datasetId));
		const gkey = JSON.stringify(tuple);
		const arr = map.get(gkey);
		if (arr) {
			arr.push(r);
		} else {
			map.set(gkey, [r]);
		}
	}
	return map;
}

function distinctCount(values: any[]): number {
	const seen = new Set<string>();
	for (const v of values) {
		seen.add(`${typeof v}::${String(v)}`);
	}
	return seen.size;
}

function preciseSum(nums: number[]): number {
	let acc = new Decimal(0);
	for (const x of nums) acc = acc.plus(new Decimal(x));
	return Number(acc.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString());
}

function preciseAvg(nums: number[]): number {
	if (nums.length === 0) return 0;
	let acc = new Decimal(0);
	for (const x of nums) acc = acc.plus(new Decimal(x));
	const avg = acc.div(nums.length);
	return Number(avg.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString());
}

// Sorting
function compareValues(a: any, b: any, dir: "UP" | "DOWN"): number {
	if (a === undefined && b === undefined) return 0;
	if (a === undefined) return dir === "UP" ? 1 : -1;
	if (b === undefined) return dir === "UP" ? -1 : 1;

	let cmp = 0;
	if (a < b) cmp = -1;
	else if (a > b) cmp = 1;

	return dir === "UP" ? cmp : -cmp;
}

function sortRows(rows: any[], order: OrderSpec | undefined, datasetId: string): any[] {
	if (!order) return rows;

	const decorated = rows.map((r, i) => ({ r, i }));

	if (typeof order === "string") {
		decorated.sort((A, B) => {
			const c = compareValues(getRowValue(A.r, order, datasetId), getRowValue(B.r, order, datasetId), "UP");
			return c !== 0 ? c : A.i - B.i;
		});
	} else {
		const dir = order.dir;
		const keys = order.keys.slice();
		decorated.sort((A, B) => {
			for (const k of keys) {
				const av = getRowValue(A.r, k, datasetId);
				const bv = getRowValue(B.r, k, datasetId);
				const c = compareValues(av, bv, dir);
				if (c !== 0) return c;
			}
			return A.i - B.i;
		});
	}

	return decorated.map((d) => d.r);
}

// APPLY group
function applyRulesToGroup(
	rows: any[],
	applyRules: Array<Record<string, Partial<Record<"MAX" | "MIN" | "AVG" | "SUM" | "COUNT", string>>>>,
	datasetId: string
): Record<string, number> {
	const result: Record<string, number> = {};

	for (const rule of applyRules) {
		const applyKey = Object.keys(rule)[0];
		const inner = (rule as any)[applyKey];
		const token = Object.keys(inner)[0] as "MAX" | "MIN" | "AVG" | "SUM" | "COUNT";
		const ref = inner[token] as string;
		const rawValues = rows.map((r) => getRowValue(r, ref, datasetId));

		if (token === "COUNT") {
			result[applyKey] = distinctCount(rawValues);
			continue;
		}

		const values = rawValues.filter((v): v is number => typeof v === "number");

		switch (token) {
			case "MAX":
				result[applyKey] = values.length ? Math.max(...values) : Number.NEGATIVE_INFINITY;
				break;
			case "MIN":
				result[applyKey] = values.length ? Math.min(...values) : Number.POSITIVE_INFINITY;
				break;
			case "SUM":
				result[applyKey] = preciseSum(values);
				break;
			case "AVG":
				result[applyKey] = preciseAvg(values);
				break;
		}
	}

	return result;
}

export default class QueryExecutor {
	private filterRows(datasetRows: any[], where: any, datasetId: string): any[] {
		return datasetRows.filter((r) => matchesWhere(r, where, datasetId));
	}

	private applyTransformations(filtered: any[], transformations: Transformations, datasetId: string): any[] {
		const { GROUP, APPLY } = transformations;
		const groups = groupBy(filtered, GROUP, datasetId);

		const out: any[] = [];
		for (const [gkey, rows] of groups.entries()) {
			const tuple = JSON.parse(gkey);
			const base: any = {};

			GROUP.forEach((k, i) => {
				base[k] = tuple[i];
			});

			Object.assign(base, applyRulesToGroup(rows, APPLY, datasetId));

			out.push(base);
		}
		return out;
	}

	private projectColumns(rows: any[], columns: string[], datasetId: string): any[] {
		return rows.map((r) => {
			const obj: any = {};
			for (const c of columns) {
				obj[c] = getRowValue(r, c, datasetId);
			}
			return obj;
		});
	}

	private applySortAndLimit(rows: any[], order: OrderSpec | undefined, dId: string, enforceCap: boolean): any[] {
		const sorted = sortRows(rows, order, dId);

		if (enforceCap && sorted.length > MAX_QUERY_RESULTS) {
			throw new ResultTooLargeError("Query results too large (>5000)");
		}

		return sorted;
	}

	public execute(query: QueryShape, datasetRows: any[]): any[] {
		const validation = QueryValidator.validate(query as any);
		const datasetId = validation.datasetId;

		// 1) Filter
		const filtered = this.filterRows(datasetRows, query.WHERE, datasetId);

		// 2) Transformations
		const rowsForProjection = query.TRANSFORMATIONS
			? this.applyTransformations(filtered, query.TRANSFORMATIONS, datasetId)
			: filtered;

		// 3) Project
		const projected = this.projectColumns(rowsForProjection, query.OPTIONS.COLUMNS, datasetId);

		// 4) Sort + cap only if WHERE empty
		const emptyWhere = isEmptyWhereClause(query.WHERE);

		return this.applySortAndLimit(projected, query.OPTIONS.ORDER, datasetId, emptyWhere);
	}
}
