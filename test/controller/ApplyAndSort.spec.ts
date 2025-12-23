import { expect } from "chai";
import { applyTransformations, sortResults } from "../../src/controller/ApplyAndSort";

describe("ApplyAndSort", function () {
	describe("applyTransformations", function () {
		it("should return rows unchanged when transformations is null", function () {
			const rows = [{ id: 1, value: 10 }];
			const result = applyTransformations(rows, null as any);
			expect(result).to.deep.equal(rows);
		});

		it("should return rows unchanged when GROUP is not an array", function () {
			const rows = [{ id: 1, value: 10 }];
			const result = applyTransformations(rows, { GROUP: null } as any);
			expect(result).to.deep.equal(rows);
		});

		it("should group rows by GROUP keys", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 95 },
				{ sections_dept: "math", sections_avg: 85 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [],
			};
			const result = applyTransformations(rows, transformations);
			expect(result).to.have.length(2);
			expect(result.map((r) => r.sections_dept)).to.have.members(["cpsc", "math"]);
		});

		it("should apply MAX aggregation", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 95 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ maxAvg: { MAX: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("maxAvg", 95);
		});

		it("should apply MAX aggregation with equal values", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 90 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ maxAvg: { MAX: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("maxAvg", 90);
		});

		it("should apply MAX aggregation with negative values", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: -10 },
				{ sections_dept: "cpsc", sections_avg: -5 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ maxAvg: { MAX: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("maxAvg", -5);
		});

		it("should apply MIN aggregation", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 95 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ minAvg: { MIN: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("minAvg", 90);
		});

		it("should apply MIN aggregation with equal values", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 90 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ minAvg: { MIN: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("minAvg", 90);
		});

		it("should apply MIN aggregation with negative values", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: -10 },
				{ sections_dept: "cpsc", sections_avg: -5 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ minAvg: { MIN: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("minAvg", -10);
		});

		it("should apply SUM aggregation", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 95 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ sumAvg: { SUM: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("sumAvg", 185);
		});

		it("should apply AVG aggregation", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 95 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ avgAvg: { AVG: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("avgAvg", 92.5);
		});

		it("should apply COUNT aggregation", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 95 },
				{ sections_dept: "cpsc", sections_avg: 90 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ countAvg: { COUNT: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("countAvg", 2); // 90 and 95 are distinct
		});

		it("should handle multiple APPLY rules", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90, sections_pass: 100 },
				{ sections_dept: "cpsc", sections_avg: 95, sections_pass: 120 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ maxAvg: { MAX: "sections_avg" } }, { sumPass: { SUM: "sections_pass" } }],
			} as any;
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("maxAvg", 95);
			expect(result[0]).to.have.property("sumPass", 220);
		});

		it("should throw error when MAX requires numeric field but gets non-numeric", function () {
			const rows = [{ sections_dept: "cpsc", sections_avg: "not-a-number" }];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ maxAvg: { MAX: "sections_avg" } }],
			};
			expect(() => applyTransformations(rows, transformations)).to.throw("MAX requires numeric field");
		});

		it("should throw error when MIN requires numeric field but gets non-numeric", function () {
			const rows = [{ sections_dept: "cpsc", sections_avg: "not-a-number" }];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ minAvg: { MIN: "sections_avg" } }],
			};
			expect(() => applyTransformations(rows, transformations)).to.throw("MIN requires numeric field");
		});

		it("should throw error when SUM requires numeric field but gets non-numeric", function () {
			const rows = [{ sections_dept: "cpsc", sections_avg: "not-a-number" }];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ sumAvg: { SUM: "sections_avg" } }],
			};
			expect(() => applyTransformations(rows, transformations)).to.throw("SUM requires numeric field");
		});

		it("should throw error when AVG requires numeric field but gets non-numeric", function () {
			const rows = [{ sections_dept: "cpsc", sections_avg: "not-a-number" }];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ avgAvg: { AVG: "sections_avg" } }],
			};
			expect(() => applyTransformations(rows, transformations)).to.throw("AVG requires numeric field");
		});

		it("should throw error when APPLY rule has multiple keys", function () {
			const rows = [{ sections_dept: "cpsc", sections_avg: 90 }];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ key1: { MAX: "sections_avg" }, key2: { MIN: "sections_avg" } }],
			};
			expect(() => applyTransformations(rows, transformations)).to.throw(
				"Invalid APPLY rule: exactly one applyKey required"
			);
		});

		it("should throw error when APPLY rule has no operator", function () {
			const rows = [{ sections_dept: "cpsc", sections_avg: 90 }];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ maxAvg: {} }],
			};
			expect(() => applyTransformations(rows, transformations)).to.throw(
				"Invalid APPLY rule: missing operator or field"
			);
		});

		it("should throw error when APPLY rule has invalid token", function () {
			const rows = [{ sections_dept: "cpsc", sections_avg: 90 }];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ maxAvg: { INVALID: "sections_avg" } }],
			} as any;
			expect(() => applyTransformations(rows, transformations)).to.throw("Invalid APPLY token");
		});

		it("should throw error when apply key contains underscore", function () {
			const rows = [{ sections_dept: "cpsc", sections_avg: 90 }];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ max_avg: { MAX: "sections_avg" } }],
			};
			expect(() => applyTransformations(rows, transformations)).to.throw("must not contain underscore");
		});

		it("should handle MAX with empty rows", function () {
			const rows: any[] = [];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ maxAvg: { MAX: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result).to.have.length(0);
		});

		it("should handle MIN with empty rows", function () {
			const rows: any[] = [];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ minAvg: { MIN: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result).to.have.length(0);
		});

		it("should handle COUNT with different value types", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: "90" },
				{ sections_dept: "cpsc", sections_avg: null },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ countAvg: { COUNT: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("countAvg", 3); // All are distinct
		});

		it("should handle APPLY with undefined field", function () {
			const rows = [{ sections_dept: "cpsc", sections_avg: 90 }];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ maxAvg: { MAX: undefined } }],
			};
			expect(() => applyTransformations(rows, transformations)).to.throw(
				"Invalid APPLY rule: missing operator or field"
			);
		});

		it("should handle groupBy with multiple rows in same group", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 95 },
				{ sections_dept: "cpsc", sections_avg: 100 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ maxAvg: { MAX: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result).to.have.length(1);
			expect(result[0]).to.have.property("maxAvg", 100);
		});

		it("should handle MAX with single row", function () {
			const rows = [{ sections_dept: "cpsc", sections_avg: 90 }];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ maxAvg: { MAX: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("maxAvg", 90);
		});

		it("should handle MIN with single row", function () {
			const rows = [{ sections_dept: "cpsc", sections_avg: 90 }];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ minAvg: { MIN: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("minAvg", 90);
		});

		it("should handle SUM with single row", function () {
			const rows = [{ sections_dept: "cpsc", sections_avg: 90.5 }];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ sumAvg: { SUM: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("sumAvg", 90.5);
		});

		it("should handle AVG with single row", function () {
			const rows = [{ sections_dept: "cpsc", sections_avg: 90 }];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ avgAvg: { AVG: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("avgAvg", 90);
		});

		it("should handle AVG with decimal precision", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90.333 },
				{ sections_dept: "cpsc", sections_avg: 95.666 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ avgAvg: { AVG: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("avgAvg", 93);
		});

		it("should handle SUM with decimal precision", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90.333 },
				{ sections_dept: "cpsc", sections_avg: 95.666 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ sumAvg: { SUM: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("sumAvg", 186);
		});

		it("should handle COUNT with null values", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: null },
				{ sections_dept: "cpsc", sections_avg: null },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ countAvg: { COUNT: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("countAvg", 2); // 90 and null are distinct
		});

		it("should handle COUNT with boolean values", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: true },
				{ sections_dept: "cpsc", sections_avg: false },
				{ sections_dept: "cpsc", sections_avg: true },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: [{ countAvg: { COUNT: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result[0]).to.have.property("countAvg", 2); // true and false are distinct
		});

		it("should handle multiple groups with APPLY", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_id: "101", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_id: "101", sections_avg: 95 },
				{ sections_dept: "math", sections_id: "101", sections_avg: 85 },
			];
			const transformations = {
				GROUP: ["sections_dept", "sections_id"],
				APPLY: [{ maxAvg: { MAX: "sections_avg" } }],
			};
			const result = applyTransformations(rows, transformations);
			expect(result).to.have.length(2);
			expect(result.find((r) => r.sections_dept === "cpsc")).to.have.property("maxAvg", 95);
			expect(result.find((r) => r.sections_dept === "math")).to.have.property("maxAvg", 85);
		});

		it("should handle APPLY when APPLY is undefined", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "math", sections_avg: 85 },
			];
			const transformations = {
				GROUP: ["sections_dept"],
				APPLY: undefined,
			};
			const result = applyTransformations(rows, transformations as any);
			expect(result).to.have.length(2);
		});
	});

	describe("sortResults", function () {
		it("should return rows unchanged when order is undefined", function () {
			const rows = [{ id: 1 }, { id: 2 }];
			const result = sortResults(rows, undefined);
			expect(result).to.deep.equal(rows);
		});

		it("should sort by string key ascending", function () {
			const rows = [
				{ sections_dept: "math", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 95 },
			];
			const result = sortResults(rows, "sections_dept");
			expect(result[0].sections_dept).to.equal("cpsc");
			expect(result[1].sections_dept).to.equal("math");
		});

		it("should sort by string key descending", function () {
			const rows = [
				{ sections_dept: "math", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 95 },
			];
			const result = sortResults(rows, { dir: "DOWN", keys: ["sections_dept"] });
			expect(result[0].sections_dept).to.equal("math");
			expect(result[1].sections_dept).to.equal("cpsc");
		});

		it("should sort by numeric key ascending", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 95 },
				{ sections_dept: "math", sections_avg: 90 },
			];
			const result = sortResults(rows, "sections_avg");
			expect(result[0].sections_avg).to.equal(90);
			expect(result[1].sections_avg).to.equal(95);
		});

		it("should sort by numeric key descending", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 95 },
				{ sections_dept: "math", sections_avg: 90 },
			];
			const result = sortResults(rows, { dir: "DOWN", keys: ["sections_avg"] });
			expect(result[0].sections_avg).to.equal(95);
			expect(result[1].sections_avg).to.equal(90);
		});

		it("should sort by multiple keys", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 95 },
				{ sections_dept: "math", sections_avg: 90 },
			];
			const result = sortResults(rows, { dir: "UP", keys: ["sections_dept", "sections_avg"] });
			expect(result[0].sections_dept).to.equal("cpsc");
			expect(result[0].sections_avg).to.equal(90);
			expect(result[1].sections_dept).to.equal("cpsc");
			expect(result[1].sections_avg).to.equal(95);
			expect(result[2].sections_dept).to.equal("math");
		});

		it("should return rows unchanged when order is not a string and keys is not an array", function () {
			const rows = [{ id: 1 }, { id: 2 }];
			const result = sortResults(rows, { dir: "UP", keys: null } as any);
			expect(result).to.deep.equal(rows);
		});

		it("should return rows unchanged when order keys array is empty", function () {
			const rows = [{ id: 1 }, { id: 2 }];
			const result = sortResults(rows, { dir: "UP", keys: [] });
			expect(result).to.deep.equal(rows);
		});

		it("should handle equal values", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "math", sections_avg: 90 },
			];
			const result = sortResults(rows, "sections_avg");
			expect(result).to.have.length(2);
		});

		it("should return rows unchanged when order is an object but keys is not an array", function () {
			const rows = [{ id: 1 }, { id: 2 }];
			const result = sortResults(rows, { dir: "UP", keys: "not-an-array" } as any);
			expect(result).to.deep.equal(rows);
		});

		it("should return rows unchanged when order is falsy", function () {
			const rows = [{ id: 1 }, { id: 2 }];
			const result = sortResults(rows, null as any);
			expect(result).to.deep.equal(rows);
		});

		it("should sort by multiple keys with ties", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90, sections_id: "101" },
				{ sections_dept: "cpsc", sections_avg: 90, sections_id: "102" },
				{ sections_dept: "math", sections_avg: 85, sections_id: "101" },
			];
			const result = sortResults(rows, { dir: "UP", keys: ["sections_dept", "sections_avg", "sections_id"] });
			expect(result[0].sections_id).to.equal("101");
			expect(result[1].sections_id).to.equal("102");
			expect(result[2].sections_dept).to.equal("math");
		});

		it("should sort descending by multiple keys", function () {
			const rows = [
				{ sections_dept: "cpsc", sections_avg: 90 },
				{ sections_dept: "cpsc", sections_avg: 95 },
				{ sections_dept: "math", sections_avg: 90 },
			];
			const result = sortResults(rows, { dir: "DOWN", keys: ["sections_dept", "sections_avg"] });
			expect(result[0].sections_dept).to.equal("math");
			expect(result[1].sections_dept).to.equal("cpsc");
			expect(result[1].sections_avg).to.equal(95);
			expect(result[2].sections_avg).to.equal(90);
		});

		it("should handle sorting with missing keys in rows", function () {
			const rows = [{ sections_dept: "cpsc", sections_avg: 90 }, { sections_dept: "math" }];
			const result = sortResults(rows, "sections_avg");
			expect(result).to.have.length(2);
		});
	});
});
