import { expect } from "chai";
import InsightFacade from "../../src/controller/InsightFacade";
import { InsightDatasetKind } from "../../src/controller/IInsightFacade";
import * as fs from "fs-extra";

describe("Basic Rooms Tests", function () {
	let facade: InsightFacade;
	let rooms: string;

	before(async function () {
		try {
			rooms = await fs.readFile("test/resources/archives/test-rooms.zip", "base64");
		} catch (_e) {
			throw new Error("No rooms dataset found");
		}
	});

	beforeEach(function () {
		facade = new InsightFacade();
	});

	afterEach(async function () {
		try {
			await fs.remove("./data");
		} catch (_e) {
			// Ignore errors
		}
	});

	it("Should add a valid rooms dataset", async function () {
		const result = await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
		expect(result).to.include("rooms");
		expect(result).to.have.length(1);
	});

	it("Should list the added rooms dataset", async function () {
		await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
		const datasets = await facade.listDatasets();
		expect(datasets).to.have.length(1);
		expect(datasets[0].id).to.equal("rooms");
		expect(datasets[0].kind).to.equal(InsightDatasetKind.Rooms);
		expect(datasets[0].numRows).to.be.greaterThan(0);
	});

	it("Should perform a simple query on rooms", async function () {
		await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
		const query = {
			WHERE: {},
			OPTIONS: {
				COLUMNS: ["rooms_name", "rooms_seats"],
			},
		};
		const result = await facade.performQuery(query);
		expect(result).to.be.an("array");
		expect(result.length).to.be.greaterThan(0);
		expect(result[0]).to.have.property("rooms_name");
		expect(result[0]).to.have.property("rooms_seats");
	});
});
