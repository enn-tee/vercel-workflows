import { getRun } from "workflow/api";
import { NextResponse } from "next/server";
import type { ProgressUpdate } from "@/app/workflows/report-generator";
import { getProgress, getCorrelationId, clearProgress } from "@/app/lib/redis";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  if (!runId) {
    return NextResponse.json(
      { error: "runId parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Get the run status from the workflow engine
    const run = await getRun(runId);

    if (!run) {
      return NextResponse.json(
        { error: "Run not found" },
        { status: 404 }
      );
    }

    // Get the run status
    const runStatus = await run.status;

    // Map the run status to a simplified format
    let status: "Running" | "Completed" | "Failed";
    if (runStatus === "completed") {
      status = "Completed";
    } else if (runStatus === "failed") {
      status = "Failed";
    } else {
      status = "Running";
    }

    // Get output and progress
    let output = null;
    let progressUpdates: ProgressUpdate[] = [];

    // First, try to get progress from Redis
    // Check both the actual runId and any correlation ID mapping
    let storedProgress = await getProgress(runId);

    // If no progress found, try correlation ID mapping
    if (storedProgress.length === 0) {
      const correlationId = await getCorrelationId(runId);
      if (correlationId) {
        storedProgress = await getProgress(correlationId);
      }
    }

    if (storedProgress.length > 0) {
      progressUpdates = storedProgress;
    }

    if (runStatus === "completed") {
      // When completed, get the final return value
      output = await run.returnValue;
      // Extract progress updates from the completed result if not in Redis
      if (progressUpdates.length === 0 && output && typeof output === 'object' && 'progressUpdates' in output) {
        progressUpdates = (output as any).progressUpdates;
      }
      // Clean up the Redis progress data for completed workflows
      await clearProgress(runId);
      const correlationId = await getCorrelationId(runId);
      if (correlationId) {
        await clearProgress(correlationId);
      }
    }

    // Get the latest progress update
    const latestProgress = progressUpdates.length > 0
      ? progressUpdates[progressUpdates.length - 1]
      : null;

    return NextResponse.json({
      status,
      output,
      progress: latestProgress,
      progressHistory: progressUpdates,
    });
  } catch (error) {
    console.error("Error fetching run status:", error);
    return NextResponse.json(
      { error: "Failed to fetch run status" },
      { status: 500 }
    );
  }
}
