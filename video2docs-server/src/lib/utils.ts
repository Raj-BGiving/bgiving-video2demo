import ShortUniqueId from "short-unique-id";
import { ProcessedStep } from "../utils/types";

export function generateUniqueId() {
  const { randomUUID } = new ShortUniqueId({ length: 10 });
  return randomUUID();
}

export function checkValidConsecutiveSteps(steps: ProcessedStep[]): boolean {
  return steps.every(
    (step, index) =>
      index === 0 || step.serialNumber === steps[index - 1].serialNumber + 1
  );
}

export function extractProjectId(url: string): string | null {
  // Split the URL by forward slashes
  const parts = url.split("/");
  if (parts.length >= 4) {
    return parts[3];
  }

  // If the array structure doesn't match our expectation, return null
  return null;
}
