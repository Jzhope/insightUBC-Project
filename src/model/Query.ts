export type ApplyToken = "MAX" | "MIN" | "AVG" | "SUM" | "COUNT";

export type OrderSpec =
	| string
	| {
			dir: "UP" | "DOWN";
			keys: string[];
	  };

export interface OptionsClause {
	COLUMNS: string[];
	ORDER?: OrderSpec;
}

export interface ApplyRuleObject {
	[applyKey: string]: Partial<Record<ApplyToken, string>>;
}

export interface Transformations {
	GROUP: string[];
	APPLY: ApplyRuleObject[];
}

export interface QueryShape {
	WHERE: any;
	OPTIONS: OptionsClause;
	TRANSFORMATIONS?: Transformations;
}

export const SECTIONS_NUMERIC_SUFFIXES = new Set(["avg", "pass", "fail", "audit", "year"]);

export const SECTIONS_STRING_SUFFIXES = new Set(["dept", "id", "instructor", "title", "uuid"]);

export const ROOMS_NUMERIC_SUFFIXES = new Set(["lat", "lon", "seats"]);

export const ROOMS_STRING_SUFFIXES = new Set([
	"fullname",
	"shortname",
	"address",
	"number",
	"name",
	"type",
	"furniture",
	"href",
]);

export type DatasetKind = "sections" | "rooms";

export function isOrderObject(x: unknown): x is { dir: "UP" | "DOWN"; keys: string[] } {
	if (!x || typeof x !== "object") return false;
	const o = x as any;
	const okDir = o.dir === "UP" || o.dir === "DOWN";
	const okKeys = Array.isArray(o.keys) && o.keys.length > 0 && o.keys.every((k: any) => typeof k === "string");
	return okDir && okKeys;
}

export function isApplyToken(x: string): x is ApplyToken {
	return x === "MAX" || x === "MIN" || x === "AVG" || x === "SUM" || x === "COUNT";
}

export function splitDatasetKey(k: unknown): [string | undefined, string | undefined] {
	if (typeof k !== "string") return [undefined, undefined];
	const idx = k.indexOf("_");
	if (idx <= 0 || idx === k.length - 1) return [undefined, undefined];
	return [k.substring(0, idx), k.substring(idx + 1)];
}

export function inferKindFromSuffix(suffix: string | undefined): DatasetKind {
	if (!suffix) return "sections";
	if (ROOMS_NUMERIC_SUFFIXES.has(suffix) || ROOMS_STRING_SUFFIXES.has(suffix)) {
		return "rooms";
	}
	return "sections";
}
