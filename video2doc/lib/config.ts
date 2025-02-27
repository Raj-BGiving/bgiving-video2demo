export const siteConfig = {
  name: "Video2Docs",
  description: "Convert videos into usable and interactive how-to guides",
  maxVideoSize: 100 * 1024 * 1024, // 100MB
  maxVideoDuration: 30 * 60, // 30 minutes in seconds
  supportedVideoFormats: ["mp4", "mov", "mkv", "webm", "avi"],
  supportedVideoSources: ["local", "youtube", "loom"],
  ai: {
    openai: {
      model: process.env.OPENAI_API_MODEL || "gpt-4-vision-preview",
      maxTokens: 4096,
    },
    groq: {
      model: "llama-3.2-90b-vision-preview",
      maxTokens: 8192,
    },
  },
  processing: {
    frameExtractionInterval: 1000, // Extract frame every 1 second
    maxFramesPerVideo: 1000, // Maximum frames to process
    minFrameDifferenceThreshold: 0.15, // Minimum difference between frames to consider it a new step
  },
} as const;

export type SiteConfig = typeof siteConfig;
