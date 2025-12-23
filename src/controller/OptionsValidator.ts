// src/controller/OptionsValidator.ts
// Validates OPTIONS (COLUMNS and ORDER)

import { OrderSpec, Transformations } from "./QueryValidatorTypes";
import { isObject, hasUnderscoreKey } from "./QueryValidatorHelpers";

export function validateOptions(options: any): { columns: string[]; order?: OrderSpec } {
	if (!isObject(options)) {
		throw new Error("OPTIONS must be an object");
	}
	const { COLUMNS, ORDER } = options;
	if (!Array.isArray(COLUMNS) || COLUMNS.length === 0) {
		throw new Error("COLUMNS must be a non-empty array");
	}

	if (ORDER !== undefined) {
		if (typeof ORDER !== "string" && !isObject(ORDER)) {
			throw new Error("ORDER must be a string or an object");
		}
		if (typeof ORDER === "string") {
			// defer "ORDER key must also appear in OPTIONS.COLUMNS" to later
		} else {
			const { dir, keys } = ORDER;
			if (dir !== "UP" && dir !== "DOWN") {
				throw new Error('ORDER.dir must be "UP" or "DOWN"');
			}
			if (!Array.isArray(keys) || keys.length === 0) {
				throw new Error("ORDER object must use a non-empty keys array");
			}
		}
	}
	return { columns: COLUMNS.slice(), order: ORDER as any };
}

export function validateColumnsVsTransformations(
	columns: string[],
	transformations: Transformations | undefined,
	groupKeys: string[],
	applyKeys: string[]
): void {
	if (!transformations) {
		for (const c of columns) {
			if (!hasUnderscoreKey(c)) {
				throw new Error(`COLUMNS element "${c}" is not a dataset key`);
			}
		}
	} else {
		const allowed = new Set<string>([...groupKeys, ...applyKeys]);
		for (const c of columns) {
			if (!allowed.has(c)) {
				throw new Error(`COLUMNS element "${c}" which is not a GROUP key or an APPLY key`);
			}
		}
	}
}

export function validateOrderAgainstColumns(order: OrderSpec | undefined, columns: string[]): void {
	if (order === undefined) {
		return;
	}
	if (typeof order === "string") {
		if (!columns.includes(order)) {
			throw new Error("ORDER key must also appear in OPTIONS.COLUMNS");
		}
	} else {
		for (const k of order.keys) {
			if (!columns.includes(k)) {
				throw new Error("ORDER key must also appear in OPTIONS.COLUMNS");
			}
		}
	}
}
