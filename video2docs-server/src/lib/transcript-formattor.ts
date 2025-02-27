interface TranscriptSegment {
  timestamp: number;
  text: string;
}

export class TranscriptFormatter {
  static toXML(transcript: TranscriptSegment[], videoDuration: number): string {
    // First, validate and clean timestamps
    const cleanTranscript = transcript
      .map((segment) => ({
        ...segment,
        timestamp: Math.min(segment.timestamp, videoDuration),
        text: segment.text.trim(),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Format duration in MM:SS
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Create XML structure
    const xmlParts = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<transcript>",
      `  <metadata>`,
      `    <duration>${formatTime(videoDuration)}</duration>`,
      `    <segment_count>${cleanTranscript.length}</segment_count>`,
      `  </metadata>`,
      "  <segments>",
    ];

    // Add each segment
    cleanTranscript.forEach((segment, index) => {
      xmlParts.push(
        "    <segment>",
        `      <index>${index + 1}</index>`,
        `      <timestamp>${formatTime(segment.timestamp)}</timestamp>`,
        `      <seconds>${segment.timestamp}</seconds>`,
        `      <text>${this.escapeXML(segment.text)}</text>`,
        "    </segment>"
      );
    });

    xmlParts.push("  </segments>", "</transcript>");

    return xmlParts.join("\n");
  }

  private static escapeXML(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  static extractSteps(
    gptResponse: any,
    videoDuration: number
  ): Array<{ time: number; description: string }> {
    try {
      const steps = gptResponse.steps;
      return steps
        .map((step: { time: number; description: string }) => ({
          time: Math.min(Math.max(0, step.time), videoDuration),
          description: step.description.trim(),
        }))
        .sort((a: { time: number }, b: { time: number }) => a.time - b.time)
        .filter(
          (
            step: { time: number; description: string },
            index: number,
            self: any[]
          ) =>
            // Remove duplicates and invalid steps
            step.description &&
            (index === 0 || step.time !== self[index - 1].time)
        );
    } catch (error) {
      console.error("Error extracting steps:", error);
      return [];
    }
  }
}
