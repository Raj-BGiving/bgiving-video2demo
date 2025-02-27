import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { VideoUtils } from "@/lib/server/video-utils";
import { siteConfig } from "@/lib/config";
import { existsSync, mkdirSync } from "fs";
import { generateUniqueId } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 57;
// export const maxDuration = 300;

export async function POST(request: Request) {
  let tempPath: string | null = null;
  let sessionId: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("video") as File;

    if (!file) {
      console.error("No video file provided");
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > siteConfig.maxVideoSize) {
      console.log("Video file too large");
      return NextResponse.json(
        {
          error: `Video file too large. Maximum size is ${
            siteConfig.maxVideoSize / (1024 * 1024)
          }MB`,
        },
        { status: 400 }
      );
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!existsSync("tmp")) {
      mkdirSync("tmp");
    }

    const videoId = generateUniqueId();
    tempPath = path.join(process.cwd(), "tmp", `${videoId}.mp4`);

    await writeFile(tempPath, buffer);

    // Process video
    const videoUtils = new VideoUtils();
    const result = await videoUtils.processVideo(tempPath);

    // Convert absolute paths to relative paths for the response
    const processedResult = {
      ...result,
      steps: result.steps.map((step) => ({
        ...step,
        framePath: step.framePath.replace(process.cwd(), ""),
      })),
    };

    // Clean up temp files
    const tmpDir = path.join(process.cwd(), "public", "tmp");
    const filename = file.name;
    if (filename.split(".").pop() !== "mp4") {
      unlink(path.join(tmpDir, filename + ".mp4")).catch(console.error);
    } else {
      unlink(path.join(tmpDir, filename)).catch(console.error);
    }

    return NextResponse.json({
      videoId,
      ...processedResult,
    });
  } catch (error) {
    console.error("Error analyzing video:", error);
    return NextResponse.json(
      { error: "Failed to analyze video. Please try again." },
      { status: 500 }
    );
  } finally {
    // Clean up temp files
    // if (tempPath) {
    //   await unlink(tempPath).catch(console.error);
    // }
  }
}
