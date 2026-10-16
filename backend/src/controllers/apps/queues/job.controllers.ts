import type { Request } from "express";
import {
  enqueueDemoJob,
  getDemoJob,
  getDemoQueueMetrics,
  listDemoJobs,
} from "@/services/queue-demo.service.js";
import { ApiResponse } from "@queuekit/shared";
import { asyncHandler } from "@/utils/asyncHandler.js";
import type {
  EnqueueJobInput,
  ListJobsQueryInput,
} from "@/validators/apps/queues/job.validators.js";

const enqueueJob = asyncHandler(async (req: Request, res) => {
  const queue = String(req.params.queue);
  const body = req.body as EnqueueJobInput;
  const job = await enqueueDemoJob(queue, body);
  return res
    .status(201)
    .json(new ApiResponse(201, { job }, "Job enqueued successfully"));
});

const listJobs = asyncHandler(async (req, res) => {
  const queue = String(req.params.queue);
  const query = req.query as unknown as ListJobsQueryInput;
  const jobs = await listDemoJobs(queue, query);
  return res
    .status(200)
    .json(new ApiResponse(200, { jobs, queue }, "Jobs listed successfully"));
});

const getJob = asyncHandler(async (req, res) => {
  const queue = String(req.params.queue);
  const jobId = String(req.params.jobId);
  const job = await getDemoJob(queue, jobId);
  return res
    .status(200)
    .json(new ApiResponse(200, { job }, "Job fetched successfully"));
});

const getMetrics = asyncHandler(async (req, res) => {
  const queue = String(req.params.queue);
  const metrics = await getDemoQueueMetrics(queue);
  return res
    .status(200)
    .json(
      new ApiResponse(200, { metrics }, "Queue metrics fetched successfully")
    );
});

export { enqueueJob, listJobs, getJob, getMetrics };
