import OpenAI from "openai";
import { createReadStream } from "fs";
import { unlink } from "fs/promises";
import { MediaProcessor } from "./audio-extractor";
import { TranscriptFormatter } from "./transcript-formattor";

export class TranscriptProcessor {
  private openai: OpenAI;
  private mediaProcessor: MediaProcessor;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.mediaProcessor = new MediaProcessor();
  }

  async generateTranscript(videoPath: string) {
    try {
      // First extract audio from video
      const audioPath = await this.mediaProcessor.separateAudio(videoPath);
      // Then extract the video without audio
      const videoPathWithoutAudio =
        await this.mediaProcessor.separateVideoWithoutAudio(videoPath);

      console.log("Audio extracted:", audioPath);

      // Get transcript from Whisper API using audio
      const transcriptionResponse =
        await this.openai.audio.transcriptions.create({
          file: createReadStream(audioPath),
          model: "whisper-1",
          response_format: "verbose_json",
          timestamp_granularities: ["segment"],
        });

      // Clean up audio file
      await unlink(audioPath).catch(console.error);

      // Format transcript with timestamps
      const transcript = transcriptionResponse?.segments?.map((segment) => ({
        timestamp: segment.start,
        text: segment.text.trim(),
      }));

      if (!transcript) {
        throw new Error("Failed to generate transcript");
      }
      const maxVideoDuration = await this.mediaProcessor.getDuration(
        videoPathWithoutAudio
      );

      const xmlTranscript = TranscriptFormatter.toXML(
        transcript,
        maxVideoDuration
      );

      console.log("XML transcript:", xmlTranscript);

      // Generate summary and step breakdown
      const summary = await this.generateStructuredGuide(
        xmlTranscript,
        maxVideoDuration
      );

      return {
        transcript,
        summary,
        videoPathWithoutAudio,
        maxVideoDuration,
      };
    } catch (error) {
      console.error("Error processing transcript:", error);
      throw error;
    }
  }

  private async generateSummary(
    transcript: Array<{ timestamp: number; text: string }>
  ) {
    const transcriptText = transcript
      .map((t) => `[${this.formatTimestamp(t.timestamp)}] ${t.text}`)
      .join("\n");

    const prompt = `You are a technical documentation expert. Analyze this video transcript and create:
1. A clear, descriptive title for this tutorial
2. A concise overview of what the video teaches
3. A step-by-step breakdown of key instructions, focusing on actionable steps

The response should be technical documentation style, focusing on clear, actionable steps.

Transcript:
${transcriptText}

Respond in this JSON format:
{
  "title": "Title of the tutorial",
  "overview": "What this tutorial teaches",
  "steps": [
    {
      "time": timestamp_in_seconds,
      "description": "Clear, actionable step description"
    }
  ]
}`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(completion?.choices[0]?.message?.content || "{}");
  }

  private async generateStructuredGuide(
    xmlTranscript: string,
    videoDuration: number
  ) {
    const prompt = `You are an expert technical writer specializing in creating step-by-step guides from video transcripts. Your task is to create a clear, actionable how-to guide.

KEY REQUIREMENTS:
1. Focus on ACTIONABLE steps only
2. Each step must have a valid timestamp that exists in the transcript
3. No timestamp should exceed the video duration of ${Math.floor(
      videoDuration
    )} seconds
4. Steps should be chronological and not skip important actions
5. Each step should be a single, clear instruction
6. Use clear, direct language for instructions

Here's the transcript in XML format with precise timestamps:

${xmlTranscript}

Create a step-by-step guide using this JSON format:
{
  "title": "Clear, action-oriented title",
  "overview": "Brief description of what will be learned (max 2 sentences)",
  "steps": [
    {
      "time": timestamp_in_seconds,
      "description": "Clear, actionable instruction"
    }
  ]
}

IMPORTANT RULES:
- Each timestamp must exist within the video duration
- Steps must be in chronological order
- Each step description should start with an action verb
- Keep step descriptions concise but clear
- Include all necessary steps to achieve the goal
- Focus on the HOW rather than the WHY
- Timestamps should match significant actions in the transcript

Remember: This will be used as a practical how-to guide, so focus on actionable instructions that someone can follow along with.`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    return JSON.parse(completion.choices[0].message.content || "{}");
  }

  private formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
}
