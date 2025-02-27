"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createNewV2DWithFile, createNewV2DWithUrl } from "@/utils/queries";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

type ResultData = {
  videoId: string;
  success: boolean;
  title: string;
  overview: string;
  steps: Array<{
    timestamp: number;
    framePath: string;
    description: string;
    videoPath: string;
  }>;
  transcript: Array<{
    timestamp: number;
    text: string;
  }>;
};

type VideoUrlInfo = {
  url: string;
  fileName: string;
  format: string;
  downloadPath: string;
};

export function VideoUploader({
  onAnalysisComplete,
}: {
  onAnalysisComplete?: (data: ResultData) => void;
}) {
  const [result, setResult] = useState<ResultData | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlState, setUrlState] = useState<
    "download" | "process" | "done" | "error" | "idle"
  >("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const router = useRouter();

  const createNewV2DWithFileMutation = useMutation({
    mutationFn: async (data: { formData: FormData }) => {
      return await createNewV2DWithFile(data.formData);
    },
  });

  const createNewV2DWithUrlMutation = useMutation({
    mutationFn: async (data: { videoUrl: string }) => {
      return await createNewV2DWithUrl(data.videoUrl);
    },
  });

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && file.size > 50 * 1024 * 1024) {
      toast.error("File size exceeds 50MB limit");
      return;
    }
    if (!file) return;
    setSelectedFile(file);
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("video", selectedFile);
    formData.append(
      "callbackUrl",
      `${window.location.origin}/api/webhook/video-process`
    );

    try {
      createNewV2DWithFileMutation.mutate(
        { formData },
        {
          onSuccess: async (data) => {
            if (data.error) {
              console.log(data.message);
              toast.error(data.message);
              return;
            }
            if (!data.jobId) {
              toast.error("Failed to create job");
              return;
            }
            router.push(`/project/${data.jobId}`);
          },
        }
      );
    } catch (error) {
      console.error("Error analyzing video:", error);
      alert("Failed to analyze video. Please try again.");
    }
  };

  const handleUrlSubmit = async () => {
    if (!videoUrl) return;

    setUrlError(null);
    setUrlState("download");

    try {
      createNewV2DWithUrlMutation.mutate(
        { videoUrl },
        {
          onSuccess: async (data) => {
            console.log(data);
            if (data.error) {
              setUrlError(data.error);
              setUrlState("error");
              return;
            }

            setUrlState("done");
            router.push(`/project/${data.jobId}`);
          },
        }
      );
    } catch (error: any) {
      console.error("Error processing video:", error);
      setUrlError(
        error.message || "Failed to process video. Please try again."
      );
      setUrlState("error");
    } finally {
      setVideoUrl("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload a Video or paste a Video URL</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="local" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local">Local Upload</TabsTrigger>
            <TabsTrigger value="url">Video URL (YouTube or Loom)</TabsTrigger>
          </TabsList>

          <TabsContent value="local" className="mt-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleFileSelect}
                    id="video-input"
                  />
                  <Button
                    onClick={() =>
                      document.getElementById("video-input")?.click()
                    }
                    variant="outline"
                    className="w-full"
                    disabled={createNewV2DWithFileMutation.isPending}
                  >
                    Choose Video File
                  </Button>
                </div>
                <Button
                  onClick={handleProcessFile}
                  disabled={
                    !selectedFile || createNewV2DWithFileMutation.isPending
                  }
                  className="min-w-[120px]"
                >
                  {createNewV2DWithFileMutation.isPending ? (
                    <span>Uploading...</span>
                  ) : (
                    <span>Upload</span>
                  )}
                </Button>
              </div>
              {selectedFile && (
                <div className="text-sm text-muted-foreground">
                  Selected file: {selectedFile.name}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-4">
            <div className="space-y-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Enter YouTube or Loom video URL"
                  className="flex-1 px-3 py-1 border rounded-md"
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    setUrlError(null);
                  }}
                  disabled={createNewV2DWithUrlMutation.isPending}
                />
                <Button
                  onClick={handleUrlSubmit}
                  disabled={!videoUrl || createNewV2DWithUrlMutation.isPending}
                >
                  {urlState === "download"
                    ? "Downloading..."
                    : urlState === "process"
                    ? "Processing..."
                    : "Analyze"}
                </Button>
              </div>
              {urlError && <p className="text-sm text-red-500">{urlError}</p>}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
