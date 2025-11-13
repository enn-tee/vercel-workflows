"use client";

import { useState } from "react";
import { useWorkflow } from "./hooks/useWorkflow";

export default function Home() {
  const [email, setEmail] = useState("");
  const [reportType, setReportType] = useState("");
  const { start, status, result, progress, progressHistory, isRunning, error } = useWorkflow();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await start(email, reportType);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 font-sans dark:bg-black">
      <main className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900">
        <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Simulated Report Generator
        </h1>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          A demonstration of Vercel Workflows with client-side polling
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              required
              disabled={isRunning}
              className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>

          <div>
            <label
              htmlFor="reportType"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Report Type
            </label>
            <input
              type="text"
              id="reportType"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              placeholder="e.g., Sales Analysis, User Metrics"
              required
              disabled={isRunning}
              className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>

          <button
            type="submit"
            disabled={isRunning}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isRunning ? "Processing..." : "Generate Report"}
          </button>
        </form>

        {/* Status Display */}
        {status !== "Idle" && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Workflow Status
              </h2>
              <StatusBadge status={status} />
            </div>

            {/* Running State */}
            {status === "Running" && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50"></div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Processing workflow steps...
                  </p>
                </div>

                {/* Progress Bar */}
                {progress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                      <span>Step {progress.step} of {progress.totalSteps}</span>
                      <span>{Math.round((progress.step / progress.totalSteps) * 100)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500 dark:bg-blue-400"
                        style={{ width: `${(progress.step / progress.totalSteps) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {progress.message}
                    </p>
                  </div>
                )}

                {/* Progress History */}
                {progressHistory.length > 0 && (
                  <div className="mt-4 max-h-40 overflow-y-auto rounded-md bg-zinc-50 p-3 dark:bg-zinc-950">
                    <h4 className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Progress Log
                    </h4>
                    <div className="space-y-1">
                      {progressHistory.map((update, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400"
                        >
                          <span className="text-zinc-400 dark:text-zinc-600">
                            {new Date(update.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="flex-1">{update.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Completed State */}
            {status === "Completed" && result && (
              <div className="space-y-4">
                <div className="rounded-md bg-green-50 p-4 dark:bg-green-950/20">
                  <p className="text-sm font-medium text-green-800 dark:text-green-400">
                    Report generated successfully!
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Metadata
                    </h3>
                    <div className="rounded-md bg-white p-3 text-xs dark:bg-zinc-900">
                      <p className="text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">Email:</span> {result.metadata.email}
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">Report Type:</span> {result.metadata.reportType}
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">Started:</span>{" "}
                        {new Date(result.metadata.startTime).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Processing Results
                    </h3>
                    <div className="rounded-md bg-white p-3 text-xs dark:bg-zinc-900">
                      <p className="text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">Score:</span> {result.processing.score}/100
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">Data Points:</span> {result.processing.dataPoints}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Summary
                    </h3>
                    <div className="rounded-md bg-white p-3 text-sm dark:bg-zinc-900">
                      <p className="text-zinc-700 dark:text-zinc-300">{result.summary}</p>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500 dark:text-zinc-500">
                    Completed at: {new Date(result.completedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Failed State */}
            {status === "Failed" && (
              <div className="rounded-md bg-red-50 p-4 dark:bg-red-950/20">
                <p className="text-sm font-medium text-red-800 dark:text-red-400">
                  Workflow failed: {error || "Unknown error"}
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && status !== "Failed" && (
              <div className="mt-4 rounded-md bg-red-50 p-4 dark:bg-red-950/20">
                <p className="text-sm font-medium text-red-800 dark:text-red-400">
                  Error: {error}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            How it works
          </h3>
          <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            <li>• Step 1: Initialize analysis (2 seconds)</li>
            <li>• Step 2: Process data (3 seconds)</li>
            <li>• Step 3: Generate summary (1 second)</li>
            <li>• Client polls every 2 seconds for status updates</li>
            <li>• No database required - state managed by Vercel Workflows</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    Running: "bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400",
    Completed: "bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400",
    Failed: "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400",
    Idle: "bg-zinc-100 text-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-400",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        styles[status as keyof typeof styles] || styles.Idle
      }`}
    >
      {status}
    </span>
  );
}
