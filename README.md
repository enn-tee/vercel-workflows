# Real-Time Workflow Progress with Vercel Workflows

A Next.js application demonstrating **real-time progress tracking** for long-running Vercel Workflows using Redis and client-side polling.

## The Pattern

This project solves a common challenge: **How do you show incremental progress updates for long-running workflows when the workflow engine only exposes the final result?**

**Architecture:**
```
Client (SWR Polling) → Status API → Redis ← Progress API ← Workflow Steps
```

**Key Insight:** Workflows run in isolated execution contexts and cannot share in-memory state with your Next.js application. The solution is to use Redis as a shared data store that both contexts can access.

## Features

- ✅ **Real-time progress updates** - See workflow progress as it happens, not just the final result
- ✅ **No polling the workflow engine** - Store progress in Redis, poll your own API
- ✅ **Step-by-step visibility** - Track each workflow step's execution
- ✅ **Production-ready** - Uses Upstash Redis with auto-cleanup via TTL
- ✅ **Type-safe** - Full TypeScript with Zod validation

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Upstash Redis account (free tier available at [console.upstash.com](https://console.upstash.com))

### Installation

```bash
# Install dependencies
pnpm install

# Create .env.local with your Upstash credentials
cp .env.local.example .env.local
# Edit .env.local and add your Upstash Redis URL and token

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and test the workflow!

## How It Works

### 1. Workflow with Progress Tracking

The workflow calls a **step function** to store progress in Redis:

```typescript
export async function generateReport(input: ReportInput): Promise<ReportSummary> {
  "use workflow";

  // Update progress via step function
  await updateProgress({
    step: 1,
    totalSteps: 3,
    message: "Initializing analysis...",
    timestamp: new Date().toISOString(),
  });

  // Execute workflow step
  const metadata = await initAnalysis(input);

  await updateProgress({
    step: 1,
    totalSteps: 3,
    message: "Analysis initialized",
    timestamp: new Date().toISOString(),
  });

  // ... more steps
}

// Step function to POST progress to Redis API
async function storeProgressInRedis(runId: string, progress: ProgressUpdate) {
  "use step";

  await fetch("http://localhost:3000/api/progress", {
    method: "POST",
    body: JSON.stringify({ runId, progress }),
  });
}
```

**Why a step function?** Workflows cannot use global `fetch()` directly. Step functions have full Node.js access.

### 2. Progress API - Store in Redis

```typescript
// app/api/progress/route.ts
export async function POST(request: Request) {
  const { runId, progress } = await request.json();

  // Store in Redis with 1-hour TTL
  await setProgress(runId, progress);

  return NextResponse.json({ success: true });
}
```

### 3. Status API - Read from Redis

```typescript
// app/api/status/route.ts
export async function GET(request: Request) {
  const runId = searchParams.get("runId");
  const run = await getRun(runId);

  // Get progress from Redis (not from workflow engine)
  const progressUpdates = await getProgress(runId);

  return NextResponse.json({
    status: await run.status,
    progress: progressUpdates[progressUpdates.length - 1],
    progressHistory: progressUpdates,
  });
}
```

### 4. Client Hook with SWR Polling

```typescript
// app/hooks/useWorkflow.ts
export function useWorkflow() {
  const { data } = useSWR(
    runId ? `/api/status?runId=${runId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        // Poll every 1 second while running
        return data?.status === "Running" ? 1000 : 0;
      },
    }
  );

  return { start, status, progress, progressHistory };
}
```

### 5. UI with Real-Time Updates

```typescript
// app/page.tsx
export default function Home() {
  const { start, status, progress, progressHistory } = useWorkflow();

  return (
    <>
      {/* Progress Bar */}
      <div style={{ width: `${(progress.step / progress.totalSteps) * 100}%` }} />

      {/* Current Step Message */}
      <p>{progress.message}</p>

      {/* Progress History */}
      {progressHistory.map(update => (
        <div key={update.timestamp}>{update.message}</div>
      ))}
    </>
  );
}
```

## Project Structure

```
app/
├── actions.ts                    # Server action to trigger workflows
├── api/
│   ├── progress/route.ts        # POST endpoint - store progress in Redis
│   └── status/route.ts          # GET endpoint - read workflow status + Redis progress
├── hooks/
│   └── useWorkflow.ts           # SWR polling hook
├── lib/
│   └── redis.ts                 # Upstash Redis client + helpers
├── workflows/
│   └── report-generator.ts      # Workflow with progress tracking step
└── page.tsx                     # Main UI with real-time progress display
```

## Key Implementation Details

### Correlation IDs

The client generates a correlation ID before the workflow starts (since the actual `runId` isn't known yet):

```typescript
const correlationId = `temp_${Date.now()}_${Math.random()}`;
await triggerReport(email, reportType, correlationId);
```

The server action maps this to the real `runId` in Redis:

```typescript
const run = await start(generateReport, [input]);
await mapIds(correlationId, run.runId);
```

### Redis Keys

- Progress: `workflow:progress:{runId}`
- ID Mapping: `workflow:mapping:{actualRunId}` → `correlationId`
- TTL: 1 hour (auto-cleanup)

### Workflow Execution Context

**Critical limitation:** Workflows run in an isolated VM that doesn't have:
- Global `fetch()` - must use step functions
- Browser APIs like `EventTarget` - can't import Upstash client directly
- Shared memory with Next.js - must use external storage (Redis)

**Solution:** Use step functions (`"use step"`) which have full Node.js access to call your own APIs.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Workflow Engine**: Vercel Workflows (powered by Inngest)
- **Storage**: Upstash Redis (serverless Redis)
- **Data Fetching**: SWR (polling)
- **Validation**: Zod
- **Styling**: Tailwind CSS

## Development Tools

View workflow runs in the built-in UI:

```bash
npx workflow web
```

This shows:
- All workflow runs
- Step execution details
- Logs and timing
- Retry history

## Deployment

### Deploy to Vercel

1. Push to GitHub/GitLab/Bitbucket
2. Import in [Vercel](https://vercel.com/new)
3. Add environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy!

Vercel Workflows are automatically configured in production.

## Common Issues

### "EventTarget is not defined"

Don't import the Upstash Redis client directly in workflow code. Use an API endpoint instead.

### "Global fetch is unavailable in workflow functions"

Move `fetch()` calls into a step function:

```typescript
async function myStep() {
  "use step";
  await fetch(...); // ✅ Works in steps
}
```

### Progress not updating

1. Check Redis credentials in `.env.local`
2. Verify correlation ID is passed to workflow
3. Ensure progress step function uses `await`

## Learn More

- [Vercel Workflows](https://vercel.com/docs/workflow)
- [Upstash Redis](https://upstash.com/)
- [SWR](https://swr.vercel.app/)
- [Next.js](https://nextjs.org/docs)

## License

MIT
