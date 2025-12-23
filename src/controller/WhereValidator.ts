// src/controller/WhereValidator.ts
// Validates WHERE clause structure

import {
	DatasetKind,
	SECTION_NUM_FIELDS,
	SECTION_STR_FIELDS,
	ROOM_NUM_FIELDS,
	ROOM_STR_FIELDS,
} from "./QueryValidatorTypes";
import { isObject, validateAndClassifyDatasetKey } from "./QueryValidatorHelpers";

function validateIsPattern(s: string): void {
	if (typeof s !== "string") {
		throw new Error("IS value must be a string");
	}
	// Wildcard rule: * may appear only as a prefix/suffix (any run at start/end),
	// never in the middle of the string.
	if (!s.includes("*")) {
		return;
	}
	let left = 0;
	while (left < s.length && s[left] === "*") left++;
	let right = s.length - 1;
	while (right >= 0 && s[right] === "*") right--;
	const middle = s.slice(left, right + 1);
	if (middle.includes("*")) {
		throw new Error("IS string cannot contain wildcard in the middle");
	}
}

function validateLogicalOperator(op: string, val: any): Array<{ id: string; field: string; kind: DatasetKind }> {
	const used: Array<{ id: string; field: string; kind: DatasetKind }> = [];
	if (!Array.isArray(val) || val.length === 0) {
		throw new Error(`${op} must be a non-empty array`);
	}
	for (const sub of val) {
		used.push(...validateWhere(sub));
	}
	return used;
}

function validateComparisonOperator(op: string, val: any): Array<{ id: string; field: string; kind: DatasetKind }> {
	if (!isObject(val) || Object.keys(val).length !== 1) {
		throw new Error(`${op} must be an object with exactly one key`);
	}
	const k = Object.keys(val)[0];
	const v = (val as Record<string, unknown>)[k];
	const { id, field, kind } = validateAndClassifyDatasetKey(k);

	const isNumericField =
		(kind === "sections" && SECTION_NUM_FIELDS.has(field)) || (kind === "rooms" && ROOM_NUM_FIELDS.has(field));
	if (!isNumericField) {
		throw new Error(`${op} requires a numeric field; "${field}" is not numeric`);
	}
	if (typeof v !== "number" || Number.isNaN(v)) {
		throw new Error(`${op} value must be a number`);
	}
	return [{ id, field, kind }];
}

function validateIsOperator(val: any): Array<{ id: string; field: string; kind: DatasetKind }> {
	if (!isObject(val) || Object.keys(val).length !== 1) {
		throw new Error("IS must be an object with exactly one key");
	}
	const k = Object.keys(val)[0];
	const v = (val as Record<string, unknown>)[k];
	const { id, field, kind } = validateAndClassifyDatasetKey(k);

	const isStringField =
		(kind === "sections" && SECTION_STR_FIELDS.has(field)) || (kind === "rooms" && ROOM_STR_FIELDS.has(field));
	if (!isStringField) {
		throw new Error(`IS requires a string field; "${field}" is not string`);
	}
	validateIsPattern(v as string);
	return [{ id, field, kind }];
}

export function validateWhere(where: any): Array<{ id: string; field: string; kind: DatasetKind }> {
	const used: Array<{ id: string; field: string; kind: DatasetKind }> = [];

	// Must be an object…
	if (!isObject(where)) {
		throw new Error("WHERE must be an object");
	}

	// …but an empty object is allowed (match-all filter).
	if (Object.keys(where).length === 0) {
		return used;
	}

	// From here on, WHERE must have exactly one operator.
	const keys = Object.keys(where);
	if (keys.length !== 1) {
		throw new Error("WHERE must have exactly one key");
	}
	const op = keys[0];
	const val = (where as Record<string, unknown>)[op];

	switch (op) {
		case "AND":
		case "OR":
			return validateLogicalOperator(op, val);
		case "NOT":
			// NOT must wrap a valid single-clause object
			if (!isObject(val) || Object.keys(val).length !== 1) {
				throw new Error("NOT must be an object with exactly one key");
			}
			used.push(...validateWhere(val));
			return used;
		case "LT":
		case "GT":
		case "EQ":
			return validateComparisonOperator(op, val);
		case "IS":
			return validateIsOperator(val);
		default:
			throw new Error(`Unknown WHERE operator "${op}"`);
	}
}
