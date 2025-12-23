import { parse } from "parse5";
import { Room } from "../model/Room";

/**
 * Type definitions for parse5 nodes
 */
interface Parse5Node {
	nodeName: string;
	tagName?: string;
	attrs?: Array<{ name: string; value: string }>;
	childNodes?: Parse5Node[];
	value?: string;
}

/**
 * Building information extracted from index.htm
 */
export interface BuildingInfo {
	fullname: string;
	shortname: string;
	address: string;
	href: string;
	lat?: number;
	lon?: number;
}

/**
 * Column mapping for table parsing
 */
interface ColumnMapping {
	[key: string]: number;
}

/**
 * Finds all nodes with a specific tag name in the DOM tree
 */
function findNodesByTagName(node: Parse5Node, tagName: string): Parse5Node[] {
	const results: Parse5Node[] = [];
	if (node.nodeName === tagName) {
		results.push(node);
	}
	if (node.childNodes) {
		for (const child of node.childNodes) {
			results.push(...findNodesByTagName(child, tagName));
		}
	}
	return results;
}

/**
 * Gets the text content of a node
 */
function getTextContent(node: Parse5Node): string {
	if (node.nodeName === "#text") {
		return node.value?.trim() || "";
	}
	if (!node.childNodes) {
		return "";
	}
	return node.childNodes
		.map((child) => getTextContent(child))
		.filter((text) => text.length > 0)
		.join(" ")
		.trim();
}

/**
 * Gets an attribute value from a node
 */
function getAttribute(node: Parse5Node, attrName: string): string | undefined {
	if (!node.attrs) {
		return undefined;
	}
	const attr = node.attrs.find((a: { name: string; value: string }) => a.name === attrName);
	return attr?.value;
}

/**
 * Checks if a row is a header row (contains th elements)
 */
function isHeaderRow(row: Parse5Node): boolean {
	const headerCells = findNodesByTagName(row, "th");
	return headerCells.length > 0;
}

/**
 * Finds first link href in a row's cells
 */
function findHrefInCells(cells: Parse5Node[]): string | undefined {
	for (const cell of cells) {
		const link = findNodesByTagName(cell, "a")[0];
		if (link) {
			const href = getAttribute(link, "href");
			if (href) {
				return href;
			}
		}
	}
	return undefined;
}

/**
 * Checks if table has expected building columns
 */
function hasBuildingColumns(headerTexts: string[]): boolean {
	const hasCode = headerTexts.some((h) => h.includes("code") || h.includes("short"));
	const hasAddress = headerTexts.some((h) => h.includes("address"));
	const hasName = headerTexts.some((h) => h.includes("name"));
	return hasCode && hasAddress && hasName;
}

/**
 * Checks if table has expected room columns
 */
function hasRoomColumns(headerTexts: string[]): boolean {
	const hasRoomNumber = headerTexts.some((h) => h.includes("number") || h.includes("room"));
	const hasCapacity = headerTexts.some((h) => h.includes("capacity") || h.includes("seats"));
	const hasType = headerTexts.some((h) => h.includes("type"));
	const hasFurniture = headerTexts.some((h) => h.includes("furniture"));
	return hasRoomNumber && hasCapacity && hasType && hasFurniture;
}

/**
 * Finds a table that contains building data based on header content
 */
function findBuildingTable(document: Parse5Node): Parse5Node | null {
	const tables = findNodesByTagName(document, "table");

	for (const table of tables) {
		const rows = findNodesByTagName(table, "tr");
		if (rows.length === 0) {
			continue;
		}

		const headerRow = rows.find((row) => isHeaderRow(row));
		if (!headerRow) {
			continue;
		}

		const headers = findNodesByTagName(headerRow, "th");
		const headerTexts = headers.map((h) => getTextContent(h).toLowerCase());

		if (hasBuildingColumns(headerTexts)) {
			return table;
		}
	}

	return null;
}

/**
 * Finds a table that contains room data based on header content
 */
function findRoomTable(document: Parse5Node): Parse5Node | null {
	const tables = findNodesByTagName(document, "table");

	for (const table of tables) {
		const rows = findNodesByTagName(table, "tr");
		if (rows.length === 0) {
			continue;
		}

		const headerRow = rows.find((row) => isHeaderRow(row));
		if (!headerRow) {
			continue;
		}

		const headers = findNodesByTagName(headerRow, "th");
		const headerTexts = headers.map((h) => getTextContent(h).toLowerCase());

		if (hasRoomColumns(headerTexts)) {
			return table;
		}
	}

	return null;
}

/**
 * Maps building column names to indices
 */
function mapBuildingColumns(headerTexts: string[]): ColumnMapping {
	const codeIdx = headerTexts.findIndex((h) => h.includes("code") || h.includes("short"));
	const nameIdx = headerTexts.findIndex(
		(h) =>
			(h.includes("building") && h.includes("name")) ||
			(h.includes("name") && !h.includes("short") && !h.includes("code"))
	);
	const addressIdx = headerTexts.findIndex((h) => h.includes("address"));

	return { code: codeIdx, name: nameIdx, address: addressIdx };
}

/**
 * Maps room column names to indices
 */
function mapRoomColumns(headerTexts: string[]): ColumnMapping {
	const numberIdx = headerTexts.findIndex((h) => h.includes("number") || (h.includes("room") && !h.includes("type")));
	const capacityIdx = headerTexts.findIndex((h) => h.includes("capacity") || h.includes("seats"));
	const typeIdx = headerTexts.findIndex((h) => h.includes("type") && !h.includes("furniture"));
	const furnitureIdx = headerTexts.findIndex((h) => h.includes("furniture"));

	return { number: numberIdx, capacity: capacityIdx, type: typeIdx, furniture: furnitureIdx };
}

/**
 * Extracts a single building from a table row
 */
function extractBuildingFromRow(row: Parse5Node, colMap: ColumnMapping): BuildingInfo | null {
	const cells = findNodesByTagName(row, "td");
	const maxIdx = Math.max(colMap.code, colMap.name, colMap.address);

	if (cells.length <= maxIdx) {
		return null;
	}

	const href = findHrefInCells(cells);
	if (!href) {
		return null;
	}

	const shortname = getTextContent(cells[colMap.code]);
	const fullname = getTextContent(cells[colMap.name]);
	const address = getTextContent(cells[colMap.address]);

	if (fullname && shortname && address) {
		return { fullname, shortname, address, href };
	}

	return null;
}

/**
 * Extracts a single room from a table row
 */
function extractRoomFromRow(row: Parse5Node, colMap: ColumnMapping, building: BuildingInfo): Room | null {
	const cells = findNodesByTagName(row, "td");
	const maxIdx = Math.max(colMap.number, colMap.capacity, colMap.type, colMap.furniture);

	if (cells.length <= maxIdx) {
		return null;
	}

	const href = findHrefInCells(cells);
	if (!href) {
		return null;
	}

	const number = getTextContent(cells[colMap.number]);
	const name = `${building.shortname}_${number}`;
	const seatsText = getTextContent(cells[colMap.capacity]);
	const type = getTextContent(cells[colMap.type]);
	const furniture = getTextContent(cells[colMap.furniture]);

	const seats = parseInt(seatsText, 10);
	if (!isNaN(seats) && number && type && furniture) {
		return {
			rooms_fullname: building.fullname,
			rooms_shortname: building.shortname,
			rooms_address: building.address,
			rooms_lat: building.lat ?? 0,
			rooms_lon: building.lon ?? 0,
			rooms_number: number,
			rooms_name: name,
			rooms_seats: seats,
			rooms_type: type,
			rooms_furniture: furniture,
			rooms_href: href,
		};
	}

	return null;
}

/**
 * Extracts building information from index.htm
 */
export function parseIndexHtml(htmlContent: string): BuildingInfo[] {
	const document = parse(htmlContent) as Parse5Node;
	const table = findBuildingTable(document);
	if (!table) {
		return [];
	}

	const rows = findNodesByTagName(table, "tr");
	const headerRow = rows.find((row) => isHeaderRow(row));
	if (!headerRow) {
		return [];
	}

	const headers = findNodesByTagName(headerRow, "th");
	const headerTexts = headers.map((h) => getTextContent(h).toLowerCase());
	const colMap = mapBuildingColumns(headerTexts);

	if (colMap.code === -1 || colMap.name === -1 || colMap.address === -1) {
		return [];
	}

	const buildings: BuildingInfo[] = [];
	for (const row of rows) {
		if (isHeaderRow(row)) {
			continue;
		}
		const building = extractBuildingFromRow(row, colMap);
		if (building) {
			buildings.push(building);
		}
	}

	return buildings;
}

/**
 * Extracts room information from a building HTML file
 */
export function parseBuildingHtml(htmlContent: string, buildingInfo: BuildingInfo): Room[] {
	const document = parse(htmlContent) as Parse5Node;
	const table = findRoomTable(document);
	if (!table) {
		return [];
	}

	const rows = findNodesByTagName(table, "tr");
	const headerRow = rows.find((row) => isHeaderRow(row));
	if (!headerRow) {
		return [];
	}

	const headers = findNodesByTagName(headerRow, "th");
	const headerTexts = headers.map((h) => getTextContent(h).toLowerCase());
	const colMap = mapRoomColumns(headerTexts);

	if (colMap.number === -1 || colMap.capacity === -1 || colMap.type === -1 || colMap.furniture === -1) {
		return [];
	}

	const rooms: Room[] = [];
	for (const row of rows) {
		if (isHeaderRow(row)) {
			continue;
		}
		const room = extractRoomFromRow(row, colMap, buildingInfo);
		if (room) {
			rooms.push(room);
		}
	}

	return rooms;
}
