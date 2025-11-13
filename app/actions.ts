"use server";

import { start } from "workflow/api";
import { generateReport, ReportInputSchema } from "./workflows/report-generator";
import { mapIds } from "./lib/redis";

export async function triggerReport(email: string, reportType: string, correlationId: string) {
  // Validate input (include correlationId as runId for progress tracking)
  const validationResult = ReportInputSchema.safeParse({
    email,
    reportType,
    runId: correlationId,
  });

  if (!validationResult.success) {
    return {
      error: validationResult.error.issues[0].message,
      runId: null,
    };
  }

  try {
    // Start the workflow with correlation ID
    const run = await start(generateReport, [validationResult.data]);

    // Map correlation ID to actual runId in Redis
    // This allows the workflow to store progress under correlationId
    // and the API to retrieve it using the actual runId
    await mapIds(correlationId, run.runId);

    console.log(`Mapped correlation ID ${correlationId} to run ID ${run.runId}`);

    return {
      runId: run.runId,
      correlationId,
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
