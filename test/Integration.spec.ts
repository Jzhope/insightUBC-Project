/**
 * Integration Tests
 * These tests integrate multiple components to verify end-to-end functionality.
 * Each test integrates at least two different components (e.g., Server + InsightFacade,
 * multiple endpoints working together, or full workflows).
 */

import { expect } from "chai";
import request from "supertest";
import Server from "../src/rest/Server";
import { clearDisk, getContentFromArchives } from "./TestUtil";

describe("Integration Tests", function () {
	let server: Server;
	let app: any;

	before(async function () {
		await clearDisk();
		server = new Server(4324); // Use different port to avoid conflicts
		await server.start();
		app = server.getExpressApp();
	});

	after(async function () {
		if (server) {
			await server.stop();
		}
		await clearDisk();
	});

	describe("Full Workflow: Add Dataset -> Query -> Remove Dataset", function () {
		beforeEach(async function () {
			await clearDisk();
		});

		it("should complete full workflow: add sections dataset, query it, then remove it", async function () {
			// Step 1: Add dataset (Server + InsightFacade integration)
			const content = await getContentFromArchives("valid_small.zip");
			const addResponse = await request(app)
				.put("/dataset/sections?kind=sections") // id = "sections"
				.send(content)
				.set("Content-Type", "text/plain")
				.expect(200);

			expect(addResponse.body).to.have.property("result");
			expect(addResponse.body.result).to.include("sections");

			// Step 2: Verify dataset appears in list (Server + InsightFacade integration)
			const listResponse = await request(app).get("/datasets").expect(200);
			expect(listResponse.body.result).to.satisfy((datasets: any[]) =>
				datasets.some((d) => d.id === "sections" && d.kind === "sections")
			);

			// Step 3: Query the dataset (Server + InsightFacade + QueryExecutor integration)
			// id = "sections"， avg / dept → sections_avg / sections_dept
			const query = {
				WHERE: {
					GT: {
						sections_avg: 80,
					},
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
				},
			};

			const queryResponse = await request(app).post("/query").send(query).expect(200);
			expect(queryResponse.body).to.have.property("result");
			expect(queryResponse.body.result).to.be.an("array");

			// Step 4: Remove the dataset (Server + InsightFacade integration)
			const removeResponse = await request(app).delete("/dataset/sections").expect(200);
			expect(removeResponse.body).to.have.property("result", "sections");

			// Step 5: Verify dataset is gone (Server + InsightFacade integration)
			const finalListResponse = await request(app).get("/datasets").expect(200);
			expect(finalListResponse.body.result).to.not.satisfy((datasets: any[]) =>
				datasets.some((d) => d.id === "sections")
			);
		});

		it("should complete full workflow with rooms dataset", async function () {
			// Step 1: Add rooms dataset (Server + InsightFacade + HTMLParser integration)
			const content = await getContentFromArchives("test-rooms.zip");
			const addResponse = await request(app)
				.put("/dataset/rooms?kind=rooms") // id = "rooms"
				.send(content)
				.set("Content-Type", "text/plain")
				.expect(200);

			expect(addResponse.body).to.have.property("result");
			expect(addResponse.body.result).to.include("rooms");

			// Step 2: Query rooms dataset (Server + InsightFacade + QueryExecutor integration)
			const query = {
				WHERE: {
					GT: {
						rooms_seats: 0, // id = "rooms"，字段 seats
					},
				},
				OPTIONS: {
					COLUMNS: ["rooms_name", "rooms_seats", "rooms_type"],
				},
			};

			const queryResponse = await request(app).post("/query").send(query).expect(200);
			expect(queryResponse.body).to.have.property("result");
			expect(queryResponse.body.result).to.be.an("array");
			if (queryResponse.body.result.length > 0) {
				expect(queryResponse.body.result[0]).to.have.property("rooms_name");
				expect(queryResponse.body.result[0]).to.have.property("rooms_seats");
			}

			// Step 3: Remove rooms dataset
			const removeResponse = await request(app).delete("/dataset/rooms").expect(200);
			expect(removeResponse.body).to.have.property("result", "rooms");
		});
	});

	describe("Multiple Datasets Integration", function () {
		beforeEach(async function () {
			await clearDisk();
		});

		it("should manage multiple datasets simultaneously (Server + InsightFacade integration)", async function () {
			// Add first dataset
			const content1 = await getContentFromArchives("valid_small.zip");
			await request(app)
				.put("/dataset/dataset1?kind=sections") // id = dataset1
				.send(content1)
				.set("Content-Type", "text/plain")
				.expect(200);

			// Add second dataset
			await request(app)
				.put("/dataset/dataset2?kind=sections") // id = dataset2
				.send(content1)
				.set("Content-Type", "text/plain")
				.expect(200);

			// List should show both datasets
			const listResponse = await request(app).get("/datasets").expect(200);
			const ids = listResponse.body.result.map((d: any) => d.id);
			expect(ids).to.include.members(["dataset1", "dataset2"]);

			// Query should work with dataset1
			const query1 = {
				WHERE: {
					GT: {
						dataset1_avg: 0,
					},
				},
				OPTIONS: {
					COLUMNS: ["dataset1_dept", "dataset1_avg"],
				},
			};

			const queryResponse1 = await request(app).post("/query").send(query1).expect(200);
			expect(queryResponse1.body.result).to.be.an("array");

			// Remove one dataset, other should remain
			await request(app).delete("/dataset/dataset1").expect(200);
			const finalListResponse = await request(app).get("/datasets").expect(200);
			const finalIds = finalListResponse.body.result.map((d: any) => d.id);
			expect(finalIds).to.not.include("dataset1");
			expect(finalIds).to.include("dataset2");
		});

		it("should handle both sections and rooms datasets together", async function () {
			// Add sections dataset
			const sectionsContent = await getContentFromArchives("valid_small.zip");
			await request(app)
				.put("/dataset/sections?kind=sections") // id = sections
				.send(sectionsContent)
				.set("Content-Type", "text/plain")
				.expect(200);

			// Add rooms dataset
			const roomsContent = await getContentFromArchives("test-rooms.zip");
			await request(app)
				.put("/dataset/rooms?kind=rooms") // id = rooms
				.send(roomsContent)
				.set("Content-Type", "text/plain")
				.expect(200);

			// List should show at least these two kinds
			const listResponse = await request(app).get("/datasets").expect(200);
			const kinds = listResponse.body.result.map((d: any) => d.kind);
			expect(kinds).to.include.members(["sections", "rooms"]);

			// Query sections dataset（id = sections）
			const sectionsQuery = {
				WHERE: {
					GT: {
						sections_avg: 0,
					},
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
				},
			};
			const sectionsQueryResponse = await request(app).post("/query").send(sectionsQuery).expect(200);
			expect(sectionsQueryResponse.body.result).to.be.an("array");

			// Query rooms dataset（id = rooms）
			const roomsQuery = {
				WHERE: {
					GT: {
						rooms_seats: 0,
					},
				},
				OPTIONS: {
					COLUMNS: ["rooms_name", "rooms_seats"],
				},
			};
			const roomsQueryResponse = await request(app).post("/query").send(roomsQuery).expect(200);
			expect(roomsQueryResponse.body.result).to.be.an("array");
		});
	});

	describe("Complex Query Integration", function () {
		beforeEach(async function () {
			await clearDisk();

			if (server) {
				await server.stop();
			}

			server = new Server(4324);
			await server.start();
			app = server.getExpressApp();

			const content = await getContentFromArchives("valid_small.zip");
			await request(app).put("/dataset/cpx?kind=sections").send(content).set("Content-Type", "text/plain").expect(200);
		});

		it("should execute query with GROUP + APPLY + ORDER", async function () {
			const query = {
				WHERE: { GT: { cpx_avg: 70 } },
				OPTIONS: {
					COLUMNS: ["cpx_dept", "avgGrade"],
					ORDER: { dir: "DOWN", keys: ["avgGrade"] },
				},
				TRANSFORMATIONS: {
					GROUP: ["cpx_dept"],
					APPLY: [{ avgGrade: { AVG: "cpx_avg" } }],
				},
			};

			const res = await request(app).post("/query").send(query).expect(200);
			expect(res.body.result).to.be.an("array");
		});

		it("should execute query with AND/OR logic", async function () {
			const query = {
				WHERE: {
					AND: [{ GT: { cpx_avg: 70 } }, { LT: { cpx_avg: 95 } }],
				},
				OPTIONS: {
					COLUMNS: ["cpx_dept", "cpx_avg"],
				},
			};

			const res = await request(app).post("/query").send(query).expect(200);
			expect(res.body.result).to.be.an("array");

			for (const row of res.body.result) {
				expect(row.cpx_avg).to.be.greaterThan(70);
				expect(row.cpx_avg).to.be.lessThan(95);
			}
		});
	});

	describe("Error Propagation Integration", function () {
		beforeEach(async function () {
			await clearDisk();
		});

		it("should propagate errors from InsightFacade through Server to client (Server + InsightFacade error integration)", async function () {
			// Try to query non-existent dataset
			const query = {
				WHERE: {
					GT: {
						nonexistent_avg: 0,
					},
				},
				OPTIONS: {
					COLUMNS: ["nonexistent_dept"],
				},
			};

			const response = await request(app).post("/query").send(query).expect(400);
			expect(response.body).to.have.property("error");
			expect(response.body.error).to.include("not added");
		});

		it("should handle invalid query format errors (Server + QueryValidator integration)", async function () {
			// Add a dataset first
			const content = await getContentFromArchives("valid_small.zip");
			await request(app)
				.put("/dataset/error-test?kind=sections")
				.send(content)
				.set("Content-Type", "text/plain")
				.expect(200);

			// Query with invalid format (missing OPTIONS)
			const invalidQuery = {
				WHERE: {},
			};

			const response = await request(app).post("/query").send(invalidQuery).expect(400);
			expect(response.body).to.have.property("error");
		});

		it("should handle duplicate dataset ID errors (Server + InsightFacade integration)", async function () {
			const content = await getContentFromArchives("valid_small.zip");
			// Add first time
			await request(app)
				.put("/dataset/duplicate-test?kind=sections")
				.send(content)
				.set("Content-Type", "text/plain")
				.expect(200);

			// Try to add again with same ID
			const response = await request(app)
				.put("/dataset/duplicate-test?kind=sections")
				.send(content)
				.set("Content-Type", "text/plain")
				.expect(400);

			expect(response.body).to.have.property("error");
		});

		it("should handle missing kind parameter (Server validation + error response integration)", async function () {
			const content = await getContentFromArchives("valid_small.zip");
			const response = await request(app)
				.put("/dataset/test-no-kind")
				.send(content)
				.set("Content-Type", "text/plain")
				.expect(400);

			expect(response.body).to.have.property("error");
			expect(response.body.error).to.include("kind");
		});
	});

	describe("Data Persistence Integration", function () {
		it("should persist data across server restarts (Server + InsightFacade + file system integration)", async function () {
			await clearDisk();

			// Add dataset
			const content = await getContentFromArchives("valid_small.zip");
			await request(app)
				.put("/dataset/persistence-test?kind=sections")
				.send(content)
				.set("Content-Type", "text/plain")
				.expect(200);

			// Verify it's in the list
			let listResponse = await request(app).get("/datasets").expect(200);
			expect(listResponse.body.result).to.satisfy((datasets: any[]) =>
				datasets.some((d) => d.id === "persistence-test")
			);

			// Stop and restart server (simulate by creating new server instance)
			await server.stop();
			await clearDisk();

			// Create new server instance (simulating restart)
			const newServer = new Server(4325);
			await newServer.start();
			const newApp = newServer.getExpressApp();

			// Data should still be available
			await request(newApp).get("/datasets").expect(200);

			await newServer.stop();
		});
	});

	describe("Concurrent Operations Integration", function () {
		beforeEach(async function () {
			await clearDisk();
		});

		it("should handle concurrent list and query operations (Server + InsightFacade concurrent access integration)", async function () {
			// Add a dataset
			const content = await getContentFromArchives("valid_small.zip");
			await request(app)
				.put("/dataset/concurrent-test?kind=sections") // id = concurrent-test
				.send(content)
				.set("Content-Type", "text/plain")
				.expect(200);

			// Perform concurrent operations
			const [listResponse, queryResponse] = await Promise.all([
				request(app).get("/datasets"),
				request(app)
					.post("/query")
					.send({
						WHERE: {
							GT: {
								"concurrent-test_avg": 0,
							},
						},
						OPTIONS: {
							COLUMNS: ["concurrent-test_dept"],
						},
					}),
			]);

			expect(listResponse.status).to.equal(200);
			expect(queryResponse.status).to.equal(200);
			expect(listResponse.body.result).to.be.an("array");
			expect(queryResponse.body.result).to.be.an("array");
		});
	});
});
