import { TProcessedVideoData } from "@/types/videoTypes";
import { createClient } from "./supabase/client";
import { Job, ResponseWithError, VideoProcessResponse } from "@/types/general";

export enum QueryKeys {
  GetAllJobs = "getAllJobs",
  GetJobById = "getJob",
  GetVideoDoc = "getVideoDoc",
  GetRecentJobs = "getRecentJobs",
}

const API_BASE_URL = "https://chatgptexperts.co/api/v1";
const LOCAL_BASE_URL = "http://localhost:8080/api/v1";
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE_URL;

export const addVideoDocToDB = async (
  videoId: string,
  videoData: TProcessedVideoData
) => {
  const supabase = createClient();
  const { title, overview, steps, transcript } = videoData;

  const { data, error } = await supabase.from("video_doc").insert([
    {
      project_id: videoId,
      title,
      overview,
      steps,
      transcript,
    },
  ]);

  if (error) {
    console.error("Error inserting video doc:", error);
    return;
  }

  console.log("Video doc inserted successfully:", data);
};

export const fetchVideoDoc = async (videoId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("video_doc")
    .select("*")
    .eq("project_id", videoId)
    .single();

  if (error) {
    console.error("Error fetching video doc:", error);
    return;
  } else {
    return data;
  }
};

export const createNewV2DWithFile = async (
  formData: FormData
): Promise<ResponseWithError<VideoProcessResponse>> => {
  const response = await fetch(`${BASE_URL}/with-file`, {
    method: "POST",
    body: formData,
    headers: {
      authorization: `Bearer sk_lpqazwsxedcrfvtgbyhnujmikolp`,
    },
  });

  if (!response.ok) {
    const errorData = await response.text();
    const errorObject = JSON.parse(errorData);
    return errorObject;
  }

  return await response.json();
};

export const createNewV2DWithUrl = async (
  videoUrl: string
): Promise<ResponseWithError<VideoProcessResponse>> => {
  const response = await fetch(`${BASE_URL}/with-url`, {
    method: "POST",
    body: JSON.stringify({ url: videoUrl }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer sk_lpqazwsxedcrfvtgbyhnujmikolp`,
    },
  });

  if (!response.ok) {
    const errorData = await response.text();
    const errorObject = JSON.parse(errorData);
    return errorObject;
  }

  return await response.json();
};

export const fetchJobById = async (
  jobId: string
): Promise<ResponseWithError<Job>> => {
  const response = await fetch(`${BASE_URL}/job/${jobId}`, {
    headers: {
      Authorization: `Bearer sk_lpqazwsxedcrfvtgbyhnujmikolp`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch job");
  }

  return await response.json();
};

export const fetchRecentJobs = async () => {
  const response = await fetch(`${BASE_URL}/get-all-jobs?limit=12`, {
    headers: {
      Authorization: `Bearer sk_lpqazwsxedcrfvtgbyhnujmikolp`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch jobs");
  }

  return await response.json();
};
