import axios from "axios";
import { WebhookConfig, WebhookPayload } from "../types/webhook";
import { jobManager } from "./job-manager";

class WebhookService {
  private async sendWebhook(
    webhookConfig: WebhookConfig,
    jobId: string,
    retryCount = 0
  ): Promise<boolean> {
    try {
      const job = await jobManager.getJob(jobId);
      if (!job) {
        console.error(`Job not found for ID: ${jobId}`);
        return false;
      }

      const payload: WebhookPayload = {
        ...job,
      };
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      await axios.post(webhookConfig.url, payload, {
        headers,
        timeout: 20000,
      });

      console.log(
        `Webhook sent successfully to ${webhookConfig.url} for job ${jobId}`
      );
      return true;
    } catch (error) {
      console.error(`Failed to send webhook to ${webhookConfig.url}:`, error);

      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWebhook(webhookConfig, jobId, retryCount + 1);
      }

      return false;
    }
  }

  async notifyJobComplete(
    jobId: string,
    webhookConfig: WebhookConfig
  ): Promise<void> {
    await this.sendWebhook(webhookConfig, jobId);
  }

  async notifyJobFailed(
    jobId: string,
    webhookConfig: WebhookConfig,
    error: string
  ): Promise<void> {
    await this.sendWebhook(webhookConfig, jobId);
  }
}

export const webhookService = new WebhookService();
