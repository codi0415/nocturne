export const coreMessages = {
  "route.lighterFirst": "Something lighter first. {task} is next.",
  "route.transfer": "The other {min} of {task} changes to the {at} train.",
  "route.updated": "Route updated. {task} moves up while you're sharp.",
  "route.delay": "A signal change gives {task} {min} more minutes.",
  "route.reopened": "Service remains tonight. The line is open again.",
  "route.skipped": "{task} waits for another train.",
} as const;
export type CoreMessageKey = keyof typeof coreMessages;
