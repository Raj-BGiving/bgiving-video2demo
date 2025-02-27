import { Job } from "../utils/job-types";

export type WebhookPayload = Omit<Job, "created_at" | "updated_at">;

export interface WebhookConfig {
  url: string;
  secret?: string;
}
