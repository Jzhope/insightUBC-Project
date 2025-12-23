const API_BASE_URL = "http://localhost:4321";
let currentDatasets = [];
let gradeChart = null;
let avgByDeptChart = null;
let avgByYearChart = null;
let customChart = null;

// Tab switching functionality
document.querySelectorAll(".tab-button").forEach((button) => {
	button.addEventListener("click", () => {
		const tabName = button.getAttribute("data-tab");

		// Update active button
		document.querySelectorAll(".tab-button").forEach((btn) => btn.classList.remove("active"));
		button.classList.add("active");

		// Update active tab content
		document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));
		document.getElementById(`${tabName}-tab`).classList.add("active");
	});
});

// Helper function to show messages
function showMessage(elementId, message, isError = false) {
	const element = document.getElementById(elementId);
	element.textContent = message;
	element.className = `message ${isError ? "error" : "success"}`;
	setTimeout(() => {
		element.className = "message";
		element.textContent = "";
	}, 5000);
}

// Helper function to convert file to base64
function fileToBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			// Remove data URL prefix (data:application/zip;base64,)
			const base64 = reader.result.split(",")[1];
			resolve(base64);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

// Add dataset
document.getElementById("add-dataset-btn").addEventListener("click", async () => {
	const id = document.getElementById("dataset-id").value.trim();
	const kind = document.getElementById("dataset-kind").value;
	const fileInput = document.getElementById("dataset-file");

	if (!id) {
		showMessage("add-dataset-message", "Please enter a dataset ID", true);
		return;
	}

	if (!fileInput.files || fileInput.files.length === 0) {
		showMessage("add-dataset-message", "Please select a ZIP file", true);
		return;
	}

	try {
		const file = fileInput.files[0];
		const base64Content = await fileToBase64(file);

		const response = await fetch(`${API_BASE_URL}/dataset/${encodeURIComponent(id)}?kind=${kind}`, {
			method: "PUT",
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
			},
			body: base64Content,
		});

		const data = await response.json();

		if (response.ok) {
			showMessage("add-dataset-message", `Dataset added successfully! Total datasets: ${data.result.length}`);
			document.getElementById("dataset-id").value = "";
			document.getElementById("dataset-file").value = "";
			// Refresh dataset list
			listDatasets();
		} else {
			showMessage("add-dataset-message", `Error: ${data.error}`, true);
		}
	} catch (error) {
		showMessage("add-dataset-message", `Error: ${error.message}`, true);
	}
});

// Remove dataset
document.getElementById("remove-dataset-btn").addEventListener("click", async () => {
	const id = document.getElementById("remove-dataset-id").value.trim();

	if (!id) {
		showMessage("remove-dataset-message", "Please enter a dataset ID", true);
		return;
	}

	try {
		const response = await fetch(`${API_BASE_URL}/dataset/${encodeURIComponent(id)}`, {
			method: "DELETE",
		});

		const data = await response.json();

		if (response.ok) {
			showMessage("remove-dataset-message", `Dataset '${data.result}' removed successfully`);
			document.getElementById("remove-dataset-id").value = "";
			// Refresh dataset list
			listDatasets();
		} else {
			showMessage("remove-dataset-message", `Error: ${data.error}`, true);
		}
	} catch (error) {
		showMessage("remove-dataset-message", `Error: ${error.message}`, true);
	}
});

// List datasets
async function listDatasets() {
	const listElement = document.getElementById("datasets-list");
	listElement.innerHTML = '<div class="loading">Loading datasets...</div>';

	try {
		const response = await fetch(`${API_BASE_URL}/datasets`);
		const data = await response.json();

		if (response.ok && data.result && data.result.length > 0) {
			currentDatasets = data.result; // store globally
			listElement.innerHTML = data.result
				.map(
					(dataset) => `
                <div class="dataset-item">
                    <div class="dataset-info">
                        <div class="dataset-id">${dataset.id}</div>
                        <div class="dataset-details">
                            Kind: ${dataset.kind} | Rows: ${dataset.numRows}
                        </div>
                    </div>
                </div>
            `
				)
				.join("");
		} else {
			currentDatasets = [];
			listElement.innerHTML = '<div class="no-results">No datasets available. Add a dataset to get started.</div>';
		}

		// Update Insights dataset dropdown
		populateInsightsDatasetSelect();
	} catch (error) {
		currentDatasets = [];
		listElement.innerHTML = `<div class="message error">Error loading datasets: ${error.message}</div>`;
		populateInsightsDatasetSelect();
	}
}

function populateInsightsDatasetSelect() {
	const select = document.getElementById("insights-dataset-select");
	if (!select) {
		return;
	}

	// Only show sections datasets
	const sectionsDatasets = currentDatasets.filter((d) => d.kind === "sections");

	select.innerHTML = '<option value="">Select a sections dataset...</option>';
	sectionsDatasets.forEach((d) => {
		const option = document.createElement("option");
		option.value = d.id;
		option.textContent = `${d.id} (${d.numRows} rows)`;
		select.appendChild(option);
	});
}

// Load datasets on page load
listDatasets();

// Refresh button
document.getElementById("list-datasets-btn").addEventListener("click", listDatasets);

// Execute query
document.getElementById("execute-query-btn").addEventListener("click", async () => {
	const queryInput = document.getElementById("query-input").value.trim();
	const resultsElement = document.getElementById("query-results");
	const messageElement = document.getElementById("query-message");

	if (!queryInput) {
		showMessage("query-message", "Please enter a query", true);
		return;
	}

	let query;
	try {
		query = JSON.parse(queryInput);
	} catch (error) {
		showMessage("query-message", "Invalid JSON format", true);
		return;
	}

	resultsElement.innerHTML = '<div class="loading">Executing query...</div>';

	try {
		const response = await fetch(`${API_BASE_URL}/query`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(query),
		});

		const data = await response.json();

		if (response.ok && data.result) {
			showMessage("query-message", `Query executed successfully! Found ${data.result.length} results`);
			displayQueryResults(data.result);
		} else {
			showMessage("query-message", `Error: ${data.error}`, true);
			resultsElement.innerHTML = "";
		}
	} catch (error) {
		showMessage("query-message", `Error: ${error.message}`, true);
		resultsElement.innerHTML = "";
	}
});

// Display query results in a table
function displayQueryResults(results) {
	const resultsElement = document.getElementById("query-results");

	if (!results || results.length === 0) {
		resultsElement.innerHTML = '<div class="no-results">No results found</div>';
		return;
	}

	// Get all unique keys from all results
	const columns = [...new Set(results.flatMap((r) => Object.keys(r)))];

	let html = '<table class="results-table"><thead><tr>';
	columns.forEach((col) => {
		html += `<th>${col}</th>`;
	});
	html += "</tr></thead><tbody>";

	results.forEach((result) => {
		html += "<tr>";
		columns.forEach((col) => {
			const value = result[col] !== undefined ? result[col] : "";
			html += `<td>${value}</td>`;
		});
		html += "</tr>";
	});

	html += "</tbody></table>";
	resultsElement.innerHTML = html;
}

const insightsSelect = document.getElementById("insights-dataset-select");
if (insightsSelect) {
	insightsSelect.addEventListener("change", () => {
		const id = insightsSelect.value;
		if (!id) {
			clearInsightsCharts();
			return;
		}
		loadInsightsForDataset(id);
	});
}

function clearInsightsCharts() {
	if (gradeChart) {
		gradeChart.destroy();
		gradeChart = null;
	}
	if (avgByDeptChart) {
		avgByDeptChart.destroy();
		avgByDeptChart = null;
	}
	if (avgByYearChart) {
		avgByYearChart.destroy();
		avgByYearChart = null;
	}
	if (customChart) {
		customChart.destroy();
		customChart = null;
	}
}

async function loadInsightsForDataset(datasetId) {
	showMessage("insights-message", `Loading insights for '${datasetId}'...`);

	try {
		await Promise.all([fetchGradeDistribution(datasetId), fetchAvgByDept(datasetId), fetchAvgByYear(datasetId)]);
		showMessage("insights-message", `Insights loaded for '${datasetId}'.`);
	} catch (err) {
		console.error(err);
		clearInsightsCharts();
		showMessage("insights-message", `Error loading insights: ${err.message}`, true);
	}
}

async function fetchGradeDistribution(datasetId) {
	const query = {
		WHERE: {
			GT: {
				[`${datasetId}_avg`]: -1,
			},
		},
		OPTIONS: {
			COLUMNS: [`${datasetId}_avg`],
		},
	};

	const response = await fetch(`${API_BASE_URL}/query`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(query),
	});

	const data = await response.json();

	if (!response.ok || !data.result) {
		throw new Error(data.error || "Failed to fetch grade distribution");
	}

	const grades = data.result.map((r) => r[`${datasetId}_avg`]).filter((g) => typeof g === "number");

	const { labels, counts } = binGrades(grades);
	renderGradeDistributionChart(labels, counts);
}

function binGrades(grades) {
	const bins = [40, 50, 60, 70, 80, 90, 100];
	const counts = new Array(bins.length - 1).fill(0);

	for (const g of grades) {
		for (let i = 0; i < bins.length - 1; i++) {
			if (g >= bins[i] && g < bins[i + 1]) {
				counts[i]++;
				break;
			}
		}
	}

	const labels = bins.slice(0, -1).map((b, i) => `${b}-${bins[i + 1]}`);
	return { labels, counts };
}

function renderGradeDistributionChart(labels, counts) {
	const canvas = document.getElementById("grade-distribution-chart");
	if (!canvas) {
		return;
	}
	const ctx = canvas.getContext("2d");

	if (gradeChart) {
		gradeChart.data.labels = labels;
		gradeChart.data.datasets[0].data = counts;
		gradeChart.update();
		return;
	}

	gradeChart = new Chart(ctx, {
		type: "bar",
		data: {
			labels,
			datasets: [
				{
					label: "Number of sections",
					data: counts,
					backgroundColor: "rgba(102, 126, 234, 0.8)",
					borderColor: "rgba(102, 126, 234, 1)",
					borderWidth: 2,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
		},
	});
}

async function fetchAvgByDept(datasetId) {
	const query = {
		WHERE: {
			GT: {
				[`${datasetId}_avg`]: -1,
			},
		},
		OPTIONS: {
			COLUMNS: [`${datasetId}_dept`, "avgGrade"],
			ORDER: { dir: "DOWN", keys: ["avgGrade"] },
		},
		TRANSFORMATIONS: {
			GROUP: [`${datasetId}_dept`],
			APPLY: [{ avgGrade: { AVG: `${datasetId}_avg` } }],
		},
	};

	const response = await fetch(`${API_BASE_URL}/query`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(query),
	});

	const data = await response.json();

	if (!response.ok || !data.result) {
		throw new Error(data.error || "Failed to fetch average grade by department");
	}

	const rows = data.result;
	const labels = rows.map((r) => r[`${datasetId}_dept`]);
	const values = rows.map((r) => r["avgGrade"]);

	renderAvgByDeptChart(labels, values);
}

function renderAvgByDeptChart(labels, values) {
	const canvas = document.getElementById("avg-by-dept-chart");
	if (!canvas) {
		return;
	}
	const ctx = canvas.getContext("2d");

	if (avgByDeptChart) {
		avgByDeptChart.data.labels = labels;
		avgByDeptChart.data.datasets[0].data = values;
		avgByDeptChart.update();
		return;
	}

	avgByDeptChart = new Chart(ctx, {
		type: "bar",
		data: {
			labels,
			datasets: [
				{
					label: "Average grade",
					data: values,
					backgroundColor: "rgba(102, 126, 234, 0.8)",
					borderColor: "rgba(102, 126, 234, 1)",
					borderWidth: 2,
				},
			],
		},
		options: {
			indexAxis: "y",
			responsive: true,
			maintainAspectRatio: false,
		},
	});
}

async function fetchAvgByYear(datasetId) {
	const query = {
		WHERE: {
			GT: {
				[`${datasetId}_avg`]: -1,
			},
		},
		OPTIONS: {
			COLUMNS: [`${datasetId}_year`, "avgGrade"],
			ORDER: { dir: "UP", keys: [`${datasetId}_year`] },
		},
		TRANSFORMATIONS: {
			GROUP: [`${datasetId}_year`],
			APPLY: [{ avgGrade: { AVG: `${datasetId}_avg` } }],
		},
	};

	const response = await fetch(`${API_BASE_URL}/query`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(query),
	});

	const data = await response.json();

	if (!response.ok || !data.result) {
		throw new Error(data.error || "Failed to fetch average grade by year");
	}

	const rows = data.result;
	const labels = rows.map((r) => r[`${datasetId}_year`]);
	const values = rows.map((r) => r["avgGrade"]);

	renderAvgByYearChart(labels, values);
}

function renderAvgByYearChart(labels, values) {
	const canvas = document.getElementById("avg-by-year-chart");
	if (!canvas) {
		return;
	}
	const ctx = canvas.getContext("2d");

	if (avgByYearChart) {
		avgByYearChart.data.labels = labels;
		avgByYearChart.data.datasets[0].data = values;
		avgByYearChart.update();
		return;
	}

	avgByYearChart = new Chart(ctx, {
		type: "line",
		data: {
			labels,
			datasets: [
				{
					label: "Average grade",
					data: values,
					backgroundColor: "rgba(102, 126, 234, 0.3)",
					borderColor: "rgba(102, 126, 234, 1)",
					borderWidth: 2,
					fill: false,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
		},
	});
}

// Update filter input based on selected field
document.getElementById("custom-filter-field").addEventListener("change", () => {
	const filterField = document.getElementById("custom-filter-field").value;
	const filterOperator = document.getElementById("custom-filter-operator");
	const filterValue = document.getElementById("custom-filter-value");

	// Clear the value
	filterValue.value = "";

	if (filterField === "dept") {
		// For department, only EQ makes sense
		filterOperator.innerHTML = '<option value="EQ">Equal To (=)</option>';
		filterValue.type = "text";
		filterValue.placeholder = "e.g., cpsc, math";
	} else if (filterField === "avg" || filterField === "year") {
		// For numeric fields, show all operators
		filterOperator.innerHTML = `
			<option value="GT">Greater Than (&gt;)</option>
			<option value="LT">Less Than (&lt;)</option>
			<option value="EQ">Equal To (=)</option>
		`;
		filterValue.type = "number";
		filterValue.placeholder = filterField === "avg" ? "e.g., 90" : "e.g., 2019";
		if (filterField === "avg") {
			filterValue.step = "0.01";
		} else {
			filterValue.step = "1";
		}
	} else {
		// No filter selected
		filterOperator.innerHTML = `
			<option value="GT">Greater Than (&gt;)</option>
			<option value="LT">Less Than (&lt;)</option>
			<option value="EQ">Equal To (=)</option>
		`;
		filterValue.type = "text";
		filterValue.placeholder = "e.g., 90";
	}
});

// Custom graph builder functionality
document.getElementById("generate-custom-graph-btn").addEventListener("click", async () => {
	const datasetId = document.getElementById("insights-dataset-select").value;
	if (!datasetId) {
		showMessage("custom-graph-message", "Please select a dataset first", true);
		return;
	}

	const filterField = document.getElementById("custom-filter-field").value;
	const filterOperator = document.getElementById("custom-filter-operator").value;
	const filterValue = document.getElementById("custom-filter-value").value;
	const groupBy = document.getElementById("custom-group-by").value;
	const aggregate = document.getElementById("custom-aggregate").value;
	const chartType = document.getElementById("custom-chart-type").value;

	try {
		showMessage("custom-graph-message", "Generating graph...");
		const query = buildCustomQuery(datasetId, filterField, filterOperator, filterValue, groupBy, aggregate);

		const response = await fetch(`${API_BASE_URL}/query`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(query),
		});

		const data = await response.json();

		if (!response.ok || !data.result) {
			throw new Error(data.error || "Failed to execute query");
		}

		if (data.result.length === 0) {
			showMessage("custom-graph-message", "No results found for this query", true);
			document.getElementById("custom-graph-container").style.display = "none";
			return;
		}

		// Determine chart title
		let title = "Custom Graph";
		if (filterField && filterValue) {
			const fieldName = filterField === "avg" ? "Average Grade" : filterField === "dept" ? "Department" : "Year";
			const opSymbol = filterOperator === "GT" ? ">" : filterOperator === "LT" ? "<" : "=";
			title += ` (${fieldName} ${opSymbol} ${filterValue})`;
		}
		if (groupBy) {
			const groupName = groupBy === "dept" ? "by Department" : groupBy === "year" ? "by Year" : "by Course ID";
			title += ` ${groupName}`;
		}
		document.getElementById("custom-graph-title").textContent = title;

		// Parse results and render chart
		const { labels, values, labelColumn } = parseQueryResults(data.result, groupBy, aggregate, datasetId);
		renderCustomChart(labels, values, chartType, labelColumn || groupBy || "Value");

		showMessage("custom-graph-message", `Graph generated successfully! Found ${data.result.length} results`);
		document.getElementById("custom-graph-container").style.display = "block";
	} catch (error) {
		console.error(error);
		showMessage("custom-graph-message", `Error: ${error.message}`, true);
		document.getElementById("custom-graph-container").style.display = "none";
	}
});

function buildCustomQuery(datasetId, filterField, filterOperator, filterValue, groupBy, aggregate) {
	const query = {
		WHERE: {},
		OPTIONS: {
			COLUMNS: [],
		},
	};

	// Build WHERE clause
	if (filterField && filterValue !== "") {
		let fieldKey;
		if (filterField === "avg") {
			fieldKey = `${datasetId}_avg`;
		} else if (filterField === "year") {
			fieldKey = `${datasetId}_year`;
		} else if (filterField === "dept") {
			fieldKey = `${datasetId}_dept`;
		}

		if (fieldKey) {
			const value = filterField === "dept" ? filterValue : parseFloat(filterValue);
			query.WHERE[filterOperator] = { [fieldKey]: value };
		}
	} else {
		// Default filter to get all valid data
		query.WHERE = {
			GT: {
				[`${datasetId}_avg`]: -1,
			},
		};
	}

	// Build TRANSFORMATIONS if grouping/aggregation is needed
	if (groupBy || aggregate) {
		query.TRANSFORMATIONS = {
			GROUP: [],
			APPLY: [],
		};

		// Add GROUP fields
		if (groupBy === "dept") {
			query.TRANSFORMATIONS.GROUP.push(`${datasetId}_dept`);
			query.OPTIONS.COLUMNS.push(`${datasetId}_dept`);
		} else if (groupBy === "year") {
			query.TRANSFORMATIONS.GROUP.push(`${datasetId}_year`);
			query.OPTIONS.COLUMNS.push(`${datasetId}_year`);
		} else if (groupBy === "id") {
			query.TRANSFORMATIONS.GROUP.push(`${datasetId}_id`);
			query.OPTIONS.COLUMNS.push(`${datasetId}_id`);
		}

		// Add APPLY (aggregation)
		if (aggregate) {
			let aggregateKey, aggregateField;
			if (aggregate === "AVG") {
				aggregateKey = "avgValue";
				aggregateField = `${datasetId}_avg`;
			} else if (aggregate === "SUM") {
				aggregateKey = "sumValue";
				aggregateField = `${datasetId}_avg`;
			} else if (aggregate === "COUNT") {
				aggregateKey = "countValue";
				aggregateField = `${datasetId}_avg`;
			} else if (aggregate === "MAX") {
				aggregateKey = "maxValue";
				aggregateField = `${datasetId}_avg`;
			} else if (aggregate === "MIN") {
				aggregateKey = "minValue";
				aggregateField = `${datasetId}_avg`;
			}

			if (aggregateKey && aggregateField) {
				query.TRANSFORMATIONS.APPLY.push({
					[aggregateKey]: {
						[aggregate]: aggregateField,
					},
				});
				query.OPTIONS.COLUMNS.push(aggregateKey);
			}
		} else if (groupBy) {
			// If grouping but no aggregation, show the avg for each group
			query.TRANSFORMATIONS.APPLY.push({
				avgValue: {
					AVG: `${datasetId}_avg`,
				},
			});
			query.OPTIONS.COLUMNS.push("avgValue");
		}
	} else {
		// No grouping/aggregation - just show avg
		query.OPTIONS.COLUMNS.push(`${datasetId}_avg`);
		if (filterField !== "dept") {
			query.OPTIONS.COLUMNS.push(`${datasetId}_dept`);
		}
	}

	// Add ORDER if we have aggregation results
	if (query.TRANSFORMATIONS && query.TRANSFORMATIONS.APPLY.length > 0) {
		const orderKey = query.OPTIONS.COLUMNS[query.OPTIONS.COLUMNS.length - 1];
		query.OPTIONS.ORDER = {
			dir: "DOWN",
			keys: [orderKey],
		};
	}

	return query;
}

function parseQueryResults(results, groupBy, aggregate, datasetId) {
	if (!results || results.length === 0) {
		return { labels: [], values: [] };
	}

	let labels = [];
	let values = [];
	let labelColumn = null;

	if (groupBy) {
		// We have grouped data
		if (groupBy === "dept") {
			labelColumn = "Department";
			labels = results.map((r) => r[`${datasetId}_dept`] || "Unknown");
		} else if (groupBy === "year") {
			labelColumn = "Year";
			labels = results.map((r) => r[`${datasetId}_year`] || "Unknown");
		} else if (groupBy === "id") {
			labelColumn = "Course ID";
			labels = results.map((r) => r[`${datasetId}_id`] || "Unknown");
		}

		// Get the value column (aggregated or avg)
		const valueKey = aggregate
			? aggregate === "AVG"
				? "avgValue"
				: aggregate === "SUM"
					? "sumValue"
					: aggregate === "COUNT"
						? "countValue"
						: aggregate === "MAX"
							? "maxValue"
							: "minValue"
			: "avgValue";

		values = results.map((r) => {
			const val = r[valueKey];
			return typeof val === "number" ? val : parseFloat(val) || 0;
		});
	} else {
		// No grouping - show distribution of averages
		labelColumn = "Average Grade";
		const avgValues = results.map((r) => r[`${datasetId}_avg`]).filter((v) => typeof v === "number");

		// Bin the values for histogram-like display
		const bins = [0, 40, 50, 60, 70, 80, 90, 100];
		const counts = new Array(bins.length - 1).fill(0);
		for (const val of avgValues) {
			for (let i = 0; i < bins.length - 1; i++) {
				if (val >= bins[i] && (i === bins.length - 2 ? val <= bins[i + 1] : val < bins[i + 1])) {
					counts[i]++;
					break;
				}
			}
		}

		labels = bins.slice(0, -1).map((b, i) => `${b}-${bins[i + 1]}`);
		values = counts;
	}

	return { labels, values, labelColumn };
}

function renderCustomChart(labels, values, chartType, labelColumn) {
	const canvas = document.getElementById("custom-graph-chart");
	if (!canvas) {
		return;
	}
	const ctx = canvas.getContext("2d");

	// Destroy existing chart if it exists
	if (customChart) {
		customChart.destroy();
		customChart = null;
	}

	const chartConfig = {
		type: chartType,
		data: {
			labels,
			datasets: [
				{
					label: labelColumn,
					data: values,
					backgroundColor:
						chartType === "pie"
							? [
									"rgba(102, 126, 234, 0.8)",
									"rgba(118, 75, 162, 0.8)",
									"rgba(231, 76, 60, 0.8)",
									"rgba(52, 152, 219, 0.8)",
									"rgba(46, 204, 113, 0.8)",
									"rgba(241, 196, 15, 0.8)",
									"rgba(230, 126, 34, 0.8)",
								]
							: "rgba(102, 126, 234, 0.8)",
					borderColor: "rgba(102, 126, 234, 1)",
					borderWidth: 2,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: chartType !== "pie",
				},
			},
		},
	};

	// Adjust for horizontal bar if needed
	if (chartType === "bar" && labels.length > 10) {
		chartConfig.options.indexAxis = "y";
	}

	customChart = new Chart(ctx, chartConfig);
}
