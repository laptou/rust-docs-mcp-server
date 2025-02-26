import { describe, expect, test, beforeAll } from "bun:test";
import * as cheerio from "cheerio";
import docsRsService from "./services/docs-rs-service";

describe("DocsRsService", () => {
	// Set longer timeout for network requests
	const timeout = 15000;

	test(
		"searchCrates should return results for a valid query",
		async () => {
			const result = await docsRsService.searchCrates({ query: "serde" });
			expect(result.crates.length).toBeGreaterThan(0);
			expect(result.totalCount).toBeGreaterThan(0);
		},
		timeout,
	);

	test(
		"getCrateDocumentation should return HTML content for a valid crate",
		async () => {
			const html = await docsRsService.getCrateDocumentation("tokio");
			
			// Verify that we got HTML content back
			expect(html).toBeTruthy();
			expect(html.includes("<!DOCTYPE html>")).toBe(true);
			
			// Test HTML parsing with cheerio
			const $ = cheerio.load(html);
			
			// Check for key elements that should be present in the documentation
			expect($("title").text()).toContain("tokio");
			
			// Check for the main content element
			const mainElement = $("#main");
			expect(mainElement.length).toBeGreaterThan(0);
			
			// Verify that the main content contains useful information
			const mainContent = mainElement.text();
			expect(mainContent.length).toBeGreaterThan(100);
			expect(mainContent).toContain("Tokio");
		},
		timeout,
	);

	test(
		"getCrateVersions should return versions for a valid crate",
		async () => {
			const versions = await docsRsService.getCrateVersions("tokio");
			expect(versions.length).toBeGreaterThan(0);
			expect(versions[0].version).toBeTruthy();
		},
		timeout,
	);

	test(
		"searchSymbols should return symbols for a valid query",
		async () => {
			const symbols = await docsRsService.searchSymbols("tokio", "runtime");
			expect(symbols.length).toBeGreaterThan(0);
		},
		timeout,
	);
	
	test.skip(
		"getTypeInfo should return information for a valid type",
		async () => {
			// This test is skipped because the path may change in docs.rs
			// In a real implementation, we would need to first find the correct path
			// by searching for the type or navigating through the documentation
			const typeInfo = await docsRsService.getTypeInfo(
				"tokio",
				"runtime/struct.Runtime.html"
			);
			
			expect(typeInfo).toBeTruthy();
			expect(typeInfo.name).toContain("Runtime");
			expect(typeInfo.kind).toBe("struct");
		},
		timeout,
	);
	
	// Test the HTML extraction in the MCP server
	describe("HTML Content Extraction", () => {
		let html: string;
		let $: cheerio.CheerioAPI;
		
		beforeAll(async () => {
			// Fetch HTML once for all tests in this describe block
			html = await docsRsService.getCrateDocumentation("tokio");
			$ = cheerio.load(html);
		});
		
		test("should find main content with #main selector", () => {
			const mainElement = $("#main");
			expect(mainElement.length).toBeGreaterThan(0);
			
			const content = mainElement.html();
			expect(content).toBeTruthy();
			expect(content!.length).toBeGreaterThan(100);
		});
		
		test("should extract content with alternative selectors if needed", () => {
			const alternativeSelectors = [
				"main",
				".container.package-page-container",
				".rustdoc",
				".information",
				".crate-info"
			];
			
			// At least one of these selectors should find content
			let contentFound = false;
			
			for (const selector of alternativeSelectors) {
				const element = $(selector);
				if (element.length > 0) {
					const content = element.html();
					if (content && content.length > 0) {
						contentFound = true;
						break;
					}
				}
			}
			
			// Either #main or at least one alternative selector should find content
			const mainElement = $("#main");
			expect(mainElement.length > 0 || contentFound).toBe(true);
		});
	});
});
