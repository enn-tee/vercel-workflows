# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application demonstrating **real-time progress tracking** for long-running Vercel Workflows using Redis and client-side polling.

**The Core Pattern:**
```
Client (SWR) → Status API → Redis ← Progress API ← Workflow Steps
```

**Key Insight:** Workflows run in isolated execution contexts and cannot share in-memory state with your Next.js application. The solution uses Redis as a shared data store that both contexts can access.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (uses local SQLite for workflows)
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start

# Lint code
pnpm lint

# View workflow runs in web UI (during development)
npx workflow web
```

## Core Architecture

### Workflow Pattern: Client → Server Action → Workflow Engine → Polling

1. **Workflow Definitions** (`app/workflows/`)
   - Use `"use workflow"` directive to define workflows
   - Use `"use step"` directive for individual steps
   - Steps are automatically retried on failure (use `FatalError` to skip retries)
   - Use `sleep()` from `workflow` package for time-based pauses (no resource consumption)

2. **Server Actions** (`app/actions.ts`)
   - Marked with `"use server"` directive
   - Import `start` from `workflow/api` to trigger workflows
   - Validate inputs with Zod schemas before starting workflows
   - Returns `runId` for tracking workflow execution

3. **Status Polling** (`app/api/status/route.ts`)
   - GET endpoint that accepts `runId` query parameter
   - Uses `getRun(runId)` from `workflow/api` to fetch workflow state
   - Returns simplified status: "Running", "Completed", or "Failed"
   - Provides `output` when workflow completes

4. **Client Hook** (`app/hooks/useWorkflow.ts`)
   - Custom React hook using SWR for automatic polling
   - Polls every 1 second while workflow is running
   - Stops polling when status is "Completed" or "Failed"
   - Manages workflow state: status, result, progress, errors

5. **UI Components** (`app/page.tsx`)
   - Client component that consumes `useWorkflow` hook
   - Handles form submission to trigger workflows
   - Displays real-time status and results

### Key Files

- `app/workflows/report-generator.ts` - Main workflow with 3 steps (init, process, summarize) + progress tracking step
- `app/actions.ts` - Server Action to start workflows and map correlation IDs
- `app/api/status/route.ts` - Polling endpoint for workflow status (reads from Redis)
- `app/api/progress/route.ts` - API endpoint for workflow steps to store progress in Redis
- `app/hooks/useWorkflow.ts` - SWR-based polling hook (polls every 1 second)
- `app/lib/redis.ts` - Upstash Redis client and progress tracking helpers
- `app/page.tsx` - Main UI with form, progress display, and result visualization
- `next.config.ts` - Must wrap config with `withWorkflow()` from `workflow/next`
- `tsconfig.json` - Must include `workflow` plugin in plugins array

## Workflow Development

### Creating a New Workflow

```typescript
// 1. Define workflow in app/workflows/your-workflow.ts
export async function yourWorkflow(input: InputType): Promise<OutputType> {
  "use workflow";

  const stepOne = await doStepOne(input);
  const stepTwo = await doStepTwo(stepOne);
  return stepTwo;
}

// 2. Define steps with "use step"
async function doStepOne(input: InputType) {
  "use step";
  // Full Node.js access - database, APIs, etc.
  // Steps are automatically retried on unhandled errors
  return result;
}

// 3. Use sleep() for time-based delays (no resource consumption)
await sleep("5s"); // or "30m", "1h", etc.
```

### Error Handling

- **Retryable errors**: Throw regular `Error` - steps automatically retry
- **Non-retryable errors**: Throw `FatalError` from `workflow` package to skip retries

### Progress Tracking with Redis

This project uses **Upstash Redis** for real-time progress updates during workflow execution. Since workflows run in an isolated execution context (separate from the Next.js server), they cannot share in-memory state with the API routes. Redis provides a shared external storage that both contexts can access.

**How it works:**
1. Workflow calls `storeProgressInRedis()` step function to POST progress to `/api/progress`
2. Progress API endpoint stores data in Redis with 1-hour TTL
3. Status API reads progress from Redis (checks both runId and correlation ID)
4. SWR on the client polls status API every 1 second for near-real-time updates
5. When workflow completes, Redis data is cleaned up

**Key implementation details:**
- Progress tracking must use a **step function** (marked with `"use step"`) to access `fetch()`
- The workflow function itself cannot make HTTP requests directly
- Correlation IDs are generated client-side before the actual runId is known
- Redis keys use prefixes: `workflow:progress:{id}` and `workflow:mapping:{id}`

## TypeScript Configuration

- **Target**: ES2017 (required for workflow compatibility)
- **Plugins**: Must include both `next` and `workflow` plugins
- **Path aliases**: `@/*` maps to root directory

## Environment Variables

### Upstash Redis (Required for Progress Tracking)

Create a `.env.local` file in the project root with your Upstash Redis credentials:

```bash
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**Setup steps:**
1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database (free tier available)
3. Copy the **REST API** credentials from the database dashboard
4. Add them to `.env.local` (see `.env.local.example` for reference)

**Local Development**: Uses SQLite automatically for workflows when running `pnpm dev`.

**Production (Vercel)**:
- Vercel Workflows are automatically configured when deployed
- Add Upstash Redis environment variables to your Vercel project settings

## Testing Workflows

Use `npx workflow web` during development to:
- View all workflow runs
- Inspect step execution details
- See logs and timing information
- Review retry history

## Important Notes

- Workflow state is managed by Vercel Workflows (uses SQLite locally, managed service in production)
- Workflows run asynchronously in isolated execution context (separate from Next.js server)
- Steps are durable - if a step fails, it retries without re-running previous steps
- Use `"use workflow"` and `"use step"` directives exactly as shown (quoted strings)
- The `withWorkflow()` wrapper in `next.config.ts` is required for workflow compilation
- To make HTTP requests from a workflow, use a step function - global `fetch()` is not available in workflow functions

## Troubleshooting

**"EventTarget is not defined" error:**
- Don't import libraries that use browser APIs (like EventTarget) directly in workflow code
- Use API endpoints instead and call them from step functions

**"Global fetch is unavailable in workflow functions" error:**
- Move `fetch()` calls into a step function marked with `"use step"`
- Step functions have full Node.js access including `fetch()`

**Progress updates not appearing:**
- Verify Upstash Redis credentials are correct in `.env.local`
- Check that correlation ID is being passed to the workflow
- Ensure the progress step function is being called with `await`
