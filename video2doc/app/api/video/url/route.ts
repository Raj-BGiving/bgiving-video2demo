import { NextRequest, NextResponse } from "next/server";
import path from "path";
import {
  validateVideoUrl,
  downloadYoutubeVideo,
  VideoUrlInfo,
} from "@/lib/server/youtube-url-processor";
import { downloadLoomVideo } from "@/lib/server/loom-url-processor";
import { unlinkSync } from "fs";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: "Video URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    const urlType = await validateVideoUrl(url);
    if (urlType === "none") {
      return NextResponse.json(
        { error: "Invalid video URL. Only YouTube URLs are supported." },
        { status: 400 }
      );
    }

    const tmpDir = path.join(process.cwd(), "public", "tmp");

    let videoInfo: VideoUrlInfo;

    if (urlType === "youtube") {
      videoInfo = await downloadYoutubeVideo(url, tmpDir);
    } else if (urlType === "loom") {
      videoInfo = await downloadLoomVideo(url, tmpDir);
    } else {
      return NextResponse.json(
        { error: "Failed to process video URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      videoInfo: {
        ...videoInfo,
        downloadPath: `/tmp/${path.basename(videoInfo.downloadPath)}`,
      },
    });
  } catch (error) {
    console.error("Error processing video URL:", error);
    return NextResponse.json(
      { error: "Failed to process video URL" },
      { status: 500 }
    );
  }
}
