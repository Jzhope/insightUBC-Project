// src/controller/ApplyAndSort.ts

import Decimal from "decimal.js";

export type ApplyToken = "MAX" | "MIN" | "AVG" | "SUM" | "COUNT";

export interface Transformations {
	GROUP: string[];
	APPLY: Array<Record<string, Partial<Record<ApplyToken, string>>>>;
}

export type OrderSpec =
	| string
	| {
			dir: "UP" | "DOWN";
			keys: string[];
	  };

/**
 * Groups rows by GROUP keys and applies APPLY rules.
 * Returns one row per group containing the group keys + computed apply keys.
 *
 * @param rows - source rows (already filtered)
 * @param transformations - { GROUP, APPLY } per spec
 */

export function applyTransformations(rows: any[], transformations: Transformations): any[] {
	if (!transformations || !Array.isArray(transformations.GROUP)) {
		return rows;
	}

	const groupKeys = transformations.GROUP;
	const applyRules = transformations.APPLY ?? [];
	const groups = groupBy(rows, groupKeys);
	const out: any[] = [];
	for (const [key, gRows] of groups) {
		const groupObj = JSON.parse(key);
		const applyValues: Record<string, any> = {};
		for (const rule of applyRules) {
			const { applyKey, token, field } = parseApplyRule(rule);
			applyValues[applyKey] = computeAggregate(token, field, gRows);
		}

		out.push({ ...groupObj, ...applyValues });
	}

	return out;
}

export function sortResults(rows: any[], order: OrderSpec | undefined): any[] {
	if (!order) return rows;

	let keys: string[] = [];
	let dirMul: 1 | -1 = 1;

	if (typeof order === "string") {
		keys = [order];
		dirMul = 1;
	} else if (order && Array.isArray(order.keys) && order.keys.length > 0) {
		keys = order.keys;
		dirMul = order.dir === "DOWN" ? -1 : 1;
	} else {
		return rows;
	}

	const copy = rows.slice();

	copy.sort((a: any, b: any) => {
		for (const k of keys) {
			const av = a[k];
			const bv = b[k];

			if (av < bv) return -1 * dirMul;
			if (av > bv) return 1 * dirMul;
		}
		return 0;
	});

	return copy;
}

function groupBy(rows: any[], keys: string[]): Map<string, any[]> {
	const m = new Map<string, any[]>();

	for (const r of rows) {
		const keyObj: Record<string, any> = {};
		for (const k of keys) keyObj[k] = r[k];

		const composite = JSON.stringify(keyObj); // stable group key
		const bucket = m.get(composite);
		if (bucket) {
			bucket.push(r);
		} else {
			m.set(composite, [r]);
		}
	}

	return m;
}

function parseApplyRule(rule: Record<string, any>): {
	applyKey: string;
	token: ApplyToken;
	field: string;
} {
	const keys = Object.keys(rule);
	if (keys.length !== 1) {
		throw new Error("Invalid APPLY rule: exactly one applyKey required.");
	}
	const applyKey = keys[0];

	const opObj = rule[applyKey];
	const opName = Object.keys(opObj)[0] as ApplyToken | undefined;
	const field = opObj[opName as string];

	if (!opName || !field) {
		throw new Error("Invalid APPLY rule: missing operator or field.");
	}

	if (!isApplyToken(opName)) {
		throw new Error(`Invalid APPLY token: ${opName}`);
	}

	if (applyKey.includes("_")) {
		throw new Error(`Apply key "${applyKey}" must not contain underscore.`);
	}

	return { applyKey, token: opName, field };
}

function isApplyToken(x: string): x is ApplyToken {
	return x === "MAX" || x === "MIN" || x === "AVG" || x === "SUM" || x === "COUNT";
}

function computeAggregate(token: ApplyToken, field: string, rows: any[]): number {
	switch (token) {
		case "MAX":
			return computeMax(field, rows);
		case "MIN":
			return computeMin(field, rows);
		case "SUM":
			return computeSum(field, rows);
		case "AVG":
			return computeAvg(field, rows);
		case "COUNT":
			return computeCountDistinct(field, rows);
	}
}

function computeMax(field: string, rows: any[]): number {
	let maxVal: number | undefined = undefined;
	for (const r of rows) {
		const v = r[field];
		if (typeof v !== "number") {
			throw new Error(`MAX requires numeric field: ${field}`);
		}
		if (maxVal === undefined || v > maxVal) maxVal = v;
	}
	return maxVal ?? Number.NEGATIVE_INFINITY;
}

function computeMin(field: string, rows: any[]): number {
	let minVal: number | undefined = undefined;
	for (const r of rows) {
		const v = r[field];
		if (typeof v !== "number") {
			throw new Error(`MIN requires numeric field: ${field}`);
		}
		if (minVal === undefined || v < minVal) minVal = v;
	}
	return minVal ?? Number.POSITIVE_INFINITY;
}

function computeSum(field: string, rows: any[]): number {
	let total = 0;
	for (const r of rows) {
		const v = r[field];
		if (typeof v !== "number") {
			throw new Error(`SUM requires numeric field: ${field}`);
		}
		total += v;
	}
	return Number(total.toFixed(2));
}

function computeAvg(field: string, rows: any[]): number {
	let total = new Decimal(0);
	for (const r of rows) {
		const v = r[field];
		if (typeof v !== "number") {
			throw new Error(`AVG requires numeric field: ${field}`);
		}
		total = total.add(new Decimal(v));
	}
	const numRows = rows.length;
	const avg = total.toNumber() / numRows;
	return Number(avg.toFixed(2));
}

function computeCountDistinct(field: string, rows: any[]): number {
	const seen = new Set<string>();
	for (const r of rows) {
		const v = r[field];
		const key = `${typeof v}|${String(v)}`;
		seen.add(key);
	}
	return seen.size;
}
