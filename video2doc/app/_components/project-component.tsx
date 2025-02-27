"use client";
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJobById, QueryKeys } from "@/utils/queries";
import DocViewer from "./doc-viewer";
import { Loader2 } from "lucide-react";

const ProjectComponent = ({ videoId }: { videoId: string }) => {
  const [isCompleted, setIsCompleted] = useState(false);

  const { data, error, isLoading } = useQuery({
    queryKey: [QueryKeys.GetJobById, videoId],
    queryFn: () => fetchJobById(videoId),
    refetchInterval: isCompleted ? false : 3000,
    enabled: !!videoId && !isCompleted,
    staleTime: 0,
  });

  useEffect(() => {
    if (data?.status === "completed") {
      setIsCompleted(true);
    }
  }, [data?.status]);

  if (isLoading) {
    return (
      <div className="flex gap-2 items-center justify-center my-8">
        <div>
          <Loader2 className="animate-spin" />
        </div>
        <span className="text-gray-600">Loading... </span>
      </div>
    );
  }

  if (
    data?.status === "failed" &&
    data?.error.includes("ffmpeg exited with code 234:")
  ) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">
          No Audio found. Please upload a video with audio.
        </p>
      </div>
    );
  }

  if (data?.status === "failed") {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{data.error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">
          Error fetching project data. Please try again later.
        </p>
      </div>
    );
  }

  if (data.status !== "completed") {
    const progress = data.progress?.progress || 0;
    const message = data.progress?.message || "Processing...";

    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium capitalize">
              {data.status}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </div>
    );
  }

  if (!data.result) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-600">No results available yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <DocViewer videoData={data.result} />
    </div>
  );
};

export default ProjectComponent;
