import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightResult,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let emptyCourses: string;
	let noSections: string;
	let invalidJson: string;
	let missingCourses: string;
	let validSmall: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		emptyCourses = await getContentFromArchives("empty_courses_folder.zip");
		noSections = await getContentFromArchives("course_with_no_section.zip");
		invalidJson = await getContentFromArchives("invalid_json.zip");
		missingCourses = await getContentFromArchives("missing_courses_folder.zip");
		validSmall = await getContentFromArchives("valid_small.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should reject with an empty dataset id", async function () {
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject dataset id with only whitespace", async function () {
			try {
				await facade.addDataset("   ", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject dataset id containing underscore", async function () {
			try {
				await facade.addDataset("ubc_sections", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when adding a dataset with duplicate id", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			try {
				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should successfully add a valid dataset", async function () {
			const result = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			expect(result).to.have.members(["ubc"]);
		});

		it("should successfully add two different datasets and list both", async function () {
			const result1 = await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			expect(result1).to.include("sections");

			const result2 = await facade.addDataset("small", validSmall, InsightDatasetKind.Sections);
			expect(result2).to.have.members(["sections", "small"]);
		});

		it("should successfully add dataset id containing spaces inside", async function () {
			const result = await facade.addDataset("ubc data", sections, InsightDatasetKind.Sections);
			expect(result).to.have.members(["ubc data"]);
		});

		it("should list dataset after adding", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			const datasets = await facade.listDatasets();
			expect(datasets).to.deep.include({
				id: "ubc",
				kind: InsightDatasetKind.Sections,
				numRows: datasets[0].numRows,
			});
		});

		it("should reject dataset with invalid content string", async function () {
			try {
				await facade.addDataset("invalid", "not-a-zip", InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject dataset if kind is not supported", async function () {
			try {
				await facade.addDataset("ubc", sections, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should allow re-adding a dataset after it has been removed", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			await facade.removeDataset("ubc");
			const result = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			expect(result).to.have.members(["ubc"]);
		});

		it("should reject dataset with empty courses folder", async function () {
			try {
				await facade.addDataset("empty", emptyCourses, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject dataset with course file but no sections", async function () {
			try {
				await facade.addDataset("nosections", noSections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject dataset with invalid JSON", async function () {
			try {
				await facade.addDataset("invalidjson", invalidJson, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject dataset with missing courses folder", async function () {
			try {
				await facade.addDataset("missing", missingCourses, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should successfully add a minimal valid dataset", async function () {
			const result = await facade.addDataset("small", validSmall, InsightDatasetKind.Sections);
			expect(result).to.include("small");

			const datasets = await facade.listDatasets();
			expect(datasets).to.deep.include({
				id: "small",
				kind: InsightDatasetKind.Sections,
				numRows: 1,
			});
		});
	});

	describe("RemoveDataset", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should reject when removing dataset that does not exist", async function () {
			try {
				await facade.removeDataset("nosuchid");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should successfully remove a dataset that does exist", async function () {
			await facade.addDataset("weirdID", sections, InsightDatasetKind.Sections);
			let datasets = await facade.listDatasets();
			expect(datasets.map((d: InsightDataset) => d.id)).to.include("weirdID");
			const removedId = await facade.removeDataset("weirdID");
			expect(removedId).to.equal("weirdID");
			datasets = await facade.listDatasets();
			expect(datasets.map((d: InsightDataset) => d.id)).to.not.include("weirdID");
		});

		it("should reject when removing dataset with empty id", async function () {
			try {
				await facade.removeDataset("");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when removing dataset with only whitespace", async function () {
			try {
				await facade.removeDataset("   ");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when removing dataset with underscore in id", async function () {
			try {
				await facade.removeDataset("ubc_sections");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when removing a dataset that does not exist", async function () {
			try {
				await facade.removeDataset("nosuchid");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});
	});

	describe("ListDatasets", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should return empty array when no datasets have been added", async function () {
			const datasets = await facade.listDatasets();
			expect(datasets).to.deep.equal([]);
		});

		it("should list a dataset after it has been added", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			const datasets = await facade.listDatasets();

			expect(datasets).to.deep.include({
				id: "ubc",
				kind: InsightDatasetKind.Sections,
				numRows: datasets[0].numRows,
			});
		});

		it("should list multiple datasets if more than one is added", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			await facade.addDataset("math", sections, InsightDatasetKind.Sections);

			const datasets = await facade.listDatasets();
			const ids = datasets.map((d: InsightDataset) => d.id);

			expect(ids).to.have.members(["ubc", "math"]);
		});

		it("should not include removed datasets", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			await facade.removeDataset("ubc");

			const datasets = await facade.listDatasets();
			expect(datasets).to.not.deep.include({ id: "ubc", kind: InsightDatasetKind.Sections });
		});
	});

	describe("PerformQuery", function () {
		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[] = [];
			try {
				result = await facade.performQuery(input);
			} catch (err) {
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				if (expected === "InsightError") {
					expect(err).to.be.instanceOf(InsightError);
				} else if (expected === "ResultTooLargeError") {
					expect(err).to.be.instanceOf(ResultTooLargeError);
				} else {
					expect.fail(`Unexpected error type: ${err}`);
				}
				return;
			}
			if (errorExpected) {
				expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
			}
			expect(result).to.deep.equal(expected);
			return;
		}

		before(async function () {
			facade = new InsightFacade();

			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		it("should reject if query is not an object", async function () {
			try {
				await facade.performQuery("not-an-object" as unknown);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[invalid/invalid.json] Query missing WHERE", checkQuery);
		it("[valid/andOr.json] AND / OR logic check", checkQuery);
		it("[invalid/tooLarge.json] Query returns too many results", checkQuery);
		it("[valid/wildcardStart.json] Dept starts with C", checkQuery);
		it("[valid/wildcardContains.json] Dept contains ps", checkQuery);
		it("[invalid/wildcardMiddle.json] Invalid wildcard in middle", checkQuery);
		it("[invalid/multipleDatasets.json] Query with multiple dataset references", checkQuery);
		it("[invalid/notAdded.json] Query references dataset not added", checkQuery);
		it("[invalid/missingColumns.json] Query missing COLUMNS in OPTIONS", checkQuery);
		it("[invalid/emptyColumns.json] Query with empty COLUMNS array", checkQuery);
		it("[valid/andLogic.json] AND should require both conditions", checkQuery);
		it("[valid/orLogic.json] OR should accept either condition", checkQuery);
		it("[valid/numericEq.json] EQ should match exact number", checkQuery);
		it("[valid/numericBoundaries.json] GT and LT boundary checks", checkQuery);
		it("[valid/notAndLogic.json] NOT with AND logic", checkQuery);
		it("[valid/notLogic.json] Simple NOT logic", checkQuery);
		it("[valid/numericEqFloat.json] EQ should match floating point values", checkQuery);
		it("[invalid/invalidColumns.json] Query with invalid COLUMNS reference", checkQuery);
		it("[invalid/missingOptions.json] Query missing OPTIONS entirely", checkQuery);
		it("[invalid/orderNotInColumns.json] ORDER must reference a key in COLUMNS", checkQuery);
		it("[valid/notSimple.json] NOT should negate LT correctly", checkQuery);

		// The following tests are generated by Claude

		describe("Additional Coverage Tests", function () {
			beforeEach(async function () {
				await clearDisk();
				facade = new InsightFacade();
			});

			// QueryValidator edge cases - covering lines 32, 58, 71, 79, 121-140, 174
			it("should reject query with empty WHERE object", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject query with invalid WHERE type", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: "invalid",
						OPTIONS: {
							COLUMNS: ["sections_dept"],
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject WHERE with multiple keys", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {
							GT: { sections_avg: 95 },
							LT: { sections_avg: 100 },
						},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject AND with non-array value", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {
							AND: { GT: { sections_avg: 95 } },
						},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject AND with empty array", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {
							AND: [],
						},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject OR with non-array value", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {
							OR: "invalid",
						},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject GT with non-numeric value", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {
							GT: { sections_avg: "not-a-number" },
						},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject GT with string field", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {
							GT: { sections_dept: 95 },
						},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject IS with non-string value", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {
							IS: { sections_dept: 123 },
						},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject IS with numeric field", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {
							IS: { sections_avg: "95" },
						},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject ORDER with key not in COLUMNS", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
							ORDER: "sections_avg",
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject ORDER object with invalid dir", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
							ORDER: {
								dir: "INVALID",
								keys: ["sections_dept"],
							},
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject ORDER object with non-array keys", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
							ORDER: {
								dir: "UP",
								keys: "invalid",
							},
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject ORDER object with empty keys array", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
							ORDER: {
								dir: "UP",
								keys: [],
							},
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject ORDER with non-string keys in array", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
							ORDER: {
								dir: "UP",
								keys: [123],
							},
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject query with no dataset match", async function () {
				try {
					await facade.performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["sections_dept", "other_avg"],
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject query with multiple different datasets", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				try {
					await facade.performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["sections_dept", "other_avg"],
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should handle performQuery when dataset file is missing from disk", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				// Manually delete the file to simulate corruption
				const fs = await import("fs/promises");
				const path = await import("path");
				try {
					await fs.unlink(path.join("./data", "sections.json"));
				} catch {
					// File might not exist, that's ok
				}
				try {
					await facade.performQuery({
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["sections_dept"],
						},
					});
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should handle nested AND/OR correctly", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				const result = await facade.performQuery({
					WHERE: {
						AND: [
							{
								OR: [{ GT: { sections_avg: 95 } }, { LT: { sections_avg: 85 } }],
							},
							{ IS: { sections_dept: "c*" } },
						],
					},
					OPTIONS: {
						COLUMNS: ["sections_dept", "sections_avg"],
					},
				});
				expect(result).to.be.an("array");
			});

			it("should handle complex NOT logic", async function () {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				const result = await facade.performQuery({
					WHERE: {
						NOT: {
							AND: [{ GT: { sections_avg: 95 } }, { IS: { sections_dept: "cpsc" } }],
						},
					},
					OPTIONS: {
						COLUMNS: ["sections_dept"],
					},
				});
				expect(result).to.be.an("array");
			});
		});

		describe("InsightFacade Edge Cases", function () {
			beforeEach(async function () {
				await clearDisk();
				facade = new InsightFacade();
			});

			it("should reject addDataset with null content", async function () {
				try {
					await facade.addDataset("test", null as any, InsightDatasetKind.Sections);
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should reject addDataset with non-string content", async function () {
				try {
					await facade.addDataset("test", 123 as any, InsightDatasetKind.Sections);
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});

			it("should handle rooms dataset with missing index.htm", async function () {
				// Create a zip without index.htm
				const JSZip = (await import("jszip")).default;
				const zip = new JSZip();
				zip.file("somefile.txt", "content");
				const zipContent = await zip.generateAsync({ type: "base64" });

				try {
					await facade.addDataset("rooms", zipContent, InsightDatasetKind.Rooms);
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
					expect((err as Error).message).to.include("index.htm not found");
				}
			});

			it("should handle rooms dataset with empty buildings list", async function () {
				// Create a zip with index.htm but no buildings
				const JSZip = (await import("jszip")).default;
				const zip = new JSZip();
				const indexHtml = `
					<html>
						<body>
							<table>
								<tr>
									<th>Code</th>
									<th>Building Name</th>
									<th>Address</th>
								</tr>
							</table>
						</body>
					</html>
				`;
				zip.file("index.htm", indexHtml);
				const zipContent = await zip.generateAsync({ type: "base64" });

				try {
					await facade.addDataset("rooms", zipContent, InsightDatasetKind.Rooms);
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
					expect((err as Error).message).to.include("No buildings found");
				}
			});

			it("should handle removeDataset when file deletion fails", async function () {
				await facade.addDataset("test", sections, InsightDatasetKind.Sections);
				// Manually delete the file to simulate the scenario
				const fs = await import("fs/promises");
				const path = await import("path");
				await fs.unlink(path.join("./data", "test.json"));

				// Try to remove again - should fail
				try {
					await facade.removeDataset("test");
					expect.fail("Should have thrown!");
				} catch (err) {
					expect(err).to.be.instanceOf(NotFoundError);
				}
			});

			it("should test ResultTooLargeError constructor", function () {
				const error = new ResultTooLargeError("Test message");
				expect(error).to.be.instanceOf(ResultTooLargeError);
				expect(error.message).to.equal("Test message");
			});
		});
	});
});
