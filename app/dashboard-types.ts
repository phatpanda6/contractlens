export type DashboardTestRun = {
  id: string;
  targetUrl: string | null;
  status: "BASELINE_CREATED" | "PASS" | "FAIL" | "ERROR";
  responseBody: unknown;
  detectedSchema: unknown;
  createdAt: Date;
  diff: unknown;
  errorMessage: string | null;
  aiExplanation: string | null;
};

export type DashboardEndpoint = {
  id: string;
  name: string;
  method: string;
  url: string;
  baselineSchema: unknown;
  baselineExample: unknown;
  testRuns: DashboardTestRun[];
};

export type DashboardProject = {
  id: string;
  name: string;
  endpoints: DashboardEndpoint[];
};
