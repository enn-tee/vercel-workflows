import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client
// For local development, you can use Upstash Redis Console to get credentials
// For production, set these as environment variables in Vercel
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Helper functions for workflow progress tracking
export interface ProgressData {
  step: number;
  totalSteps: number;
  message: string;
  timestamp: string;
}

const PROGRESS_KEY_PREFIX = "workflow:progress:";
const PROGRESS_TTL = 3600; // 1 hour TTL for progress data

/**
 * Store a progress update for a workflow run
 */
export async function setProgress(runId: string, progress: ProgressData): Promise<void> {
  const key = `${PROGRESS_KEY_PREFIX}${runId}`;
  try {
    // Get existing progress array
    const existing = await redis.get<ProgressData[]>(key) || [];
    // Append new progress
    existing.push(progress);
    // Store with TTL
    await redis.setex(key, PROGRESS_TTL, existing);
  } catch (error) {
    console.error("Failed to store progress in Redis:", error);
    // Don't throw - progress tracking shouldn't break the workflow
  }
}

/**
 * Get all progress updates for a workflow run
 */
export async function getProgress(runId: string): Promise<ProgressData[]> {
  const key = `${PROGRESS_KEY_PREFIX}${runId}`;
  try {
    const progress = await redis.get<ProgressData[]>(key);
    return progress || [];
  } catch (error) {
    console.error("Failed to get progress from Redis:", error);
    return [];
  }
}

/**
 * Clear progress data for a workflow run
 */
export async function clearProgress(runId: string): Promise<void> {
  const key = `${PROGRESS_KEY_PREFIX}${runId}`;
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Failed to clear progress from Redis:", error);
  }
}

/**
 * Map a correlation ID to an actual run ID
 * This allows the workflow to store progress under a client-generated ID
 * before the actual runId is known
 */
export async function mapIds(correlationId: string, actualRunId: string): Promise<void> {
  const mappingKey = `workflow:mapping:${actualRunId}`;
  try {
    await redis.setex(mappingKey, PROGRESS_TTL, correlationId);
  } catch (error) {
    console.error("Failed to map IDs in Redis:", error);
  }
}

/**
 * Get the correlation ID for a run ID (if it exists)
 */
export async function getCorrelationId(runId: string): Promise<string | null> {
  const mappingKey = `workflow:mapping:${runId}`;
  try {
    return await redis.get<string>(mappingKey);
  } catch (error) {
    console.error("Failed to get correlation ID from Redis:", error);
    return null;
  }
}
