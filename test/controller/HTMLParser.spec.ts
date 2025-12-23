import { expect } from "chai";
import { parseIndexHtml, parseBuildingHtml, BuildingInfo } from "../../src/controller/HTMLParser";

describe("HTMLParser", function () {
	describe("parseIndexHtml", function () {
		it("should return empty array when no table found", function () {
			const html = "<html><body><p>No table here</p></body></html>";
			const result = parseIndexHtml(html);
			expect(result).to.deep.equal([]);
		});

		it("should return empty array when table has no header row", function () {
			const html = `
				<html>
					<body>
						<table>
							<tr><td>Data</td></tr>
						</table>
					</body>
				</html>
			`;
			const result = parseIndexHtml(html);
			expect(result).to.deep.equal([]);
		});

		it("should return empty array when required columns are missing", function () {
			const html = `
				<html>
					<body>
						<table>
							<tr>
								<th>Code</th>
								<th>Name</th>
							</tr>
							<tr>
								<td>CODE</td>
								<td>Name</td>
							</tr>
						</table>
					</body>
				</html>
			`;
			const result = parseIndexHtml(html);
			expect(result).to.deep.equal([]);
		});

		it("should return empty array when building row has no href", function () {
			const html = `
				<html>
					<body>
						<table>
							<tr>
								<th>Code</th>
								<th>Building Name</th>
								<th>Address</th>
							</tr>
							<tr>
								<td>CODE</td>
								<td>Building Name</td>
								<td>Address</td>
							</tr>
						</table>
					</body>
				</html>
			`;
			const result = parseIndexHtml(html);
			expect(result).to.deep.equal([]);
		});

		it("should return empty array when building row has insufficient cells", function () {
			const html = `
				<html>
					<body>
						<table>
							<tr>
								<th>Code</th>
								<th>Building Name</th>
								<th>Address</th>
							</tr>
							<tr>
								<td>CODE</td>
							</tr>
						</table>
					</body>
				</html>
			`;
			const result = parseIndexHtml(html);
			expect(result).to.deep.equal([]);
		});

		it("should return empty array when building row is missing required fields", function () {
			const html = `
				<html>
					<body>
						<table>
							<tr>
								<th>Code</th>
								<th>Building Name</th>
								<th>Address</th>
							</tr>
							<tr>
								<td><a href="building.htm">CODE</a></td>
								<td></td>
								<td>Address</td>
							</tr>
						</table>
					</body>
				</html>
			`;
			const result = parseIndexHtml(html);
			expect(result).to.deep.equal([]);
		});

		it("should parse valid building table", function () {
			const html = `
				<html>
					<body>
						<table>
							<tr>
								<th>Code</th>
								<th>Building Name</th>
								<th>Address</th>
							</tr>
							<tr>
								<td><a href="building.htm">CODE</a></td>
								<td>Building Name</td>
								<td>123 Main St</td>
							</tr>
						</table>
					</body>
				</html>
			`;
			const result = parseIndexHtml(html);
			expect(result).to.have.length(1);
			expect(result[0]).to.have.property("shortname", "CODE");
			expect(result[0]).to.have.property("fullname", "Building Name");
			expect(result[0]).to.have.property("address", "123 Main St");
			expect(result[0]).to.have.property("href", "building.htm");
		});
	});

	describe("parseBuildingHtml", function () {
		const buildingInfo: BuildingInfo = {
			fullname: "Test Building",
			shortname: "TEST",
			address: "123 Main St",
			href: "test.htm",
		};

		it("should return empty array when no table found", function () {
			const html = "<html><body><p>No table here</p></body></html>";
			const result = parseBuildingHtml(html, buildingInfo);
			expect(result).to.deep.equal([]);
		});

		it("should return empty array when table has no header row", function () {
			const html = `
				<html>
					<body>
						<table>
							<tr><td>Data</td></tr>
						</table>
					</body>
				</html>
			`;
			const result = parseBuildingHtml(html, buildingInfo);
			expect(result).to.deep.equal([]);
		});

		it("should return empty array when required columns are missing", function () {
			const html = `
				<html>
					<body>
						<table>
							<tr>
								<th>Number</th>
								<th>Capacity</th>
							</tr>
							<tr>
								<td>101</td>
								<td>50</td>
							</tr>
						</table>
					</body>
				</html>
			`;
			const result = parseBuildingHtml(html, buildingInfo);
			expect(result).to.deep.equal([]);
		});

		it("should return empty array when room row has no href", function () {
			const html = `
				<html>
					<body>
						<table>
							<tr>
								<th>Number</th>
								<th>Capacity</th>
								<th>Type</th>
								<th>Furniture</th>
							</tr>
							<tr>
								<td>101</td>
								<td>50</td>
								<td>Classroom</td>
								<td>Fixed</td>
							</tr>
						</table>
					</body>
				</html>
			`;
			const result = parseBuildingHtml(html, buildingInfo);
			expect(result).to.deep.equal([]);
		});

		it("should return empty array when room row has insufficient cells", function () {
			const html = `
				<html>
					<body>
						<table>
							<tr>
								<th>Number</th>
								<th>Capacity</th>
								<th>Type</th>
								<th>Furniture</th>
							</tr>
							<tr>
								<td>101</td>
							</tr>
						</table>
					</body>
				</html>
			`;
			const result = parseBuildingHtml(html, buildingInfo);
			expect(result).to.deep.equal([]);
		});

		it("should return empty array when room row is missing required fields", function () {
			const html = `
				<html>
					<body>
						<table>
							<tr>
								<th>Number</th>
								<th>Capacity</th>
								<th>Type</th>
								<th>Furniture</th>
							</tr>
							<tr>
								<td><a href="room.htm">101</a></td>
								<td>not-a-number</td>
								<td>Classroom</td>
								<td>Fixed</td>
							</tr>
						</table>
					</body>
				</html>
			`;
			const result = parseBuildingHtml(html, buildingInfo);
			expect(result).to.deep.equal([]);
		});

		it("should parse valid room table", function () {
			const html = `
				<html>
					<body>
						<table>
							<tr>
								<th>Number</th>
								<th>Capacity</th>
								<th>Type</th>
								<th>Furniture</th>
							</tr>
							<tr>
								<td><a href="room.htm">101</a></td>
								<td>50</td>
								<td>Classroom</td>
								<td>Fixed</td>
							</tr>
						</table>
					</body>
				</html>
			`;
			const result = parseBuildingHtml(html, buildingInfo);
			expect(result).to.have.length(1);
			expect(result[0]).to.have.property("rooms_number", "101");
			expect(result[0]).to.have.property("rooms_seats", 50);
			expect(result[0]).to.have.property("rooms_type", "Classroom");
			expect(result[0]).to.have.property("rooms_furniture", "Fixed");
			expect(result[0]).to.have.property("rooms_name", "TEST_101");
		});
	});
});
