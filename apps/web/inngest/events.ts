import {
  approvalDecidedData,
  runCanceledData,
  runRequestedData,
  APPROVAL_DECIDED,
  RUN_CANCELED,
  RUN_REQUESTED,
} from "@opsline/core";
import { eventType } from "inngest";

export const runRequested = eventType(RUN_REQUESTED, {
  schema: runRequestedData,
});

export const approvalDecided = eventType(APPROVAL_DECIDED, {
  schema: approvalDecidedData,
});

export const runCanceled = eventType(RUN_CANCELED, {
  schema: runCanceledData,
});
