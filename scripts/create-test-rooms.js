const JSZip = require("jszip");
const fs = require("fs");

const zip = new JSZip();

const indexHtml = `<!DOCTYPE html>
<html>
<head><title>Buildings</title></head>
<body>
<table>
<tr>
<th>Building Code</th>
<th>Building Name</th>
<th>Address</th>
</tr>
<tr>
<td><a href="./test-building.htm">TEST</a></td>
<td>Test Building</td>
<td>6245 Agronomy Road V6T 1Z4</td>
</tr>
</table>
</body>
</html>`;

const buildingHtml = `<!DOCTYPE html>
<html>
<head><title>Test Building</title></head>
<body>
<table>
<tr>
<th>Room Number</th>
<th>Capacity</th>
<th>Room Type</th>
<th>Furniture Type</th>
</tr>
<tr>
<td><a href="http://students.ubc.ca/room/TEST-100">100</a></td>
<td>50</td>
<td>Tiered Large Group</td>
<td>Classroom-Fixed Tables/Fixed Chairs</td>
</tr>
<tr>
<td><a href="http://students.ubc.ca/room/TEST-101">101</a></td>
<td>30</td>
<td>Small Group</td>
<td>Classroom-Movable Tables & Chairs</td>
</tr>
</table>
</body>
</html>`;

zip.file("index.htm", indexHtml);
zip.file("test-building.htm", buildingHtml);

zip
	.generateAsync({ type: "nodebuffer" })
	.then((content) => {
		fs.writeFileSync("test/resources/archives/test-rooms.zip", content);
		console.log("Created test-rooms.zip successfully!");
	})
	.catch((err) => {
		console.error("Error:", err);
	});
