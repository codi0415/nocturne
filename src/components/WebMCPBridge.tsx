"use client";
import { useEffect } from "react";
import { useNocturne } from "@/store/useNocturne";
import { parseQuickAdd } from "@/core/quickadd";
import type { DateKey, Task } from "@/core/types";

type WebMCPContext = {
  registerTool(
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute(input: unknown): unknown;
    },
    options: { signal: AbortSignal },
  ): void | Promise<void>;
};
export function WebMCPBridge() {
  const addTask = useNocturne((s) => s.addTask);
  const lines = useNocturne((s) => s.data.lines);
  useEffect(() => {
    const context = (document as Document & { modelContext?: WebMCPContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: "add_study_task",
          title: "Add study task",
          description:
            "Parse a clear study-task phrase and add it to tonight's local Nocturne route.",
          inputSchema: {
            type: "object",
            properties: { text: { type: "string", minLength: 1 } },
            required: ["text"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          execute(input) {
            if (
              !input ||
              typeof input !== "object" ||
              !("text" in input) ||
              typeof input.text !== "string" ||
              !input.text.trim()
            )
              throw new Error("text is required");
            const now = new Date(),
              iso = now.toISOString();
            const today =
              `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}` as DateKey;
            const parsed = parseQuickAdd(input.text, iso, lines);
            const minutes = parsed.duration ?? 45;
            const task: Task = {
              id: `webmcp-${now.getTime()}`,
              title: parsed.title,
              description: "",
              deadline: parsed.deadline,
              estimatedMinutes: minutes,
              userEstimatedMinutes: null,
              remainingMinutes: minutes,
              interest: 3,
              difficulty: 3,
              importance: parsed.importance ?? 3,
              splittable: true,
              minSessionMinutes: 15,
              maxSessionMinutes: 50,
              recurrence: parsed.recurrence,
              status: "active",
              lineId: parsed.lineId,
              createdAt: iso,
              updatedAt: iso,
              completedAt: null,
            };
            addTask(task, today, iso);
            return {
              taskId: task.id,
              title: task.title,
              minutes,
              deadline: task.deadline,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [addTask, lines]);
  return null;
}
