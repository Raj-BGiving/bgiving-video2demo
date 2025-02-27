# Video2Docs API Documentation

This API service processes videos (from file upload or URL) and generates transcripts, summaries, and step-by-step guides with screenshots.

## Authentication

All API endpoints require Bearer token authentication.

```typescript
const headers = {
  authorization: `Bearer sk_lpqazwsxedcrfvtgbyhnujmikolp`,
};
```

## API Endpoints

### 1. Process Video from File Upload

**Endpoint:** `POST /api/v1/with-file`

```typescript
// NextJS Example

const formData = new FormData();
formData.append("video", file);
formData.append(
  "callbackUrl",
  `${window.location.origin}/api/webhook/video-process`
);
formData.append("preferredNumberOfSteps", "auto"); // set required fields
formData.append("preferredLanguage", "english"); // set required fields
formData.append("preferredTonality", "auto"); // set required fields
formData.append("creatorInfo", JSON.stringify({...})); // set stringified JSON

const response = await fetch(`/api/v1/with-file`, {
  method: "POST",
  body: formData,
  headers: {
    authorization: `Bearer sk_lpqazwsxedcrfvtgbyhnujmikolp`,
  },
});

if (!response.ok) {
  throw new Error("Failed to analyze video");
}

const data = await response.json();
```

**Response:**

```json
{
  "jobId": "unique-session-id",
  "status": "processing",
  "message": "Processing started"
}
```

### 2. Process Video from URL

**Endpoint:** `POST /api/v1/with-url`

```typescript
// NextJS Example
import axios from "axios";

interface TUserChoiceBody {
  preferredNumberOfSteps: string | "auto";
  preferredLanguage: string | "english";
  preferredTonality: string | "professional" | "personal" | "auto";
  url: string;
  callbackUrl?: string; // Optional
  creatorInfo?: Object; // Optional (In JSON format)
}

const body: TUserChoiceBody = {
  // Add required fields
};

async function processVideoUrl(url: string, callbackUrl?: string) {
  const response = await fetch("/api/v1/with-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer sk_lpqazwsxedcrfvtgbyhnujmikolp`,
    },
    body: JSON.stringify({
      ...body,
    }),
  });

  return response.data; // Returns { jobId, status, message }
}
```

**Response:**

```json
{
  "jobId": "unique-session-id",
  "status": "processing",
  "message": "Processing started"
}
```

### 3. Process Multiple Videos from URLs

**Endpoint:** `POST /api/v1/with-multi-urls`

```typescript
// NextJS Example
import axios from "axios";

interface TUserChoiceBody {
  preferredNumberOfSteps: string | "auto";
  preferredLanguage: string | "english";
  preferredTonality: string | "professional" | "personal" | "auto";
  urls: string[]; // Array of video URLs
  callbackUrl?: string; // Optional
  creatorInfo?: Object; // Optional (In JSON format)
}

interface TMultiJobResponse {
  jobId: string;
  status: string;
  message: string;
}

const body: TUserChoiceBody = {
  urls: [
    "https://www.youtube.com/watch?v=video1",
    "https://www.loom.com/share/video2",
    // ... more URLs
  ],
  preferredNumberOfSteps: "auto",
  preferredLanguage: "english",
  preferredTonality: "auto",
  callbackUrl: "https://your-domain.com/webhook", // Optional
  creatorInfo: { ... }, // Optional (In JSON format)
};

async function processMultipleVideoUrls(body: TUserChoiceBody) {
  const response = await fetch("/api/v1/with-multi-urls", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer sk_lpqazwsxedcrfvtgbyhnujmikolp`,
    },
    body: JSON.stringify(body),
  });

  return response.json(); // Returns array of TMultiJobResponse
}
```

**Response:**

```json
{
  "jobIds": [
    {
      "jobId": "job-id-1",
      "mediaPath": "https://www.youtube.com/watch?v=video1",
      "status": "processing",
      "message": "Processing started"
    },
    {
      "jobId": "job-id-2",
      "mediaPath": "https://www.loom.com/share/video2",
      "status": "processing",
      "message": "Processing started"
    },
    {
      "jobId": "job-id-3",
      "mediaPath": "https://www.youtube.com/watch?v=video3",
      "status": "processing",
      "status": "processing",
      "message": "Processing started"
    }
  ],
  "message": "Processing started for valid URLs"
}
```

Each object in the response array corresponds to a video URL in the same order as the input, containing the job ID, status, and processing message. You can use these job IDs with the `/job/:jobId` endpoint to check the status of each video processing job individually.

### 4. Check Job Status

**Endpoint:** `GET /api/v1/job/:jobId`

```typescript
// NextJS Example
import axios from "axios";

async function checkJobStatus(jobId: string) {
  const response = await axios.get(`YOUR_API_URL/api/v1/job/${jobId}`, {
    headers: {
      Authorization: `Bearer ${YOUR_API_KEY}`,
    },
  });

  return response.data;
}
```

**Response:**

```json
{
  "jobId": "unique-session-id",
  "status": "completed",
  "progress": {
    "stage": "processing_video",
    "progress": 100,
    "message": "Video processed"
  },
  "result": {
    "projectId": "unique-session-id",
    "title": "Video Title",
    "overview": "Video Overview",
    "videoDuration": 1234,
    "steps": [
      {
        "timestamp": 1234,
        "title": "Step title",
        "description": "Step description",
        "framePath": "path/to/frame.jpg",
        "videoPath": "path/to/clip.mp4",
        "serialNumber": 1
      }
    ],
    "transcript": [
      {
        "timestamp": 1234,
        "text": "Transcribed text"
      }
    ],
    "splittedSteps": [
      {
        "title": "Step 1 title",
        "mediaPath": "Media (video) path of this (step 1) step",
        "mediaType": "video",
        "timestamp": 10,
        "description": "Step description",
        "serialNumber": 1,
        "videoDuration": 6
      },
      {
        "title": "Step 1 title",
        "mediaPath": "Media (image) path of this (step 1) step",
        "mediaType": "image",
        "timestamp": 10,
        "description": "Step description",
        "serialNumber": 1,
        "videoDuration": 6
      }
      // ...
    ]
  }
}
```

### 5. Merge Steps

**Endpoint:** `POST /api/v1/merge-steps`

- Sample Request Body:

```json
{
  "steps": [
    {
      "title": "Step title",
      "framePath": "https://d1poalkxwk2s2e.cloudfront.net/EE9ibv7c0n/frames/frame_10.jpg",
      "timestamp": 10,
      "videoPath": "https://d1poalkxwk2s2e.cloudfront.net/EE9ibv7c0n/videos/video_10.mp4",
      "description": "Navigate to the Setup menu, select Project Management, then Job Types.",
      "serialNumber": 1,
      "videoDuration": 6
    },
    {
      "title": "Step title",
      "framePath": "https://d1poalkxwk2s2e.cloudfront.net/EE9ibv7c0n/frames/frame_19.jpg",
      "timestamp": 19,
      "videoPath": "https://d1poalkxwk2s2e.cloudfront.net/EE9ibv7c0n/videos/video_19.mp4",
      "description": "Click on 'Add' to start creating a new Job Type.",
      "serialNumber": 2,
      "videoDuration": 6
    }
  ], // Array of consecutive steps
  "projectId": "EE9ibv7c0n" // Optional, if not provided, it will be extracted from the first step
}
```

- Sample Response:

```json
{
  "serialNumber": 1,
  "timestamp": 10,
  "title": "Step title",
  "description": "Navigate to the Setup menu, select Project Management, then Job Types.",
  "framePath": "https://d1poalkxwk2s2e.cloudfront.net/EE9ibv7c0n/frames/frame_10.jpg",
  "projectId": "EE9ibv7c0n",
  "videoPath": "https://d1poalkxwk2s2e.cloudfront.net/EE9ibv7c0n/merged/10_19_21_28_33_41.mp4",
  "videoDuration": 6
}
```

## File Size Limits

- Maximum file size for upload: 50MB
- Supported video sources: Loom and YouTube URLs

## Webhook Integration

When providing a `callbackUrl`, the API will send POST requests to your endpoint with job updates. Here's an example using Next.js App Router:

```typescript
// /api/webhook/video-process
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

interface WebhookPayload {
  jobId: string;
  status: "processing" | "completed" | "failed";
  progress?: {
    stage: string;
    progress: number;
    message: string;
  };
  result?: {
    projectId: string;
    title: string;
    overview: string;
    steps: Array<{
      timestamp: number;
      description: string;
      framePath: string;
      videoPath: string;
    }>;
    transcript: Array<{
      timestamp: number;
      text: string;
    }>;
  };
  videoDuration: number;
  creator_info: Object;
  created_at: string;
  updated_at: string;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const webhookPayload = (await req.json()) as WebhookPayload;
    console.log("Webhook payload:", webhookPayload);

    // Verify webhook secret if provided
    if (webhookPayload.status === "completed") {
      // Job is complete, result is available in webhookPayload.result
      // You can also fetch the latest job status if needed:
      // Handle the completed job...
    } else if (webhookPayload.status === "failed") {
      // Handle job failure
      console.error("Job failed:", webhookPayload.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
```
