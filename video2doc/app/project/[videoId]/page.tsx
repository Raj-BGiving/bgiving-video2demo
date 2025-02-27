import DocViewer from "@/app/_components/doc-viewer";
import ProjectComponent from "@/app/_components/project-component";
import { response } from "@/lib/db";
import { TProcessedVideoData } from "@/types/videoTypes";
import { fetchJobById, fetchVideoDoc } from "@/utils/queries";
import React from "react";

const ProjectPage = async ({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) => {
  const videoId = (await params).videoId;

  return (
    <main>
      <ProjectComponent videoId={videoId} />
    </main>
  );
};

export default ProjectPage;
