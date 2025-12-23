// src/controller/TransformationsValidator.ts
// Validates TRANSFORMATIONS (GROUP/APPLY)

import { DatasetKind, ApplyToken, SECTION_NUM_FIELDS, ROOM_NUM_FIELDS } from "./QueryValidatorTypes";
import { isObject, validateAndClassifyDatasetKey } from "./QueryValidatorHelpers";

function validateGroupKeys(GROUP: any): Array<{ id: string; field: string; kind: DatasetKind }> {
	if (!Array.isArray(GROUP) || GROUP.length === 0) {
		throw new Error("TRANSFORMATIONS.GROUP must be a non-empty array");
	}
	return GROUP.map(validateAndClassifyDatasetKey);
}

function validateApplyKeyStructure(rule: any, applyKeys: string[]): string {
	if (!isObject(rule) || Object.keys(rule).length !== 1) {
		throw new Error("APPLY rule must define exactly one applyKey");
	}
	const applyKey = Object.keys(rule)[0];
	if (applyKey.includes("_")) {
		throw new Error("APPLY key contains underscore");
	}
	if (applyKeys.includes(applyKey)) {
		throw new Error("Duplicate apply key");
	}
	return applyKey;
}

function validateApplyOperator(inner: any, applyKey: string): { token: ApplyToken; ref: string } {
	if (!isObject(inner)) {
		throw new Error(`APPLY "${applyKey}" must map to an operator object`);
	}
	const innerOps = Object.keys(inner);
	if (innerOps.length !== 1) {
		throw new Error(`APPLY "${applyKey}" must contain exactly one operator`);
	}
	const token = innerOps[0] as ApplyToken;
	const ref = (inner as any)[token];
	if (typeof ref !== "string") {
		throw new Error(`APPLY token reference for "${applyKey}" must be a string`);
	}
	return { token, ref };
}

function validateApplyFieldType(token: ApplyToken, field: string, refKind: DatasetKind, applyKey: string): void {
	if (token === "COUNT") {
		return;
	}
	if (token === "MAX" || token === "MIN" || token === "SUM" || token === "AVG") {
		const isNumeric =
			(refKind === "sections" && SECTION_NUM_FIELDS.has(field)) || (refKind === "rooms" && ROOM_NUM_FIELDS.has(field));
		if (!isNumeric) {
			throw new Error(`${token} requires a numeric field; "${field}" is not numeric`);
		}
	} else {
		throw new Error(`Unknown APPLY token "${token}"`);
	}
}

function validateApplyRule(
	rule: any,
	datasetId: string,
	applyKeys: string[]
): { applyKey: string; refId: string; refKind: DatasetKind } {
	const applyKey = validateApplyKeyStructure(rule, applyKeys);
	const inner = (rule as any)[applyKey];
	const { token, ref } = validateApplyOperator(inner, applyKey);
	const { id, field, kind: refKind } = validateAndClassifyDatasetKey(ref);

	if (id !== datasetId) {
		throw new Error("APPLY field uses different dataset id");
	}

	validateApplyFieldType(token, field, refKind, applyKey);

	return { applyKey, refId: id, refKind };
}

function validateApplyRules(APPLY: any, datasetId: string): { applyKeys: string[] } {
	if (!Array.isArray(APPLY)) {
		throw new Error("TRANSFORMATIONS.APPLY must be an array");
	}

	const applyKeys: string[] = [];
	for (const rule of APPLY) {
		const { applyKey } = validateApplyRule(rule, datasetId, applyKeys);
		applyKeys.push(applyKey);
	}

	return { applyKeys };
}

export function validateTransformations(t: any): {
	groupKeys: string[];
	applyKeys: string[];
	datasetId: string;
	kind: DatasetKind;
} {
	if (!isObject(t)) {
		throw new Error("TRANSFORMATIONS must be an object");
	}
	const GROUP = (t as any).GROUP;
	const APPLY = (t as any).APPLY;

	const groupClassified = validateGroupKeys(GROUP);
	const groupIds = Array.from(new Set(groupClassified.map((g) => g.id)));
	if (groupIds.length !== 1) {
		throw new Error("GROUP keys must use the same dataset id");
	}
	const groupKinds = Array.from(new Set(groupClassified.map((g) => g.kind)));
	if (groupKinds.length !== 1) {
		throw new Error("GROUP keys must all be of the same dataset kind");
	}
	const datasetId = groupIds[0];
	const kind = groupKinds[0];

	const { applyKeys } = validateApplyRules(APPLY, datasetId);

	return { groupKeys: GROUP.slice(), applyKeys, datasetId, kind: kind as DatasetKind };
}
