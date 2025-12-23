import { InsightResult } from "../src/controller/IInsightFacade";

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: InsightResult[] | string;
}
