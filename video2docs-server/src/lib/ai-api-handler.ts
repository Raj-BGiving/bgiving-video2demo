import OpenAI from "openai";
import Groq from "groq-sdk";
import { createReadStream } from "fs";
import { aiModels } from "../utils/ai-models";

export class AIApiHandler {
  private openai: OpenAI;
  private groq: Groq;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async generateOpenAITextCompletion(
    prompts: {
      systemPrompt: string;
      userPrompt: string;
    },
    model: string
  ): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: prompts.systemPrompt },
        { role: "user", content: prompts.userPrompt },
      ],
      temperature: 0.2,
      response_format: {
        type: "text",
      },
    });
    return completion.choices[0].message.content?.trim() ?? "";
  }

  async generateOpenAIJSONCompletion(
    prompts: {
      systemPrompt: string;
      userPrompt: string;
    },
    model: string
  ): Promise<
    OpenAI.Chat.Completions.ChatCompletion & {
      _request_id?: string | null;
    }
  > {
    const completion = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: prompts.systemPrompt },
        { role: "user", content: prompts.userPrompt },
      ],
      temperature: 0.2,
      response_format: {
        type: "json_object",
      },
    });
    return completion;
  }

  async generateGroqAITextCompletion(
    prompts: {
      systemPrompt: string;
      userPrompt: string;
    },
    model: string
  ): Promise<string> {
    const chatCompletion = await this.groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: prompts.systemPrompt,
        },
        {
          role: "user",
          content: prompts.userPrompt,
        },
      ],
      model: model,
      temperature: 0.3,
      max_tokens: 2048,
      stream: false,
      stop: null,
    });

    return chatCompletion.choices[0].message.content?.trim() ?? "";
  }

  async generateGroqAIWhisperTranscript(audioPath: string): Promise<string> {
    const transcriptionResponse = await this.groq.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: aiModels.groq_models.WHISPER_LARGE_V3,
      response_format: "verbose_json",
    });

    const transcript = transcriptionResponse?.text;

    return transcript ?? "";
  }

  async generateOpenAIWhisperTranscript(audioPath: string): Promise<
    OpenAI.Audio.Transcriptions.TranscriptionVerbose & {
      _request_id?: string | null;
    }
  > {
    const transcriptionResponse = await this.openai.audio.transcriptions.create(
      {
        file: createReadStream(audioPath),
        model: aiModels.openai_models.WHISPER_1,
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      }
    );

    return transcriptionResponse;
  }
}
