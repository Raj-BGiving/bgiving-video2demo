"use client";

import { formatTime } from "@/lib/utils";
import { TProcessedVideoData } from "@/types/videoTypes";
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Video, Image } from "lucide-react";
import { cn } from "@/lib/utils";

const DocViewer = ({ videoData }: { videoData: TProcessedVideoData }) => {
  const [showStepVideo, setShowStepVideo] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const sortedSteps =
    videoData?.steps.sort((a, b) => a.timestamp - b.timestamp) || [];

  const handlePrevStep = () => {
    setCurrentStepIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNextStep = () => {
    setCurrentStepIndex((prev) =>
      prev < sortedSteps.length - 1 ? prev + 1 : prev
    );
  };

  if (!videoData) return null;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="pb-6 mb-4">
        <h1 className="text-3xl font-bold mb-3 text-slate-900 dark:text-slate-100">
          {videoData.title}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-lg">
          {videoData.overview}
        </p>
      </div>

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        {sortedSteps.length > 0 && (
          <>
            <div className="space-y-6 px-6">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevStep}
                    disabled={currentStepIndex === 0}
                    className={cn(
                      "p-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all",
                      currentStepIndex === 0 && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <span className="text-xl font-medium">
                    Step {currentStepIndex + 1} of {sortedSteps.length}
                  </span>

                  <button
                    onClick={handleNextStep}
                    disabled={currentStepIndex === sortedSteps.length - 1}
                    className={cn(
                      "p-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all",
                      currentStepIndex === sortedSteps.length - 1 &&
                        "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={() => setShowStepVideo(!showStepVideo)}
                  className="px-4 py-2 flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  {showStepVideo ? (
                    <Image className="w-4 h-4" />
                  ) : (
                    <Video className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-lg text-slate-700 dark:text-slate-200 leading-relaxed mb-6">
                {sortedSteps[currentStepIndex].description}
              </p>

              {sortedSteps[currentStepIndex].framePath && (
                <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  {showStepVideo && sortedSteps[currentStepIndex].videoPath ? (
                    <video
                      src={sortedSteps[currentStepIndex].videoPath.replace(
                        "public/",
                        "/"
                      )}
                      autoPlay
                      loop
                      muted
                      className="object-contain w-full h-full"
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img
                      src={sortedSteps[currentStepIndex].framePath.replace(
                        "public/",
                        "/"
                      )}
                      alt={`Frame at ${formatTime(
                        sortedSteps[currentStepIndex].timestamp
                      )}`}
                      className="object-contain w-full h-full"
                    />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DocViewer;
