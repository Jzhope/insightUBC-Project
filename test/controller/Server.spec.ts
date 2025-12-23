// test/controller/Server.spec.ts
import { expect } from "chai";
import request from "supertest";
import Server from "../../src/rest/Server";
import { clearDisk, getContentFromArchives } from "../TestUtil";

describe("Server Integration Tests", function () {
	let server: Server;
	let app: any;

	before(async function () {
		await clearDisk();
		server = new Server(4322);
		await server.start();
		app = server.getExpressApp();
	});

	after(async function () {
		if (server) {
			await server.stop();
		}
		await clearDisk();
	});

	describe("GET /datasets", function () {
		it("returns empty list when no datasets exist", async function () {
			const response = await request(app).get("/datasets").expect(200);
			expect(response.body).to.have.property("result");
			expect(response.body.result).to.be.an("array").that.has.length(0);
		});

		it("returns list of datasets after adding one", async function () {
			const base64 = await getContentFromArchives("valid_small.zip");

			await request(app)
				.put("/dataset/test-sections?kind=sections")
				.set("Content-Type", "text/plain")
				.send(base64)
				.expect(200);

			const response = await request(app).get("/datasets").expect(200);
			expect(response.body).to.have.property("result");
			expect(response.body.result).to.be.an("array");
			const ds = response.body.result.find((d: any) => d.id === "test-sections");
			expect(ds).to.exist;
			expect(ds.kind).to.equal("sections");
			expect(ds.numRows).to.be.a("number").greaterThan(0);
		});
	});

	describe("PUT /dataset/:id", function () {
		it("adds a valid sections dataset", async function () {
			const base64 = await getContentFromArchives("valid_small.zip");

			const response = await request(app)
				.put("/dataset/ubc-sections?kind=sections")
				.set("Content-Type", "text/plain")
				.send(base64)
				.expect(200);

			expect(response.body).to.have.property("result");
			expect(response.body.result).to.include("ubc-sections");
		});

		it("rejects invalid kind parameter", async function () {
			const base64 = await getContentFromArchives("valid_small.zip");

			const response = await request(app)
				.put("/dataset/bad-kind?kind=invalid")
				.set("Content-Type", "text/plain")
				.send(base64)
				.expect(400);

			expect(response.body).to.have.property("error");
		});

		it("rejects missing kind parameter", async function () {
			const base64 = await getContentFromArchives("valid_small.zip");

			const response = await request(app)
				.put("/dataset/missing-kind")
				.set("Content-Type", "text/plain")
				.send(base64)
				.expect(400);

			expect(response.body).to.have.property("error");
		});

		it("rejects duplicate dataset ID", async function () {
			const base64 = await getContentFromArchives("valid_small.zip");

			await request(app)
				.put("/dataset/dup-id?kind=sections")
				.set("Content-Type", "text/plain")
				.send(base64)
				.expect(200);

			const response = await request(app)
				.put("/dataset/dup-id?kind=sections")
				.set("Content-Type", "text/plain")
				.send(base64)
				.expect(400);

			expect(response.body).to.have.property("error");
		});

		it("should reject dataset ID with underscore", async function () {
			const content = await getContentFromArchives("valid_small.zip");
			const response = await request(app)
				.put("/dataset/ubc_data?kind=sections")
				.send(content)
				.set("Content-Type", "text/plain")
				.expect(400);

			expect(response.body).to.have.property("error");
		});
	});

	describe("DELETE /dataset/:id", function () {
		it("removes an existing dataset", async function () {
			const base64 = await getContentFromArchives("valid_small.zip");

			await request(app)
				.put("/dataset/to-remove?kind=sections")
				.set("Content-Type", "text/plain")
				.send(base64)
				.expect(200);

			const response = await request(app).delete("/dataset/to-remove").expect(200);

			expect(response.body).to.have.property("result", "to-remove");

			const listResponse = await request(app).get("/datasets").expect(200);

			expect(listResponse.body.result.some((d: any) => d.id === "to-remove")).to.be.false;
		});

		it("returns 404 for non-existent dataset", async function () {
			const response = await request(app).delete("/dataset/not-here").expect(404);

			expect(response.body).to.have.property("error");
		});

		it("should reject invalid dataset ID", async function () {
			const response = await request(app).delete("/dataset/ubc_data").expect(400);
			expect(response.body).to.have.property("error");
		});
	});

	describe("POST /query", function () {
		before(async function () {
			const base64 = await getContentFromArchives("valid_small.zip");
			await request(app)
				.put("/dataset/sections?kind=sections")
				.set("Content-Type", "text/plain")
				.send(base64)
				.expect(200);
		});

		it("executes a simple query", async function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
				},
			};

			const response = await request(app).post("/query").send(query).expect(200);

			expect(response.body).to.have.property("result");
			expect(response.body.result).to.be.an("array");
		});
	});

	describe("GET /", function () {
		it("returns API server message", async function () {
			const response = await request(app).get("/").expect(200);
			expect(response.body).to.have.property("message");
			expect(response.body.message).to.include("InsightUBC");
		});
	});
});
