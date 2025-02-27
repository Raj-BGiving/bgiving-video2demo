import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { VideoUrlInfo } from "../utils/types";

const execAsync = promisify(exec);

export async function downloadYoutubeVideo(
  url: string,
  outputDir: string
): Promise<VideoUrlInfo> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Define the user agent string with proper escaping
  const userAgent = "'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'";
  
  try {
    // Construct command with proper escaping
    const cookiesPath = path.join(process.cwd(), "yt-cookies.txt");
    const infoCommand = [
      "yt-dlp",
      `--cookies "${cookiesPath}"`,
      `--user-agent ${userAgent}`,
      "--sleep-interval 2",
      "--max-sleep-interval 5",
      "--no-check-certificates",
      "--geo-bypass",
      '--print "%(title)s"',
      "--get-format",
      `"${url}"`
    ].join(" ");

    // First get the video info
    const { stdout: videoInfo } = await execAsync(infoCommand);
    const [title, format] = videoInfo.trim().split("\n");

    if (!title) {
      throw new Error("Could not retrieve video title");
    }

    // Create a safe filename from the title
    const safeTitle = title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()
      .substring(0, 50);
    const fileName = `${safeTitle}-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, fileName);

    // Construct download command with proper escaping
    const downloadCommand = [
      "yt-dlp",
      `--cookies "${cookiesPath}"`,
      `--user-agent ${userAgent}`,
      "--sleep-interval 2",
      "--max-sleep-interval 5",
      "--no-check-certificates",
      "--geo-bypass",
      '-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"',
      '--merge-output-format mp4',
      `--output "${outputPath}"`,
      '--progress',
      '--no-warnings',
      '--retries 3',
      `"${url}"`
    ].join(" ");

    await execAsync(downloadCommand);

    // Verify the file exists after download
    if (!fs.existsSync(outputPath)) {
      throw new Error("Video file was not created after download");
    }

    return {
      url,
      fileName,
      format: "mp4",
      downloadPath: outputPath,
    };
  } catch (error: any) {
    console.error("Download error:", error);
    
    // Enhanced error handling
    let errorMessage = "Failed to download video";
    
    if (error.stderr?.includes("Sign in to confirm you're not a bot")) {
      errorMessage = "YouTube bot detection triggered. Please ensure valid cookies are provided";
    } else if (error.stderr?.includes("Video unavailable")) {
      errorMessage = "The video is unavailable or private";
    } else if (error.stderr?.includes("This video is only available for registered users")) {
      errorMessage = "This video requires authentication";
    } else if (error.message) {
      errorMessage = `Failed to download video: ${error.message}`;
    }

    throw new Error(errorMessage);
  }
}

// Helper function to validate cookies
export async function validateCookies(): Promise<boolean> {
  try {
    const cookiesPath = path.join(process.cwd(), "yt-cookies.txt");
    if (!fs.existsSync(cookiesPath)) {
      return false;
    }
    
    // Try to fetch a known public video to verify cookies
    const userAgent = "'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'";
    const command = [
      "yt-dlp",
      `--cookies "${cookiesPath}"`,
      `--user-agent ${userAgent}`,
      "--simulate",
      '"https://www.youtube.com/watch?v=dQw4w9WgXcQ"'
    ].join(" ");
    
    await execAsync(command);
    return true;
  } catch (error) {
    console.error("Cookie validation error:", error);
    return false;
  }
}

export async function refreshCookies(): Promise<void> {
  try {
    const browserName = 'chrome'; // or 'firefox', 'edge', 'opera', 'brave', 'vivaldi'
    const command = `yt-dlp --cookies-from-browser ${browserName} > yt-cookies.txt`;
    await execAsync(command);
  } catch (error) {
    console.error("Failed to refresh cookies:", error);
    throw error;
  }
}