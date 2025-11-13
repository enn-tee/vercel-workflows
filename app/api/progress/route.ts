import { NextResponse } from "next/server";
import { setProgress, type ProgressData } from "@/app/lib/redis";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { runId, progress } = body as { runId: string; progress: ProgressData };

    if (!runId || !progress) {
      return NextResponse.json(
        { error: "runId and progress are required" },
        { status: 400 }
      );
    }

    await setProgress(runId, progress);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error storing progress:", error);
    return NextResponse.json(
      { error: "Failed to store progress" },
      { status: 500 }
    );
  }
}
