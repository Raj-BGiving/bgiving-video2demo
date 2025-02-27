export type TProcessedVideoData = {
  title: string;
  overview: string;
  steps: Array<{
    description: string;
    framePath: string;
    timestamp: number;
    videoPath: string;
  }>;
  transcript: Array<{
    timestamp: number;
    text: string;
  }>;
};
