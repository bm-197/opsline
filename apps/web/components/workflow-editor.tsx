"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ExprField } from "@/components/expr-field";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/cn";
import {
  availableExpressions,
  blankStep,
  STEP_TYPE_LABELS,
  type DraftStep,
  type DraftWorkflow,
  type ExprGroup,
} from "@/lib/workflow-draft";
import { createWorkflow, publishVersion } from "@/lib/workflow-actions";

const STEP_TYPES = Object.keys(STEP_TYPE_LABELS) as DraftStep["type"][];

const inputCls =
  "w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus-visible:border-faint";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-geist text-xs text-faint">{label}</span>
      {children}
    </label>
  );
}

export function WorkflowEditor({
  mode,
  slug,
  initial,
  editable = true,
}: {
  mode: "create" | "edit";
  slug?: string;
  initial: DraftWorkflow;
  editable?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<DraftWorkflow>(initial);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [doneSlug, setDoneSlug] = useState<string | null>(null);

  const patchStep = (key: string, patch: Partial<DraftStep>) =>
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }));
  const addStep = (type: DraftStep["type"]) =>
    setDraft((d) => ({ ...d, steps: [...d.steps, blankStep(type)] }));
  const removeStep = (key: string) =>
    setDraft((d) => ({ ...d, steps: d.steps.filter((s) => s.key !== key) }));
  const moveStep = (index: number, dir: -1 | 1) =>
    setDraft((d) => {
      const steps = [...d.steps];
      const to = index + dir;
      if (to < 0 || to >= steps.length) return d;
      [steps[index], steps[to]] = [steps[to]!, steps[index]!];
      return { ...d, steps };
    });

  const publish = () =>
    start(async () => {
      setError(null);
      const result =
        mode === "create"
          ? await createWorkflow(draft)
          : await publishVersion(slug!, draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.webhookSecret) {
        setSecret(result.webhookSecret);
        setDoneSlug(result.slug);
      } else {
        router.push(`/workflows/${result.slug}`);
        router.refresh();
      }
    });

  if (secret && doneSlug) {
    return (
      <main className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Webhook secret
        </h1>
        <GlassCard className="flex flex-col gap-3 p-5">
          <p className="text-sm text-muted">
            Copy this signing secret now. It is shown only once.
          </p>
          <code className="overflow-x-auto rounded-xl bg-butter px-3 py-2 font-geist text-xs break-all">
            {secret}
          </code>
          <Button
            onClick={() => {
              router.push(`/workflows/${doneSlug}`);
              router.refresh();
            }}
          >
            Done
          </Button>
        </GlassCard>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "create" ? "New workflow" : "Edit workflow"}
        </h1>
        <Button disabled={pending || !editable} onClick={publish}>
          {pending
            ? "Publishing"
            : mode === "create"
              ? "Create workflow"
              : "Publish version"}
        </Button>
      </div>

      {!editable && (
        <GlassCard tint="blush" className="p-4 text-sm text-muted">
          This workflow uses a branch, which the form editor cannot edit yet.
          Publish a new version through the API to change it.
        </GlassCard>
      )}

      <GlassCard className="flex flex-col gap-3 p-5">
        <Field label="Name">
          <input
            className={inputCls}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Supplier invoice approval"
          />
        </Field>
        <Field label="Description (optional)">
          <input
            className={inputCls}
            value={draft.description ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, description: e.target.value }))
            }
          />
        </Field>
      </GlassCard>

      <div className="flex flex-col gap-3">
        <span className="font-geist text-xs text-faint">Steps</span>
        <p className="text-xs text-muted">
          Text fields accept {"{{ }}"} expressions. Use the {"{ }"} button to
          insert a reference to the trigger payload or an earlier step{"’"}s
          output.
        </p>
        {draft.steps.length === 0 && (
          <p className="text-sm text-muted">
            No steps yet. Add one below; they run top to bottom.
          </p>
        )}
        <ol className="flex flex-col gap-3">
          {draft.steps.map((step, i) => (
            <li key={step.key}>
              <GlassCard className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-geist text-sm">
                    {i + 1}. {STEP_TYPE_LABELS[step.type]}
                  </span>
                  <div className="flex items-center gap-1">
                    <IconButton
                      label="Move up"
                      onClick={() => moveStep(i, -1)}
                      disabled={i === 0}
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      label="Move down"
                      onClick={() => moveStep(i, 1)}
                      disabled={i === draft.steps.length - 1}
                    >
                      ↓
                    </IconButton>
                    <IconButton
                      label="Remove"
                      onClick={() => removeStep(step.key)}
                    >
                      ✕
                    </IconButton>
                  </div>
                </div>
                <StepFields
                  step={step}
                  groups={availableExpressions(draft.steps, i)}
                  onChange={(p) => patchStep(step.key, p)}
                />
              </GlassCard>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          {STEP_TYPES.map((type) => (
            <Button
              key={type}
              variant="secondary"
              size="sm"
              onClick={() => addStep(type)}
            >
              + {STEP_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
      </div>

      <GlassCard className="flex flex-col gap-3 p-5">
        <span className="font-geist text-xs text-faint">Triggers</span>
        <p className="text-sm text-muted">
          Manual runs are always available. Add a schedule or a webhook to run
          it automatically.
        </p>
        <Field label="Cron schedule (optional, UTC)">
          <input
            className={inputCls}
            value={draft.cron}
            onChange={(e) => setDraft((d) => ({ ...d, cron: e.target.value }))}
            placeholder="0 8 * * *"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.webhookEnabled}
            onChange={(e) =>
              setDraft((d) => ({ ...d, webhookEnabled: e.target.checked }))
            }
          />
          Enable inbound webhook trigger
        </label>
      </GlassCard>

      {error && <p className="text-sm text-blush-deep">{error}</p>}
    </main>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-7 place-items-center rounded-lg text-sm text-muted transition-colors hover:bg-line/60 hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function StepFields({
  step,
  groups,
  onChange,
}: {
  step: DraftStep;
  groups: ExprGroup[];
  onChange: (patch: Partial<DraftStep>) => void;
}) {
  const num = (v: string) => (v === "" ? undefined : Number(v));
  const advancedRetry = (
    <details className="rounded-xl border border-line px-3 py-2">
      <summary className="cursor-pointer font-geist text-xs text-faint">
        Advanced
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <Field label="Max attempts (default 3)">
          <input
            type="number"
            className={inputCls}
            value={step.maxAttempts ?? ""}
            onChange={(e) => onChange({ maxAttempts: num(e.target.value) })}
          />
        </Field>
        <Field label="Backoff delay ms (default 1000)">
          <input
            type="number"
            className={inputCls}
            value={step.backoffDelayMs ?? ""}
            onChange={(e) => onChange({ backoffDelayMs: num(e.target.value) })}
          />
        </Field>
        {step.type === "http_request" && (
          <Field label="Timeout ms (default 30000)">
            <input
              type="number"
              className={inputCls}
              value={step.timeoutMs ?? ""}
              onChange={(e) => onChange({ timeoutMs: num(e.target.value) })}
            />
          </Field>
        )}
      </div>
    </details>
  );

  const labelField = (
    <Field label="Label (optional)">
      <input
        className={inputCls}
        value={step.name ?? ""}
        onChange={(e) => onChange({ name: e.target.value })}
      />
    </Field>
  );

  if (step.type === "http_request") {
    return (
      <>
        {labelField}
        <div className="flex gap-2">
          <select
            className={cn(inputCls, "max-w-32")}
            value={step.method}
            onChange={(e) =>
              onChange({ method: e.target.value as DraftStep["method"] })
            }
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <div className="flex-1">
            <ExprField
              value={step.url ?? ""}
              onChange={(url) => onChange({ url })}
              groups={groups}
              placeholder="https://api.example.com/thing"
            />
          </div>
        </div>
        {advancedRetry}
      </>
    );
  }
  if (step.type === "delay") {
    return (
      <>
        {labelField}
        <Field label="Duration (ms)">
          <input
            type="number"
            className={inputCls}
            value={step.durationMs ?? 0}
            onChange={(e) => onChange({ durationMs: num(e.target.value) ?? 0 })}
          />
        </Field>
      </>
    );
  }
  if (step.type === "human_approval") {
    return (
      <>
        {labelField}
        <Field label="Prompt">
          <ExprField
            value={step.prompt ?? ""}
            onChange={(prompt) => onChange({ prompt })}
            groups={groups}
            placeholder="Approve this?"
          />
        </Field>
        <Field label="Timeout ms (optional)">
          <input
            type="number"
            className={inputCls}
            value={step.timeoutMs ?? ""}
            onChange={(e) => onChange({ timeoutMs: num(e.target.value) })}
          />
        </Field>
      </>
    );
  }
  if (step.type === "send_email") {
    return (
      <>
        {labelField}
        <Field label="To">
          <ExprField
            value={step.to ?? ""}
            onChange={(to) => onChange({ to })}
            groups={groups}
            placeholder="ops@example.com"
          />
        </Field>
        <Field label="Subject">
          <ExprField
            value={step.subject ?? ""}
            onChange={(subject) => onChange({ subject })}
            groups={groups}
          />
        </Field>
        <Field label="Body">
          <ExprField
            value={step.body ?? ""}
            onChange={(body) => onChange({ body })}
            groups={groups}
            multiline
          />
        </Field>
        {advancedRetry}
      </>
    );
  }
  return (
    <>
      {labelField}
      <Field label="Slack webhook URL">
        <ExprField
          value={step.webhookUrl ?? ""}
          onChange={(webhookUrl) => onChange({ webhookUrl })}
          groups={groups}
          placeholder="https://hooks.slack.com/services/..."
        />
      </Field>
      <Field label="Message">
        <ExprField
          value={step.text ?? ""}
          onChange={(text) => onChange({ text })}
          groups={groups}
        />
      </Field>
      {advancedRetry}
    </>
  );
}
