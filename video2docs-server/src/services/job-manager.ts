import { Job, JobProgress, JobStatus } from "../utils/job-types";
import { ProcessedVideo } from "../utils/types";
import { createClient } from "@supabase/supabase-js";
import { config } from "../config";

class JobManager {
  private supabase;

  constructor() {
    if (!config.supabase.url || !config.supabase.anonKey) {
      throw new Error(
        "Supabase configuration is missing. Please check your .env file."
      );
    }

    this.supabase = createClient(config.supabase.url, config.supabase.anonKey);
  }

  async createJob(jobId: string, creatorInfo?: Object): Promise<Job> {
    const now = new Date().toISOString();
    const job: Job & { created_at: string; updated_at: string } = {
      id: jobId,
      status: "pending",
      progress: {
        stage: "initialized",
        progress: 0,
      },
      creator_info: creatorInfo || {},
      created_at: now,
      updated_at: now,
    };

    const { error } = await this.supabase.from("jobs").insert({
      id: job.id,
      status: job.status,
      progress: job.progress,
      creator_info: job.creator_info,
      created_at: job.created_at,
      updated_at: job.updated_at,
    });

    if (error) {
      console.error("Error creating job:", error);
      throw error;
    }

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      created_at: job.created_at,
      updated_at: job.updated_at,
    };
  }

  async updateJobProgress(jobId: string, progress: JobProgress): Promise<void> {
    const { error } = await this.supabase
      .from("jobs")
      .update({
        progress,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) {
      console.error("Error updating job progress:", error);
      throw error;
    }
  }

  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    result?: ProcessedVideo,
    error?: string
  ): Promise<void> {
    const { error: updateError } = await this.supabase
      .from("jobs")
      .update({
        status,
        result,
        error,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("Error updating job status:", updateError);
      throw updateError;
    }
  }

  async getAllJobs(limit = 5): Promise<Job[]> {
    const { data, error } = await this.supabase
      .from("jobs")
      .select(
        "id, status, progress, created_at, updated_at, creator_info, error"
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("Error getting jobs:", error);
      throw error;
    }
    return data;
  }

  async getJob(jobId: string): Promise<Job | null> {
    const { data, error } = await this.supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error) {
      console.error("Error getting job:", error);
      throw error;
    }

    if (data) {
      return data;
    }

    return null;
  }

  async cleanupOldJobs(maxAgeHours: number = 24): Promise<void> {
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    const { error } = await this.supabase
      .from("jobs")
      .delete()
      .lt("updated_at", cutoffDate.toISOString());

    if (error) {
      console.error("Error cleaning up old jobs:", error);
      throw error;
    }
  }
}

export const jobManager = new JobManager();
