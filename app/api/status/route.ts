import { getRun } from "workflow/api";
import { NextResponse } from "next/server";
import type { ProgressUpdate } from "@/app/workflows/report-generator";

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

    if (runStatus === "completed") {
      // When completed, get the final return value
      output = await run.returnValue;
      // Extract progress updates from the completed result
      if (output && typeof output === 'object' && 'progressUpdates' in output) {
        progressUpdates = (output as any).progressUpdates;
      }
    } else if (runStatus === "running") {
      // When running, estimate progress based on elapsed time
      // The workflow has 3 steps with sleep durations: 2s, 3s, 1s (total ~6s)
      const createdAt = await run.createdAt;
      const elapsedMs = Date.now() - new Date(createdAt).getTime();
      const elapsedSec = elapsedMs / 1000;

      // Estimate current step based on elapsed time
      const totalSteps = 3;
      let currentStep = 0;
      let message = "Initializing analysis...";

      if (elapsedSec < 2) {
        currentStep = 1;
        message = "Initializing analysis...";
      } else if (elapsedSec < 5) {
        currentStep = 2;
        message = "Processing data...";
      } else {
        currentStep = 3;
        message = "Generating summary...";
      }

      // Create synthetic progress update
      progressUpdates.push({
        step: currentStep,
        totalSteps,
        message,
        timestamp: new Date().toISOString()
      });
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
