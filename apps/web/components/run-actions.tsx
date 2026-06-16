"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  cancelRunAction,
  decideApprovalAction,
  retryRunAction,
  triggerWorkflow,
} from "@/lib/actions";

export function TriggerButton({
  slug,
  size = "md",
}: {
  slug: string;
  size?: "sm" | "md";
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      size={size}
      disabled={pending}
      onClick={() => start(() => triggerWorkflow(slug))}
    >
      {pending ? "Starting" : "Run now"}
    </Button>
  );
}

export function CancelButton({ runId }: { runId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() => start(() => cancelRunAction(runId))}
    >
      {pending ? "Canceling" : "Cancel run"}
    </Button>
  );
}

export function RetryButton({ runId }: { runId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() => start(() => retryRunAction(runId))}
    >
      {pending ? "Retrying" : "Retry from failed step"}
    </Button>
  );
}

export function ApprovalForm({
  stepRunId,
  runId,
}: {
  stepRunId: string;
  runId: string;
}) {
  const [pending, start] = useTransition();
  const [comment, setComment] = useState("");

  const decide = (decision: "approved" | "rejected") =>
    start(() => decideApprovalAction({ stepRunId, runId, decision, comment }));

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment (optional)"
        rows={2}
        className="w-full resize-none rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus-visible:border-faint"
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => decide("approved")}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => decide("rejected")}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
