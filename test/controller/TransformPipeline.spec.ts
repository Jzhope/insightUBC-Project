import { expect } from "chai";
import { runTransformAndSort } from "../../src/controller/TransformPipeline";

describe("TransformPipeline", function () {
	describe("runTransformAndSort", function () {
		const sampleRows = [
			{ sections_dept: "cpsc", sections_avg: 90 },
			{ sections_dept: "math", sections_avg: 85 },
		];

		it("should throw error when OPTIONS is missing", function () {
			const query = {
				WHERE: {},
			} as any;
			expect(() => runTransformAndSort(sampleRows, query)).to.throw("OPTIONS.COLUMNS is required and must be an array");
		});

		it("should throw error when OPTIONS.COLUMNS is not an array", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: "invalid" as any,
				},
			};
			expect(() => runTransformAndSort(sampleRows, query)).to.throw("OPTIONS.COLUMNS is required and must be an array");
		});

		it("should apply transformations when TRANSFORMATIONS is provided", function () {
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
			const result = runTransformAndSort(sampleRows, query);
			expect(result).to.be.an("array");
			expect(result.length).to.be.greaterThan(0);
		});

		it("should skip transformations when TRANSFORMATIONS.GROUP is not an array", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
				},
				TRANSFORMATIONS: {
					GROUP: null,
					APPLY: [],
				} as any,
			};
			const result = runTransformAndSort(sampleRows, query);
			expect(result).to.have.length(2);
		});

		it("should return empty array when COLUMNS is empty", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: [],
				},
			};
			const result = runTransformAndSort(sampleRows, query);
			expect(result).to.deep.equal([]);
		});

		it("should project columns correctly", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept"],
				},
			};
			const result = runTransformAndSort(sampleRows, query);
			expect(result).to.have.length(2);
			expect(result[0]).to.have.property("sections_dept");
			expect(result[0]).to.not.have.property("sections_avg");
		});

		it("should sort results when ORDER is provided", function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
					ORDER: "sections_avg",
				},
			};
			const result = runTransformAndSort(sampleRows, query);
			expect(result[0].sections_avg).to.equal(85);
			expect(result[1].sections_avg).to.equal(90);
		});

		it("should limit results to MAX_RESULTS", function () {
			const manyRows = Array.from({ length: 6000 }, (_, i) => ({
				sections_dept: "cpsc",
				sections_avg: i,
			}));
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
				},
			};
			const result = runTransformAndSort(manyRows, query);
			expect(result).to.have.length(5000);
		});
	});
});
