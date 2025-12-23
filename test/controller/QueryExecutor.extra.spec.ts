import { expect } from "chai";
import QueryExecutor from "../../src/controller/QueryExecutor";

describe("QueryExecutor extra coverage", () => {
	it("sorts with ORDER as string and places undefined last for UP", () => {
		const rows = [{ dept: "cpsc", avg: 90 }, { dept: "math", avg: 80 }, { /* missing dept */ avg: 85 }];
		const query = {
			WHERE: {},
			OPTIONS: { COLUMNS: ["sections_dept"], ORDER: "sections_dept" },
		};
		const ex = new QueryExecutor();
		const out = ex.execute(query as any, rows as any[]);
		expect(out.map((r: any) => r.sections_dept)).to.deep.equal(["cpsc", "math", undefined]);
	});

	it("sorts with ORDER object (DOWN) across multiple keys and is stable for ties", () => {
		const rows = [
			{ dept: "cpsc", avg: 90, id: 1 },
			{ dept: "cpsc", avg: 90, id: 2 },
			{ dept: "cpsc", avg: 80, id: 3 },
			{ dept: "math", avg: 95, id: 4 },
		];
		const query = {
			WHERE: {},
			OPTIONS: {
				COLUMNS: ["sections_dept", "sections_avg", "sections_id"],
				ORDER: { dir: "DOWN", keys: ["sections_avg", "sections_dept"] },
			},
		};
		const ex = new QueryExecutor();
		const out = ex.execute(query as any, rows as any[]);
		expect(out.map((r: any) => r.sections_id)).to.deep.equal([4, 1, 2, 3]);
	});

	it("sorts with ORDER object (DOWN) placing undefined first", () => {
		const rows = [{ dept: "cpsc", avg: 90 }, { /* missing avg */ dept: "cpsc" }, { dept: "cpsc", avg: 80 }];
		const query = {
			WHERE: {},
			OPTIONS: {
				COLUMNS: ["sections_dept", "sections_avg"],
				ORDER: { dir: "DOWN", keys: ["sections_avg"] },
			},
		};
		const ex = new QueryExecutor();
		const out = ex.execute(query as any, rows as any[]);
		expect(out.map((r: any) => r.sections_avg)).to.deep.equal([undefined, 90, 80]);
	});

	it("GROUP with empty APPLY returns only group keys", () => {
		const rows = [
			{ dept: "cpsc", avg: 80 },
			{ dept: "cpsc", avg: 90 },
			{ dept: "math", avg: 70 },
		];
		const query = {
			WHERE: {},
			TRANSFORMATIONS: { GROUP: ["sections_dept"], APPLY: [] },
			OPTIONS: { COLUMNS: ["sections_dept"] },
		};
		const ex = new QueryExecutor();
		const out = ex.execute(query as any, rows as any[]);
		const depts = out.map((r: any) => r.sections_dept).sort();
		expect(depts).to.deep.equal(["cpsc", "math"]);
		out.forEach((r: any) => expect(Object.keys(r)).to.deep.equal(["sections_dept"]));
	});

	it("APPLY COUNT counts distinct by type (number vs string)", () => {
		const rows = [
			{ dept: "cpsc", id: 1 },
			{ dept: "cpsc", id: "1" },
			{ dept: "cpsc", id: 1 },
			{ dept: "cpsc", id: "2" },
		];
		const query = {
			WHERE: {},
			TRANSFORMATIONS: {
				GROUP: ["sections_dept"],
				APPLY: [{ uniq: { COUNT: "sections_id" } }],
			},
			OPTIONS: { COLUMNS: ["sections_dept", "uniq"] },
		};
		const ex = new QueryExecutor();
		const out = ex.execute(query as any, rows as any[]);
		expect(out).to.have.length(1);
		expect(out[0].uniq).to.equal(3); // 1, "1", "2"
	});

	it("APPLY SUM and AVG round to 2 decimals (HALF_UP)", () => {
		const rows = [
			{ dept: "cpsc", avg: 0.1 },
			{ dept: "cpsc", avg: 0.2 },
			{ dept: "cpsc", avg: 0.345 },
		];
		const query = {
			WHERE: {},
			TRANSFORMATIONS: {
				GROUP: ["sections_dept"],
				APPLY: [{ s: { SUM: "sections_avg" } }, { a: { AVG: "sections_avg" } }],
			},
			OPTIONS: { COLUMNS: ["sections_dept", "s", "a"] },
		};
		const ex = new QueryExecutor();
		const out = ex.execute(query as any, rows as any[]);
		expect(out).to.have.length(1);
		expect(out[0].s).to.equal(0.65); // 0.645 → 0.65
		expect(out[0].a).to.equal(0.22); // 0.215 → 0.22
	});

	it("APPLY MIN/MAX handle non-numeric input defensively", () => {
		const rows = [
			{ dept: "cpsc", name: "A" },
			{ dept: "cpsc", name: "B" },
		];
		const query = {
			WHERE: {},
			TRANSFORMATIONS: {
				GROUP: ["sections_dept"],
				APPLY: [{ mn: { MIN: "sections_name" } }, { mx: { MAX: "sections_name" } }],
			},
			OPTIONS: { COLUMNS: ["sections_dept", "mn", "mx"] },
		};
		const ex = new QueryExecutor();
		const out = ex.execute(query as any, rows as any[]);
		expect(out[0].mn).to.equal(Number.POSITIVE_INFINITY);
		expect(out[0].mx).to.equal(Number.NEGATIVE_INFINITY);
	});
});
