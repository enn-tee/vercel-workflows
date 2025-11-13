# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application demonstrating **Vercel Workflows** (powered by Inngest) with client-side polling using SWR. The app simulates a multi-step "Report Generator" workflow with real-time status updates.

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

- `app/workflows/report-generator.ts` - Main workflow with 3 steps (init, process, summarize)
- `app/workflows/user-signup.ts` - Example workflow showing error handling patterns
- `app/actions.ts` - Server Action to start workflows
- `app/api/status/route.ts` - Polling endpoint for workflow status
- `app/hooks/useWorkflow.ts` - SWR-based polling hook
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

### Progress Tracking

Build progress arrays in the workflow and return them in the output. The status API extracts progress from `run.returnValue` when completed.

## TypeScript Configuration

- **Target**: ES2017 (required for workflow compatibility)
- **Plugins**: Must include both `next` and `workflow` plugins
- **Path aliases**: `@/*` maps to root directory

## Environment Variables

**Local Development**: No configuration needed - uses SQLite automatically when running `pnpm dev`.

**Production (Vercel)**: Vercel Workflows are automatically configured when deployed. No manual setup required.

## Testing Workflows

Use `npx workflow web` during development to:
- View all workflow runs
- Inspect step execution details
- See logs and timing information
- Review retry history

## Important Notes

- No external database required - workflow state is managed by Vercel Workflows
- Workflows run asynchronously and don't block the main application
- Steps are durable - if a step fails, it retries without re-running previous steps
- Use `"use workflow"` and `"use step"` directives exactly as shown (quoted strings)
- The `withWorkflow()` wrapper in `next.config.ts` is required for workflow compilation
