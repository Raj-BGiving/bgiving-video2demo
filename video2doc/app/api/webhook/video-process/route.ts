import { WebhookPayload } from "@/types/general";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const webhookPayload = (await req.json()) as WebhookPayload;

    console.log("Webhook payload:", webhookPayload);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error processing video URL:", error);
    return NextResponse.json(
      { error: "Failed to process video URL" },
      { status: 500 }
    );
  }
}
