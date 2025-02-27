export type VideoUrlInfo = {
  url: string;
  fileName: string;
  format: string;
  downloadPath: string;
};

export type TSummaryStep = {
  timestamp: number;
  title: string;
  description: string;
};

export type TSummary = {
  title: string;
  overview: string;
  steps: TSummaryStep[];
};

export type ProcessedStep = {
  serialNumber: number;
  title: string;
  timestamp: number;
  description: string;
  framePath: string;
  videoPath: string;
  videoDuration: number;
};

export type ProcessedSplittedStep = {
  serialNumber: number;
  title: string;
  timestamp: number;
  description: string;
  mediaType: "image" | "video";
  mediaPath: string;
  videoDuration: number;
};

export type ProcessedVideo = {
  projectId: string;
  title: string;
  overview: string;
  steps: ProcessedStep[];
  transcript: Array<{
    timestamp: number;
    text: string;
  }>;
  videoDuration: number;
  splittedSteps: ProcessedSplittedStep[];
};

export type TUserChoiceBody = {
  preferredNumberOfSteps: string | "auto";
  preferredLanguage: string | "english";
  preferredTonality: string | "professional" | "personal" | "auto";
  url?: string;
  callbackUrl?: string;
  creatorInfo?: Object;
  webhookSecret?: string;
};

export type TMultiJobResponse = {
  jobId: string;
  mediaPath: string;
  status: string;
  message: string;
}[];
