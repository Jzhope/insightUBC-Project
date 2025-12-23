// src/controller/QueryValidatorHelpers.ts
// Helper functions for query validation

import {
	DatasetKind,
	SECTION_NUM_FIELDS,
	SECTION_STR_FIELDS,
	ROOM_NUM_FIELDS,
	ROOM_STR_FIELDS,
} from "./QueryValidatorTypes";

export function isObject(v: any): v is Record<string, any> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function hasUnderscoreKey(key: string): boolean {
	return typeof key === "string" && key.includes("_");
}

export function splitKey(key: string): { id: string; field: string } {
	const idx = key.indexOf("_");
	return { id: key.slice(0, idx), field: key.slice(idx + 1) };
}

export function inferKindFromField(field: string): DatasetKind | undefined {
	if (SECTION_NUM_FIELDS.has(field) || SECTION_STR_FIELDS.has(field)) {
		return "sections";
	}
	if (ROOM_NUM_FIELDS.has(field) || ROOM_STR_FIELDS.has(field)) {
		return "rooms";
	}
	return undefined;
}

export function isDatasetKeyFormat(key: string): boolean {
	if (!hasUnderscoreKey(key)) {
		return false;
	}
	const { id, field } = splitKey(key);
	return id.trim().length > 0 && field.trim().length > 0;
}

export function validateAndClassifyDatasetKey(key: string): { id: string; field: string; kind: DatasetKind } {
	if (!hasUnderscoreKey(key)) {
		throw new Error(`Key "${key}" must be a dataset key`);
	}
	if (!isDatasetKeyFormat(key)) {
		throw new Error("must be a dataset key");
	}
	const { id, field } = splitKey(key);
	const kind = inferKindFromField(field);
	if (!kind) {
		throw new Error(`Unknown field "${field}" in key "${key}"`);
	}
	return { id, field, kind };
}

export function collectIdsFromKeys(keys: string[]): string[] {
	const ids: string[] = [];
	for (const k of keys) {
		if (hasUnderscoreKey(k)) {
			ids.push(splitKey(k).id);
		}
	}
	return ids;
}
