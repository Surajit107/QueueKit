export { apiRequest } from '@/lib/api/client'
export type { ApiRequestOptions } from '@/lib/api/client'
export { buildApiUrl, resolveApiBaseUrl } from '@/lib/api/config'
export { getErrorMessage } from '@/lib/api/error-message'
export { ApiClientError, isApiClientError } from '@/lib/api/errors'
export type { ApiClientErrorKind } from '@/lib/api/errors'
export {
  mapSystemStatusToView,
  type ServiceHealth,
  type ServiceRow,
  type StatusViewModel,
} from '@/lib/api/map-status'
export {
  createDemoKey,
  deleteDemoKey,
  getDemoKey,
  listDemoKeys,
  parseCacheAsideDemoResult,
  parseDemoKeyDeleteResult,
  parseDemoKeyList,
  parseDemoKeyRecord,
  parseRateLimitDenial,
  parseRateLimitDemoResult,
  runCacheAsideDemo,
  runRateLimitDemo,
  type CacheAsideDemoInput,
  type CacheAsideDemoResult,
  type CreateDemoKeyInput,
  type DemoKeyDeleteResult,
  type DemoKeyList,
  type DemoKeyRecord,
  type RateLimitDemoInput,
  type RateLimitDemoResult,
} from '@/lib/api/redis'
export {
  buildPubSubEventsUrl,
  listPubSubChannels,
  parsePubSubChannelsResponse,
  parsePubSubPublishResult,
  parsePubSubSseMessage,
  publishPubSubMessage,
  type PubSubChannelsResponse,
  type PubSubPublishInput,
  type PubSubPublishResult,
  type PubSubSseMessage,
} from '@/lib/api/pubsub'
export {
  buildJobEventsUrl,
  JOB_SSE_TYPES,
  parseJobSsePayload,
  type JobSseEventType,
  type JobSsePayload,
} from '@/lib/api/events'
export {
  defaultDemoQueue,
  enqueueQueueJob,
  getQueueJob,
  getQueueMetrics,
  isDemoJobType,
  listQueueJobs,
  parseJobEnvelope,
  parseJobList,
  parseJobView,
  parseMetricsEnvelope,
  parseQueueMetrics,
  type EnqueueJobInput,
  type JobState,
  type JobView,
  type QueueMetrics,
} from '@/lib/api/queues'
export {
  parseDemoResetResult,
  resetDemoResources,
  type DemoResetResult,
} from '@/lib/api/reset'
export { fetchSystemStatus, parseSystemStatus } from '@/lib/api/status'
