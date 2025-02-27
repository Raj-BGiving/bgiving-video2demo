import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ShortUniqueId from "short-unique-id";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUniqueId() {
  const { randomUUID } = new ShortUniqueId({ length: 10 });
  return randomUUID();
}


export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};