import { Router } from "express";
import {
  enqueueJob,
  getJob,
  getMetrics,
  listJobs,
} from "@/controllers/apps/queues/job.controllers.js";
import { createJobSubmissionRateLimiter } from "@/middlewares/rateLimit.middlewares.js";
import { validate } from "@/validators/validate.js";
import {
  enqueueJobSchema,
  jobIdParamSchema,
  listJobsQuerySchema,
  queueNameParamSchema,
} from "@/validators/apps/queues/job.validators.js";

const router = Router({ mergeParams: true });
const jobSubmissionLimiter = createJobSubmissionRateLimiter();

router
  .route("/:queue/jobs")
  .get(
    validate(queueNameParamSchema, "params"),
    validate(listJobsQuerySchema, "query"),
    listJobs
  )
  .post(
    jobSubmissionLimiter,
    validate(queueNameParamSchema, "params"),
    validate(enqueueJobSchema),
    enqueueJob
  );

router
  .route("/:queue/jobs/:jobId")
  .get(validate(jobIdParamSchema, "params"), getJob);

router
  .route("/:queue/metrics")
  .get(validate(queueNameParamSchema, "params"), getMetrics);

export default router;
