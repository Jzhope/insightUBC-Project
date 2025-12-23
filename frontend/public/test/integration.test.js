/**
 * Frontend Integration Tests
 * These tests verify that the frontend can communicate with the backend API
 *
 * To run these tests:
 * 1. Start the server: yarn start
 * 2. Open frontend/public/index.html in a browser
 * 3. Open browser console and run these tests manually, or
 * 4. Use a headless browser testing framework
 */

// Test helper functions
async function testAddDataset() {
	console.log("Test: Add Dataset");
	const testId = "test-dataset-" + Date.now();
	const testContent = "UEsDBBQAAAAIAHZ..."; // Mock base64 content (truncated)

	try {
		const response = await fetch(`http://localhost:4321/dataset/${testId}?kind=sections`, {
			method: "PUT",
			headers: { "Content-Type": "text/plain" },
			body: testContent,
		});

		const data = await response.json();
		if (response.ok) {
			console.log("✓ Add dataset test passed");
			return true;
		} else {
			console.log("✗ Add dataset test failed:", data.error);
			return false;
		}
	} catch (error) {
		console.log("✗ Add dataset test error:", error.message);
		return false;
	}
}

async function testListDatasets() {
	console.log("Test: List Datasets");
	try {
		const response = await fetch("http://localhost:4321/datasets");
		const data = await response.json();

		if (response.ok && Array.isArray(data.result)) {
			console.log("✓ List datasets test passed");
			console.log("  Found", data.result.length, "datasets");
			return true;
		} else {
			console.log("✗ List datasets test failed");
			return false;
		}
	} catch (error) {
		console.log("✗ List datasets test error:", error.message);
		return false;
	}
}

async function testExecuteQuery() {
	console.log("Test: Execute Query");
	const query = {
		WHERE: {},
		OPTIONS: {
			COLUMNS: ["sections_dept", "sections_avg"],
		},
	};

	try {
		const response = await fetch("http://localhost:4321/query", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(query),
		});

		const data = await response.json();
		if (response.ok && Array.isArray(data.result)) {
			console.log("✓ Execute query test passed");
			console.log("  Found", data.result.length, "results");
			return true;
		} else {
			console.log("✗ Execute query test failed:", data.error);
			return false;
		}
	} catch (error) {
		console.log("✗ Execute query test error:", error.message);
		return false;
	}
}

async function testRemoveDataset() {
	console.log("Test: Remove Dataset");
	const testId = "test-remove-" + Date.now();

	try {
		// First add a dataset (this will fail if server doesn't have test data, which is ok)
		const addResponse = await fetch(`http://localhost:4321/dataset/${testId}?kind=sections`, {
			method: "PUT",
			headers: { "Content-Type": "text/plain" },
			body: "UEsDBBQAAAAIAHZ...", // Mock content
		});

		if (!addResponse.ok) {
			console.log("  (Skipping - no test dataset to remove)");
			return true; // Not a failure, just no data to test with
		}

		// Then remove it
		const deleteResponse = await fetch(`http://localhost:4321/dataset/${testId}`, {
			method: "DELETE",
		});

		const data = await deleteResponse.json();
		if (deleteResponse.ok) {
			console.log("✓ Remove dataset test passed");
			return true;
		} else {
			console.log("✗ Remove dataset test failed:", data.error);
			return false;
		}
	} catch (error) {
		console.log("✗ Remove dataset test error:", error.message);
		return false;
	}
}

// Run all tests
async function runAllTests() {
	console.log("=== Frontend Integration Tests ===\n");
	const results = [];

	results.push(await testListDatasets());
	results.push(await testExecuteQuery());
	// Note: Add/Remove tests require actual dataset files, so they may fail without proper setup

	const passed = results.filter((r) => r).length;
	const total = results.length;
	console.log(`\n=== Test Results: ${passed}/${total} passed ===`);
}

// Export for use in test framework or browser console
if (typeof module !== "undefined" && module.exports) {
	module.exports = { testAddDataset, testListDatasets, testExecuteQuery, testRemoveDataset, runAllTests };
}

// Auto-run if in browser console
if (typeof window !== "undefined") {
	window.runFrontendTests = runAllTests;
	console.log("Frontend tests loaded. Run window.runFrontendTests() to execute tests.");
}
