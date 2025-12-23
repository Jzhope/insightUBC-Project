// src/controller/QueryValidatorTypes.ts
// Shared types and constants for query validation

export type DatasetKind = "sections" | "rooms";
export type ApplyToken = "MAX" | "MIN" | "AVG" | "SUM" | "COUNT";

export type OrderSpec =
	| string
	| {
			dir: "UP" | "DOWN";
			keys: string[];
	  };

export interface Transformations {
	GROUP: string[];
	APPLY: Array<Record<string, Partial<Record<ApplyToken, string>>>>;
}

export type Where =
	| {} // empty
	| { AND: Where[] }
	| { OR: Where[] }
	| { NOT: Where }
	| { LT: Record<string, number> }
	| { GT: Record<string, number> }
	| { EQ: Record<string, number> }
	| { IS: Record<string, string> };

export type QueryShape = {
	WHERE: Where;
	OPTIONS: {
		COLUMNS: string[];
		ORDER?: OrderSpec;
	};
	TRANSFORMATIONS?: Transformations;
};

// Allowed fields (without dataset id prefix)
export const SECTION_NUM_FIELDS = new Set(["avg", "pass", "fail", "audit", "year"]);
export const SECTION_STR_FIELDS = new Set(["dept", "id", "instructor", "title", "uuid"]);

export const ROOM_NUM_FIELDS = new Set(["lat", "lon", "seats"]);
export const ROOM_STR_FIELDS = new Set([
	"fullname",
	"shortname",
	"number",
	"name",
	"address",
	"type",
	"furniture",
	"href",
]);
