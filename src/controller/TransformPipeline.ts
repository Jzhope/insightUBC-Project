// src/controller/TransformPipeline.ts

import { applyTransformations, sortResults } from "./ApplyAndSort";

export const MAX_RESULTS = 5000;

type OrderSpec =
	| string
	| {
			dir: "UP" | "DOWN";
			keys: string[];
	  };

interface OptionsClause {
	COLUMNS: string[];
	ORDER?: OrderSpec;
}

interface Transformations {
	GROUP: string[];
	APPLY: Array<Record<string, Partial<Record<"MAX" | "MIN" | "AVG" | "SUM" | "COUNT", string>>>>;
}

interface QueryShape {
	WHERE?: any;
	OPTIONS: OptionsClause;
	TRANSFORMATIONS?: Transformations;
}

export function runTransformAndSort(rows: any[], query: QueryShape): any[] {
	const { OPTIONS, TRANSFORMATIONS } = query;
	if (!OPTIONS || !Array.isArray(OPTIONS.COLUMNS)) {
		throw new Error("OPTIONS.COLUMNS is required and must be an array.");
	}

	let working = rows;
	if (TRANSFORMATIONS && Array.isArray(TRANSFORMATIONS.GROUP)) {
		working = applyTransformations(working, TRANSFORMATIONS);
	}

	working = projectColumns(working, OPTIONS.COLUMNS);

	if (OPTIONS.ORDER) {
		working = sortResults(working, OPTIONS.ORDER);
	}

	if (working.length > MAX_RESULTS) {
		working = working.slice(0, MAX_RESULTS);
	}

	return working;
}

function projectColumns(rows: any[], columns: string[]): any[] {
	if (columns.length === 0) {
		return [];
	}

	const out = new Array(rows.length);
	for (let i = 0; i < rows.length; i++) {
		const r = rows[i];
		const o: Record<string, any> = {};
		for (const c of columns) {
			o[c] = r[c];
		}
		out[i] = o;
	}
	return out;
}

export default runTransformAndSort;
