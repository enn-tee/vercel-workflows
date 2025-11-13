import { sleep } from "workflow";
import { z } from "zod";

// Input schema for the workflow
export const ReportInputSchema = z.object({
  email: z.string().email(),
  reportType: z.string(),
  runId: z.string().optional(), // Pass runId so we can store progress
});

export type ReportInput = z.infer<typeof ReportInputSchema>;

export interface AnalysisMetadata {
  startTime: string;
  reportType: string;
  email: string;
}

export interface ProcessingResult {
  score: number;
  dataPoints: number;
}

export interface ProgressUpdate {
  step: number;
  totalSteps: number;
  message: string;
  timestamp: string;
}

export interface ReportSummary {
  metadata: AnalysisMetadata;
  processing: ProcessingResult;
  summary: string;
  completedAt: string;
  progressUpdates: ProgressUpdate[];
}

export async function generateReport(input: ReportInput): Promise<ReportSummary> {
  "use workflow";

  // Track progress updates in an array
  const progressUpdates: ProgressUpdate[] = [];
  const { runId } = input;

  // Progress update helper that stores to Redis via step
  const updateProgress = async (progress: ProgressUpdate) => {
    progressUpdates.push(progress);
    if (runId) {
      await storeProgressInRedis(runId, progress);
    }
  };

  await updateProgress({
    step: 1,
    totalSteps: 3,
    message: "Initializing analysis...",
    timestamp: new Date().toISOString(),
  });

  // Step 1: Initialize analysis
  const metadata = await initAnalysis(input);

  await updateProgress({
    step: 1,
    totalSteps: 3,
    message: "Analysis initialized",
    timestamp: new Date().toISOString(),
  });

  await sleep("2s");

  await updateProgress({
    step: 2,
    totalSteps: 3,
    message: "Processing data...",
    timestamp: new Date().toISOString(),
  });

  // Step 2: Process data
  const processingResult = await processData(metadata);

  await updateProgress({
    step: 2,
    totalSteps: 3,
    message: `Processed ${processingResult.dataPoints} data points`,
    timestamp: new Date().toISOString(),
  });

  await sleep("3s");

  await updateProgress({
    step: 3,
    totalSteps: 3,
    message: "Generating summary...",
    timestamp: new Date().toISOString(),
  });

  // Step 3: Generate summary
  const summary = await generateSummary(processingResult);

  await updateProgress({
    step: 3,
    totalSteps: 3,
    message: "Summary generated",
    timestamp: new Date().toISOString(),
  });

  await sleep("1s");

  console.log("Report generation workflow complete!");

  return {
    metadata,
    processing: processingResult,
    summary,
    completedAt: new Date().toISOString(),
    progressUpdates,
  };
}

// Step function to store progress in Redis
async function storeProgressInRedis(runId: string, progress: ProgressUpdate): Promise<void> {
  "use step";

  try {
    console.log(`[PROGRESS STEP] Storing progress for ${runId}:`, progress.message);

    const response = await fetch("http://localhost:3000/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId, progress }),
    });

    if (!response.ok) {
      console.error(`[PROGRESS STEP] Failed to store progress: ${response.status}`);
    }
  } catch (error) {
    console.error("[PROGRESS STEP] Error storing progress:", error);
    // Don't throw - progress tracking shouldn't break the workflow
  }
}

async function initAnalysis(input: ReportInput): Promise<AnalysisMetadata> {
  "use step";

  console.log(`[Step 1/3] Initializing analysis for ${input.email}, type: ${input.reportType}`);

  return {
    startTime: new Date().toISOString(),
    reportType: input.reportType,
    email: input.email,
  };
}

async function processData(metadata: AnalysisMetadata): Promise<ProcessingResult> {
  "use step";

  console.log(`[Step 2/3] Processing data for report type: ${metadata.reportType}`);

  // Generate a mock score based on report type
  const baseScore = 85;
  const typeBonus = metadata.reportType.length % 15;
  const score = Math.min(100, baseScore + typeBonus);

  return {
    score,
    dataPoints: Math.floor(Math.random() * 1000) + 500,
  };
}

async function generateSummary(result: ProcessingResult): Promise<string> {
  "use step";

  console.log(`[Step 3/3] Generating summary with score: ${result.score}`);

  const rating = result.score >= 90 ? "Excellent" : result.score >= 75 ? "Good" : "Fair";

  return `Analysis complete. Overall rating: ${rating}. ` +
         `Processed ${result.dataPoints} data points with a score of ${result.score}/100. ` +
         `All metrics are within expected ranges.`;
}
