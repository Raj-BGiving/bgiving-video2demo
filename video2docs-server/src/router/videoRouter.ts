import express, { Request, Response } from "express";
import multer from "multer";

import { Router } from "express";

import { checkAuth, checkFileOkay } from "../middleware";

import { fileController } from "../controller/file-controller";
import { urlController } from "../controller/url-controller";
import { multiUrlController } from "../controller/multi-url-controller";
import { jobManager } from "../services/job-manager";
import { mergeStepsController } from "../controller/merge-steps-controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  dest: "uploads/",
  limits: {
    fileSize: 15 * 1024 * 1024 * 1024, // 15GB
  },
});

router.route("/test").get((req: Request, res: Response) => {
  res
    .status(200)
    .json({ version: "2.5", message: "Test route with Auth working" });
});

router
  .route("/with-file")
  .post(upload.single("video"), checkAuth, checkFileOkay, fileController);

router.route("/with-url").post(checkAuth, urlController);

router.route("/with-multi-urls").post(checkAuth, multiUrlController);

router.route("/merge-steps").post(checkAuth, mergeStepsController);

///////
///////Job routes
///////

router.get("/job/:jobId", async (req: Request, res: Response): Promise<any> => {
  const { jobId } = req.params;
  const job = await jobManager.getJob(jobId);

  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  const response = {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error,
  };

  res.status(200).json(response);
});

router.get(
  "/get-all-jobs",
  async (req: Request, res: Response): Promise<any> => {
    const limit = parseInt(req.query.limit as string) || 5;
    const jobs = await jobManager.getAllJobs(limit);
    res.status(200).json(jobs);
  }
);

export default router;
