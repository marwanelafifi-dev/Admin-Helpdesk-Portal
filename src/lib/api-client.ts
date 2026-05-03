/** Browser-facing HTTP helpers — implementation in `./api/client`. */
export type {
  SubmitRequestOptions,
  SubmitRequestResult,
} from "./api/client"
export {
  submitRequest,
  fetchRequests,
  fetchNotifications,
  markNotificationAsRead,
} from "./api/client"
