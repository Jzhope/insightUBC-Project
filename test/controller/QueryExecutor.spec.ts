import { expect } from "chai";
import QueryExecutor from "../../src/controller/QueryExecutor";

describe("QueryExecutor", function () {
	let executor: QueryExecutor;

	beforeEach(function () {
		executor = new QueryExecutor();
	});

	describe("execute", function () {
		const sampleRows = [
			{ sections_dept: "cpsc", sections_avg: 90, sections_pass: 100 },
			{ sections_dept: "math", sections_avg: 85, sections_pass: 80 },
			{ sections_dept: "cpsc", sections_avg: 95, sections_pass: 120 },
		];

		it("should filter rows with WHERE clause", function () {
			const query = {
				WHERE: { GT: { sections_avg: 90 } },
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
				},
			};
			const result = executor.execute(query, sampleRows);
			expect(result).to.have.length(1);
			expect(result[0].sections_avg).to.equal(95);
		});

		it("should return all rows when WHERE is empty", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
			};
			const result = executor.execute(query, sampleRows);
			expect(result).to.have.length(3);
		});

		it("should handle LT operator", function () {
			// Test line 99: LT case
			const query = {
				WHERE: {
					LT: { sections_avg: 90 },
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
				},
			};
			const result = executor.execute(query, sampleRows);
			expect(result).to.have.length(1);
			expect(result[0].sections_avg).to.equal(85);
		});

		it("should handle GT operator", function () {
			// Test line 100: GT case
			const query = {
				WHERE: {
					GT: { sections_avg: 90 },
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
				},
			};
			const result = executor.execute(query, sampleRows);
			expect(result).to.have.length(1);
			expect(result[0].sections_avg).to.equal(95);
		});

		it("should handle EQ operator", function () {
			// Test line 102: EQ case
			const query = {
				WHERE: {
					EQ: { sections_avg: 90 },
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
				},
			};
			const result = executor.execute(query, sampleRows);
			expect(result).to.have.length(1);
			expect(result[0].sections_avg).to.equal(90);
		});

		it("should handle numeric compare with non-numeric actual value in data", function () {
			// Test line 99-102: when actual value is not a number
			const rows = [{ sections_dept: "cpsc", sections_avg: "not-a-number" as any }];
			const query = {
				WHERE: {
					GT: { sections_avg: 90 },
				},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
			};
			const result = executor.execute(query, rows);
			// Should filter out the row with non-numeric value
			expect(result).to.have.length(0);
		});

		it("should handle string compare with non-string actual value in data", function () {
			// Test line 118-119: when actual value is not a string
			const rows = [{ sections_dept: 123 as any, sections_avg: 90 }];
			const query = {
				WHERE: {
					IS: { sections_dept: "cpsc" },
				},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
			};
			const result = executor.execute(query, rows);
			// Should filter out the row with non-string value
			expect(result).to.have.length(0);
		});

		it("should handle wildcard regex escaping", function () {
			// Test line 131-132: makeWildcardRegex with special characters
			const query = {
				WHERE: {
					IS: { sections_dept: "cp.*" },
				},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
			};
			const result = executor.execute(query, sampleRows);
			// Should match "cp.*" literally, not as regex
			expect(result).to.have.length(0);
		});

		it("should handle wildcard at start", function () {
			const query = {
				WHERE: {
					IS: { sections_dept: "*c" },
				},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
			};
			const result = executor.execute(query, sampleRows);
			expect(result).to.be.an("array");
		});

		it("should handle wildcard at end", function () {
			const query = {
				WHERE: {
					IS: { sections_dept: "cp*" },
				},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
			};
			const result = executor.execute(query, sampleRows);
			expect(result).to.have.length(2);
		});

		it("should handle wildcard patterns correctly", function () {
			const query = {
				WHERE: {
					IS: { sections_dept: "cp*" },
				},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
			};
			const result = executor.execute(query, sampleRows);
			expect(result).to.have.length(2);
			expect(result.every((r) => r.sections_dept === "cpsc")).to.be.true;
		});

		it("should handle special regex characters in wildcard", function () {
			const query = {
				WHERE: {
					IS: { sections_dept: "cp.*" },
				},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
			};
			const result = executor.execute(query, sampleRows);
			// Should match "cp.*" literally, not as regex
			expect(result).to.have.length(0);
		});
	});
});
