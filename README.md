# Simulated Report Generator

A demonstration application showcasing **Vercel Workflows** with client-side polling using SWR. This project implements a long-running "Data Analysis" workflow that simulates multi-step processing with visual status updates.

## Overview

This single-page Next.js application demonstrates the core pattern:

**Client-Side Polling (SWR)** → **API Route** → **Vercel Workflow Engine**

No external database required - all workflow state is managed by Vercel Workflows.

## Features

- Multi-step workflow with simulated processing (6 seconds total):
  - Step 1: Initialize analysis (2s)
  - Step 2: Process data (3s)
  - Step 3: Generate summary (1s)
- Real-time status updates via SWR polling (every 2 seconds)
- Beautiful, responsive UI with dark mode support
- Type-safe with TypeScript and Zod validation
- Server Actions for triggering workflows
- Custom React hook for workflow management

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Workflow Engine**: `workflow` (Vercel Workflows powered by Inngest)
- **Data Fetching**: `swr` (for polling)
- **Validation**: `zod`
- **Styling**: Tailwind CSS

## Project Structure

```
/app
  /api
    /status          # Polls workflow status (GET endpoint)
      route.ts
  /hooks
    useWorkflow.ts   # Custom hook with SWR polling logic
  /workflows
    report-generator.ts  # Multi-step workflow definition
  actions.ts         # Server Action to trigger workflows
  layout.tsx
  page.tsx           # Main UI component
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn/bun)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd vercel-workflows
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run the development server:
   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Local Development

When running locally with `pnpm dev`, the workflow package automatically uses a local SQLite database for development. No additional configuration or environment variables are required!

## How It Works

### 1. Workflow Definition (`app/workflows/report-generator.ts`)

The workflow is defined with three steps using the `"use workflow"` directive:

```typescript
export async function generateReport(input: ReportInput): Promise<ReportSummary> {
  "use workflow";

  const metadata = await initAnalysis(input);
  const processingResult = await processData(metadata);
  const summary = await generateSummary(processingResult);

  return { metadata, processing: processingResult, summary, completedAt: new Date().toISOString() };
}
```

Each step uses `"use step"` and `sleep()` to simulate work:

```typescript
async function processData(metadata: AnalysisMetadata): Promise<ProcessingResult> {
  "use step";
  console.log(`Processing data for report type: ${metadata.reportType}`);
  await sleep("3s");
  return { score, dataPoints };
}
```

### 2. Server Action (`app/actions.ts`)

The client triggers workflows via a Server Action:

```typescript
export async function triggerReport(email: string, reportType: string) {
  "use server";

  const run = await start(generateReport, [validationResult.data]);
  return { runId: run.id, error: null };
}
```

### 3. Status Polling (`app/api/status/route.ts`)

The API route checks run status using `getRun()`:

```typescript
export async function GET(request: Request) {
  const runId = searchParams.get("runId");
  const run = await getRun(runId);

  return NextResponse.json({
    status: run.status === "completed" ? "Completed" : "Running",
    output: run.output,
    startedAt: run.createdAt,
    endedAt: run.completedAt,
  });
}
```

### 4. Custom Hook (`app/hooks/useWorkflow.ts`)

The `useWorkflow` hook manages polling with SWR:

```typescript
export function useWorkflow() {
  const { data } = useSWR(
    currentRunId ? `/api/status?runId=${currentRunId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        // Stop polling when complete
        if (data?.status === "Completed" || data?.status === "Failed") {
          return 0;
        }
        return 2000; // Poll every 2 seconds
      },
    }
  );

  return { start, status, result, isRunning, error };
}
```

### 5. UI Component (`app/page.tsx`)

The main page provides a form and displays workflow status:

```typescript
export default function Home() {
  const { start, status, result, isRunning } = useWorkflow();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await start(email, reportType);
  };

  return (
    // Form + Status Display + Results
  );
}
```

## User Flow

1. User enters email and report type
2. User clicks "Generate Report"
3. Button changes to "Processing..."
4. Status updates to "Running" with spinner
5. After ~6 seconds, status updates to "Completed"
6. Report results are displayed with:
   - Metadata (email, report type, start time)
   - Processing results (score, data points)
   - Summary text
   - Completion timestamp

## Key Benefits

- **No Database Required**: Workflow state is managed by Vercel Workflows
- **Resilient**: Steps are retried automatically on failure
- **Observable**: Built-in logging and monitoring (use `npx workflow web`)
- **Type-Safe**: Full TypeScript support with Zod validation
- **Scalable**: Workflows run asynchronously without blocking the main app

## Development Tools

View workflow runs locally:

```bash
npx workflow web
```

This opens a web UI showing:
- All workflow runs
- Step execution details
- Logs and timing information
- Retry history

## Deployment

Deploy to Vercel:

1. Push your code to a Git repository
2. Import the project in [Vercel](https://vercel.com/new)
3. Vercel will automatically detect Next.js and configure Workflows
4. Deploy!

Vercel Workflows are automatically configured in production - no additional setup required.

## Learn More

- [Vercel Workflows Documentation](https://vercel.com/docs/workflow)
- [Next.js Documentation](https://nextjs.org/docs)
- [SWR Documentation](https://swr.vercel.app/)

## License

MIT
