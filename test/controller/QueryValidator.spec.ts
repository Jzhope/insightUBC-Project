import { expect } from "chai";
import QueryValidator from "../../src/controller/QueryValidator";

describe("QueryValidator", function () {
	describe("validate", function () {
		it("should throw error when TRANSFORMATIONS has invalid GROUP", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
				TRANSFORMATIONS: {
					GROUP: null,
					APPLY: [],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("TRANSFORMATIONS.GROUP must be a non-empty array");
		});

		it("should throw error when TRANSFORMATIONS has empty GROUP", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
				TRANSFORMATIONS: {
					GROUP: [],
					APPLY: [],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("TRANSFORMATIONS.GROUP must be a non-empty array");
		});

		it("should throw error when TRANSFORMATIONS has invalid APPLY", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: null,
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("TRANSFORMATIONS.APPLY must be an array");
		});

		it("should throw error when APPLY rule has multiple keys", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "maxAvg"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [
						{
							maxAvg: { MAX: "sections_avg" },
							anotherKey: { MIN: "sections_avg" },
						},
					],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("APPLY rule must define exactly one applyKey");
		});

		it("should throw error when APPLY rule has no operator object", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "maxAvg"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [
						{
							maxAvg: null,
						},
					],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("must map to an operator object");
		});

		it("should throw error when APPLY rule has multiple operators", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "maxAvg"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [
						{
							maxAvg: {
								MAX: "sections_avg",
								MIN: "sections_avg",
							},
						},
					],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("must contain exactly one operator");
		});

		it("should throw error when COLUMNS contains non-dataset key without TRANSFORMATIONS", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "invalidKey"],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("is not a dataset key");
		});

		it("should throw error when COLUMNS contains key not in GROUP or APPLY", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "invalidKey"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [{ maxAvg: { MAX: "sections_avg" } }],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("which is not a GROUP key or an APPLY key");
		});

		it("should throw error when GROUP key uses different dataset id", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
				TRANSFORMATIONS: {
					// Mix ids to force the GROUP-id check
					GROUP: ["sections_dept", "rooms_fullname"],
					APPLY: [],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("must use the same dataset id");
		});

		it("should throw error when ORDER key is not in COLUMNS", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
					ORDER: "sections_avg",
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("must also appear in OPTIONS.COLUMNS");
		});

		it("should throw error when ORDER object has invalid dir", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
					ORDER: {
						dir: "INVALID",
						keys: ["sections_dept"],
					},
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw('must be "UP" or "DOWN"');
		});

		it("should throw error when ORDER object has non-array keys", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
					ORDER: {
						dir: "UP",
						keys: "invalid" as any,
					},
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("non-empty keys array");
		});

		it("should throw error when ORDER object has empty keys array", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
					ORDER: {
						dir: "UP",
						keys: [],
					},
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("non-empty keys array");
		});

		it("should throw error when APPLY field uses different dataset id", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "maxAvg"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [{ maxAvg: { MAX: "other_avg" } }],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("APPLY field uses different dataset id");
		});

		it("should throw error when APPLY field is not a dataset key", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "maxAvg"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [{ maxAvg: { MAX: "invalidField" } }],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("must be a dataset key");
		});

		it("should throw error when MAX is used on non-numeric field", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "maxDept"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [{ maxDept: { MAX: "sections_dept" } }],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("MAX requires a numeric field");
		});

		it("should throw error when MIN is used on non-numeric field", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "minDept"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [{ minDept: { MIN: "sections_dept" } }],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("MIN requires a numeric field");
		});

		it("should throw error when SUM is used on non-numeric field", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sumDept"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [{ sumDept: { SUM: "sections_dept" } }],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("SUM requires a numeric field");
		});

		it("should throw error when AVG is used on non-numeric field", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "avgDept"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [{ avgDept: { AVG: "sections_dept" } }],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("AVG requires a numeric field");
		});

		it("should throw error when APPLY field has invalid format", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "maxAvg"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [{ maxAvg: { MAX: "invalid" } }],
				},
			};
			// Helper throws: Key "invalid" must be a dataset key
			expect(() => QueryValidator.validate(query)).to.throw("must be a dataset key");
		});

		it("should throw error when APPLY key contains underscore", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "max_avg"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [{ max_avg: { MAX: "sections_avg" } }],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("APPLY key contains underscore");
		});

		it("should throw error when duplicate APPLY key", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "maxAvg"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [{ maxAvg: { MAX: "sections_avg" } }, { maxAvg: { MIN: "sections_avg" } }],
				},
			};
			expect(() => QueryValidator.validate(query)).to.throw("Duplicate apply key");
		});

		it("should collect ids from TRANSFORMATIONS GROUP", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [],
				},
			};
			const result = QueryValidator.validate(query);
			expect(result.datasetId).to.equal("sections");
		});

		it("should collect ids from TRANSFORMATIONS APPLY", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "maxAvg"],
				},
				TRANSFORMATIONS: {
					GROUP: ["sections_dept"],
					APPLY: [{ maxAvg: { MAX: "sections_avg" } }],
				},
			};
			const result = QueryValidator.validate(query);
			expect(result.datasetId).to.equal("sections");
		});
	});
});
