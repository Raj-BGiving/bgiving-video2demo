import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";

export class S3Utils {
  private s3Client: S3Client;
  private bucket: string;
  private cloudFrontDomain: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
    this.bucket = process.env.AWS_S3_BUCKET || "";
    this.cloudFrontDomain = process.env.CF_DOMAIN || "";
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<string> {
    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        },
      });

      await upload.done();
      return `${this.cloudFrontDomain}/${key}`;
    } catch (error) {
      console.error("Error uploading to S3:", error);
      throw error;
    }
  }

  async uploadStream(
    stream: Readable,
    key: string,
    contentType: string
  ): Promise<string> {
    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: stream,
          ContentType: contentType,
        },
      });

      await upload.done();
      return `${this.cloudFrontDomain}/${key}`;
    } catch (error) {
      console.error("Error uploading stream to S3:", error);
      throw error;
    }
  }
}
