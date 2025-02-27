import { ProcessedVideo } from "./types";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface JobProgress {
  stage: string;
  progress: number;
  message?: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  progress: JobProgress;
  result?: ProcessedVideo;
  error?: string;
  creator_info?: Object;
  created_at: string;
  updated_at: string;
}

export interface JobResponse {
  jobId: string;
  status: JobStatus;
  progress: JobProgress;
  result?: ProcessedVideo;
  error?: string;
}
