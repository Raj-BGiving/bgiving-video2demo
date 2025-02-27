export type WebhookPayload = {
  jobId: string;
  status: "completed" | "failed";
  error?: string;
};

export type ResponseWithError<T> = {
  error?: string;
} & T;

export type VideoProcessResponse = {
  jobId: string;
  message: string;
  status: string;
};

export type Job = {
  jobId: string;
  status: "processing" | "completed" | "failed";
  progress: {
    stage: string;
    message: string;
    progress: number;
  };
  result: any;
  error: string;
  message?: string;
};
