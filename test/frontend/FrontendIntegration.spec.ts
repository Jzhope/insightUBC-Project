// test/frontend/FrontendIntegration.spec.ts
import { expect } from "chai";
import request from "supertest";
import Server from "../../src/rest/Server";
import { clearDisk, getContentFromArchives } from "../TestUtil";

describe("Frontend Integration Tests", function () {
	let server: Server;
	let app: any;

	before(async function () {
		await clearDisk();
		server = new Server(4323);
		await server.start();
		app = server.getExpressApp();
	});

	after(async function () {
		if (server) {
			await server.stop();
		}
		await clearDisk();
	});

	describe("Frontend-Backend Communication", function () {
		it("frontend can list datasets (GET /datasets)", async function () {
			const response = await request(app).get("/datasets").expect(200);
			expect(response.body).to.have.property("result");
			expect(response.body.result).to.be.an("array");
		});

		it("frontend can add dataset (PUT /dataset/:id)", async function () {
			const base64 = await getContentFromArchives("valid_small.zip");

			const response = await request(app)
				.put("/dataset/frontend-sections?kind=sections")
				.set("Content-Type", "text/plain; charset=utf-8")
				.send(base64)
				.expect(200);

			expect(response.body).to.have.property("result");
			expect(response.body.result).to.include("frontend-sections");
		});

		it("frontend can query data (POST /query)", async function () {
			const base64 = await getContentFromArchives("valid_small.zip");

			await request(app)
				.put("/dataset/sections?kind=sections")
				.set("Content-Type", "text/plain; charset=utf-8")
				.send(base64)
				.expect(200);

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

		it("frontend can remove dataset (DELETE /dataset/:id)", async function () {
			const base64 = await getContentFromArchives("valid_small.zip");

			await request(app)
				.put("/dataset/frontend-remove?kind=sections")
				.set("Content-Type", "text/plain; charset=utf-8")
				.send(base64)
				.expect(200);

			const response = await request(app).delete("/dataset/frontend-remove").expect(200);

			expect(response.body).to.have.property("result", "frontend-remove");
		});

		it("CORS is enabled for frontend requests", async function () {
			const response = await request(app).get("/datasets").expect(200);
			expect(response.headers).to.have.property("access-control-allow-origin");
		});
	});
});
