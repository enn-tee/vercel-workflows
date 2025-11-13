"use server";

import { start } from "workflow/api";
import { generateReport, ReportInputSchema } from "./workflows/report-generator";

export async function triggerReport(email: string, reportType: string) {
  // Validate input
  const validationResult = ReportInputSchema.safeParse({ email, reportType });

  if (!validationResult.success) {
    return {
      error: validationResult.error.issues[0].message,
      runId: null,
    };
  }

  try {
    // Start the workflow
    const run = await start(generateReport, [validationResult.data]);

    return {
      runId: run.runId,
      error: null,
    };
  } catch (error) {
    console.error("Error starting workflow:", error);
    return {
      error: "Failed to start workflow",
      runId: null,
    };
  }
}
