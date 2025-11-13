"use client";

import { useState } from "react";
import useSWR from "swr";
import type { ReportSummary, ProgressUpdate } from "../workflows/report-generator";

interface WorkflowStatus {
  status: "Running" | "Completed" | "Failed";
  output?: ReportSummary;
  progress?: ProgressUpdate | null;
  progressHistory?: ProgressUpdate[];
  startedAt?: string;
  endedAt?: string;
  error?: string;
}

interface UseWorkflowReturn {
  start: (email: string, reportType: string) => Promise<void>;
  status: WorkflowStatus["status"] | "Idle";
  result: ReportSummary | null;
  progress: ProgressUpdate | null;
  progressHistory: ProgressUpdate[];
  isRunning: boolean;
  error: string | null;
}

const fetcher = async (url: string): Promise<WorkflowStatus> => {
  console.log(`Calling fetcher`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch workflow status");
  }
  return res.json();
};

export function useWorkflow(): UseWorkflowReturn {
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  // Only poll when we have a runId
  const { data, error: swrError } = useSWR(
    currentRunId ? `/api/status?runId=${currentRunId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        // Stop polling if workflow is completed or failed
        if (data?.status === "Completed" || data?.status === "Failed") {
          return 0;
        }
        // Poll every 2 seconds while running
        return 1000;
      },
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const start = async (email: string, reportType: string) => {
    setStartError(null);

    try {
      // Import the server action dynamically to avoid bundling issues
      const { triggerReport } = await import("../actions");
      const result = await triggerReport(email, reportType);

      if (result.error) {
        setStartError(result.error);
        return;
      }

      if (result.runId) {
        setCurrentRunId(result.runId);
      }
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to start workflow");
    }
  };

  const status = data?.status || (currentRunId ? "Running" : "Idle");
  const isRunning = status === "Running";
  const error = startError || swrError?.message || data?.error || null;

  return {
    start,
    status,
    result: data?.output || null,
    progress: data?.progress || null,
    progressHistory: data?.progressHistory || [],
    isRunning,
    error,
  };
}
