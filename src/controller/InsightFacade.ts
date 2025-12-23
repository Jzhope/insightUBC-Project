// src/controller/InsightFacade.ts
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import * as fsp from "fs/promises";
import * as path from "path";
import JSZip from "jszip";
import QueryValidator from "./QueryValidator";
import QueryExecutor from "./QueryExecutor";
import Section, { SectionRaw } from "../model/Section";
import { Room } from "../model/Room";
import { parseIndexHtml, parseBuildingHtml, BuildingInfo } from "./HTMLParser";
import type { Dirent } from "fs";
import http from "http";

const DATA_DIR = path.resolve("./data");
const JSON_EXTENSION_LENGTH = 5;

type PersistedDataset = { kind: InsightDatasetKind; rows: unknown[] };

export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, InsightDataset> = new Map<string, InsightDataset>();
	private initPromise: Promise<void>;

	constructor() {
		this.initPromise = this.initializeDataDirectory();
	}

	private async initializeDataDirectory(): Promise<void> {
		try {
			await fsp.mkdir(DATA_DIR, { recursive: true });
		} catch (error) {
			console.error(`Failed to create data directory: ${error}`);
		}
	}

	private async ensureInitialized(): Promise<void> {
		await this.initPromise;
	}

	private isValidId(id: string): boolean {
		return typeof id === "string" && id.trim().length > 0 && !id.includes("_");
	}

	private isValidSection(sec: unknown): sec is SectionRaw {
		if (!sec || typeof sec !== "object") return false;
		const s = sec as Record<string, unknown>;
		return (
			typeof s.Subject === "string" &&
			typeof s.Course === "string" &&
			typeof s.Avg === "number" &&
			typeof s.Professor === "string" &&
			typeof s.Title === "string" &&
			typeof s.Pass === "number" &&
			typeof s.Fail === "number" &&
			typeof s.Audit === "number" &&
			(typeof s.id === "number" || typeof s.id === "string") &&
			typeof s.Section === "string" &&
			(typeof s.Year === "number" || typeof s.Year === "string")
		);
	}

	private async unzipContent(content: string): Promise<JSZip> {
		try {
			const data = Buffer.from(content, "base64");
			return await JSZip.loadAsync(data);
		} catch {
			throw new InsightError("Failed to unzip content");
		}
	}

	private async parseSectionFile(fileName: string, zip: JSZip): Promise<Section[]> {
		const sections: Section[] = [];
		try {
			const fileData = await zip.file(fileName)?.async("string");
			if (!fileData) return sections;
			const json = JSON.parse(fileData) as Record<string, unknown>;
			if (Array.isArray((json as any).result)) {
				for (const sec of (json as any).result) {
					if (this.isValidSection(sec)) sections.push(new Section(sec));
				}
			}
		} catch {}
		return sections;
	}

	private async parseSections(zip: JSZip): Promise<Section[]> {
		const fileNames = Object.keys(zip.files).filter((f) => f.startsWith("courses/") && !zip.files[f].dir);
		const sectionArrays = await Promise.all(fileNames.map(async (f) => this.parseSectionFile(f, zip)));
		return sectionArrays.flat();
	}

	private getAlternativePath(href: string): string {
		if (href.startsWith("./")) return href.substring(2);
		if (href.startsWith("/")) return href.substring(1);
		return href;
	}

	private async geocode(address: string): Promise<{ lat: number; lon: number } | null> {
		const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team119/${encodeURIComponent(address)}`;
		return new Promise((resolve) => {
			http
				.get(url, (res) => {
					let data = "";
					res.on("data", (c) => (data += c));
					res.on("end", () => {
						try {
							const j = JSON.parse(data);
							const ok = typeof j.lat === "number" && typeof j.lon === "number";
							resolve(ok ? { lat: j.lat, lon: j.lon } : null);
						} catch {
							resolve(null);
						}
					});
				})
				.on("error", () => resolve(null));
		});
	}

	private async parseBuildingFile(building: BuildingInfo, zip: JSZip): Promise<Room[]> {
		try {
			const f = zip.file(building.href) ?? zip.file(this.getAlternativePath(building.href));
			if (f) {
				const buildingContent = await f.async("string");
				return parseBuildingHtml(buildingContent, building);
			}
		} catch {}
		return [];
	}

	private async parseRooms(zip: JSZip): Promise<Room[]> {
		const indexFile = zip.file("index.htm");
		if (!indexFile) throw new InsightError("index.htm not found in dataset");
		const indexContent = await indexFile.async("string");
		let buildings = parseIndexHtml(indexContent);
		if (buildings.length === 0) throw new InsightError("No buildings found in index.htm");

		const geoResults = await Promise.allSettled(buildings.map(async (b) => this.geocode(b.address)));
		buildings = buildings.map((b, i) => {
			const g = geoResults[i];
			if (g.status === "fulfilled" && g.value) {
				return { ...(b as any), lat: g.value.lat, lon: g.value.lon } as BuildingInfo;
			}
			return b;
		});

		const roomArrays = await Promise.all(buildings.map(async (b) => this.parseBuildingFile(b, zip)));
		return roomArrays.flat();
	}

	private async saveDataset(id: string, parsedData: Section[] | Room[], kind: InsightDatasetKind): Promise<void> {
		const filePath = path.join(DATA_DIR, `${id}.json`);
		const payload: PersistedDataset = { kind, rows: parsedData as unknown[] };
		try {
			// Ensure directory exists before writing
			await fsp.mkdir(DATA_DIR, { recursive: true });
			await fsp.writeFile(filePath, JSON.stringify(payload), "utf8");
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`Failed to write dataset to disk: ${errorMessage}`);
			throw new InsightError(`Failed to write dataset to disk: ${errorMessage}`);
		}
		this.datasets.set(id, { id, kind, numRows: parsedData.length });
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		await this.ensureInitialized();
		if (!this.isValidId(id)) throw new InsightError("Invalid dataset id");

		const filePath = path.join(DATA_DIR, `${id}.json`);
		try {
			await fsp.access(filePath);
			throw new InsightError("Dataset with this id already exists");
		} catch {}

		if (this.datasets.has(id)) throw new InsightError("Dataset with this id already exists");
		if (!content || typeof content !== "string") throw new InsightError("Invalid content");

		const zip = await this.unzipContent(content);
		let parsedData: Section[] | Room[] = [];
		if (kind === InsightDatasetKind.Sections) parsedData = await this.parseSections(zip);
		else if (kind === InsightDatasetKind.Rooms) parsedData = await this.parseRooms(zip);
		else throw new InsightError("Unsupported dataset kind");
		if (parsedData.length === 0) throw new InsightError("No valid entries found in dataset");

		await this.saveDataset(id, parsedData, kind);
		const listed = await this.listDatasets();
		return listed.map((d) => d.id);
	}

	public async removeDataset(id: string): Promise<string> {
		await this.ensureInitialized();
		if (!this.isValidId(id)) throw new InsightError("Invalid dataset id");
		const filePath = path.join(DATA_DIR, `${id}.json`);
		try {
			await fsp.unlink(filePath);
		} catch {
			throw new NotFoundError("Dataset not found");
		}
		this.datasets.delete(id);
		return id;
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		if (typeof query !== "object" || query === null) throw new InsightError("Query must be an object");

		const q = query as any;

		let validation;
		try {
			validation = QueryValidator.validate(q as any);
		} catch (e: any) {
			throw new InsightError(e?.message ?? "Invalid query");
		}

		const datasetId: string = validation.datasetId;
		const filePath = path.join(DATA_DIR, `${datasetId}.json`);
		let rows: Array<Record<string, unknown>>;

		try {
			const raw = await fsp.readFile(filePath, "utf8");
			const parsed = JSON.parse(raw) as PersistedDataset | unknown[];
			if (Array.isArray(parsed)) {
				rows = parsed as Array<Record<string, unknown>>;
			} else if (parsed && Array.isArray((parsed as PersistedDataset).rows)) {
				const p = parsed as PersistedDataset;
				rows = p.rows as Array<Record<string, unknown>>;
			} else {
				throw new Error("bad shape");
			}
		} catch {
			throw new InsightError(`Dataset ${datasetId} not added`);
		}

		const executor = new QueryExecutor();
		return executor.execute(q as any, rows);
	}

	private async parseDatasetFile(entry: Dirent): Promise<InsightDataset | null> {
		const id = entry.name.slice(0, -JSON_EXTENSION_LENGTH);
		try {
			const raw = await fsp.readFile(path.join(DATA_DIR, entry.name), "utf8");
			const parsed: unknown = JSON.parse(raw);

			if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
				const p = parsed as PersistedDataset;
				if ((p.kind === "sections" || p.kind === "rooms") && Array.isArray(p.rows)) {
					return { id, kind: p.kind, numRows: p.rows.length };
				}
			}

			if (Array.isArray(parsed)) {
				const arr = parsed as Array<Record<string, unknown>>;
				let kind: InsightDatasetKind = InsightDatasetKind.Sections;
				if (arr.length > 0 && arr[0] && typeof arr[0] === "object") {
					const keys = Object.keys(arr[0]);
					if (keys.some((k) => k.startsWith("rooms_"))) kind = InsightDatasetKind.Rooms;
				}
				return { id, kind, numRows: arr.length };
			}
		} catch {}
		return null;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		await this.ensureInitialized();
		let diskDatasets: InsightDataset[] = [];
		try {
			const entries = await fsp.readdir(DATA_DIR, { withFileTypes: true });
			const jsonFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".json"));
			const results = await Promise.all(jsonFiles.map(async (e) => this.parseDatasetFile(e)));
			diskDatasets = results.filter((d): d is InsightDataset => d !== null);
		} catch {}

		const memory = Array.from(this.datasets.values());
		const byId = new Map<string, InsightDataset>();
		for (const d of [...diskDatasets, ...memory]) byId.set(d.id, d);
		return Array.from(byId.values());
	}

	private async loadDatasetFromDisk(datasetId: string): Promise<Section[]> {
		const filePath = path.join(DATA_DIR, `${datasetId}.json`);
		try {
			const fileContent = await fsp.readFile(filePath, "utf-8");
			const parsed = JSON.parse(fileContent) as PersistedDataset | unknown[];
			const rawData: unknown[] = Array.isArray(parsed) ? parsed : (parsed as PersistedDataset).rows;
			const sections: Section[] = [];
			for (const rawSection of rawData) {
				if (this.isValidSection(rawSection)) {
					sections.push(new Section(rawSection));
				}
			}
			return sections;
		} catch (error) {
			throw new Error(`Failed to load dataset from disk: ${String(error)}`);
		}
	}
}
