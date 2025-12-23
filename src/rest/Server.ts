import express, { Express, Request, Response } from "express";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import { InsightDatasetKind, InsightError, NotFoundError, ResultTooLargeError } from "../controller/IInsightFacade";

export default class Server {
	private express: Express;
	private facade: InsightFacade;
	private port: number;
	private serverInstance: any;

	constructor(port: number) {
		this.port = port;
		this.express = express();
		this.facade = new InsightFacade();

		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		// Handle raw data for dataset uploads (base64 strings)
		this.express.use(express.raw({ type: ["application/*", "text/plain"], limit: "10mb" }));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());

		this.setupRoutes();
	}

	private setupRoutes(): void {
		// Health check endpoint
		this.express.get("/", (req: Request, res: Response) => {
			res.json({ message: "InsightUBC API Server" });
		});

		// List all datasets
		this.express.get("/datasets", async (req: Request, res: Response) => {
			try {
				const datasets = await this.facade.listDatasets();
				res.status(200).json({ result: datasets });
			} catch (error) {
				res.status(500).json({ error: "Failed to list datasets" });
			}
		});

		// Add a dataset
		this.express.put("/dataset/:id", async (req: Request, res: Response) => {
			try {
				const id = req.params.id;
				const kind = req.query.kind as string;

				if (!kind || (kind !== "sections" && kind !== "rooms")) {
					res.status(400).json({ error: "Invalid or missing kind parameter. Must be 'sections' or 'rooms'" });
					return;
				}

				// Content should be in the request body as base64 string
				// The raw parser may give us a Buffer, so convert it to string
				let content: string;
				if (Buffer.isBuffer(req.body)) {
					content = req.body.toString("utf8");
				} else if (typeof req.body === "string") {
					content = req.body;
				} else {
					res.status(400).json({ error: "Invalid content. Expected base64 string in request body" });
					return;
				}

				if (!content || content.trim().length === 0) {
					res.status(400).json({ error: "Invalid content. Expected base64 string in request body" });
					return;
				}

				const datasetKind = kind === "sections" ? InsightDatasetKind.Sections : InsightDatasetKind.Rooms;
				const result = await this.facade.addDataset(id, content, datasetKind);
				res.status(200).json({ result });
			} catch (error) {
				if (error instanceof InsightError) {
					res.status(400).json({ error: error.message });
				} else {
					const errorMessage = error instanceof Error ? error.message : String(error);
					console.error("Error adding dataset:", errorMessage);
					res.status(500).json({ error: `Failed to add dataset: ${errorMessage}` });
				}
			}
		});

		// Remove a dataset
		this.express.delete("/dataset/:id", async (req: Request, res: Response) => {
			try {
				const id = req.params.id;
				const result = await this.facade.removeDataset(id);
				res.status(200).json({ result });
			} catch (error) {
				if (error instanceof NotFoundError) {
					res.status(404).json({ error: error.message });
				} else if (error instanceof InsightError) {
					res.status(400).json({ error: error.message });
				} else {
					res.status(500).json({ error: "Failed to remove dataset" });
				}
			}
		});

		// Perform a query
		this.express.post("/query", async (req: Request, res: Response) => {
			try {
				const query = req.body;
				if (!query || typeof query !== "object") {
					res.status(400).json({ error: "Invalid query. Expected JSON object in request body" });
					return;
				}

				const result = await this.facade.performQuery(query);
				res.status(200).json({ result });
			} catch (error) {
				if (error instanceof ResultTooLargeError) {
					res.status(413).json({ error: error.message });
				} else if (error instanceof InsightError) {
					res.status(400).json({ error: error.message });
				} else {
					res.status(500).json({ error: "Failed to perform query" });
				}
			}
		});
	}

	public async start(): Promise<void> {
		return new Promise((resolve) => {
			this.serverInstance = this.express.listen(this.port, () => {
				console.log(`Server started on port ${this.port}`);
				resolve();
			});
		});
	}

	public async stop(): Promise<void> {
		return new Promise((resolve) => {
			if (this.serverInstance) {
				this.serverInstance.close(() => {
					resolve();
				});
			} else {
				resolve();
			}
		});
	}

	// Expose express app for testing
	public getExpressApp(): Express {
		return this.express;
	}
}
