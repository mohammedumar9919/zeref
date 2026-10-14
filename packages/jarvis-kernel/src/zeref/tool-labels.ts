/** Plain-English action phrase for a confirm prompt ("queue a report job"). */
export function toolLabel(name: string, args: Record<string, unknown> = {}): string {
  const str = (key: string): string | undefined => {
    const value = args[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };

  switch (name) {
    case "enqueue_job": {
      const jobType = str("jobType");
      if (jobType === "collect") return "collect your latest Instagram data";
      return jobType ? `queue a ${jobType} job` : "queue a background job";
    }
    case "request_performance_report":
      return "generate a fresh performance report";
    case "create_calendar_event": {
      const title = str("title");
      return title ? `add "${title}" to your calendar` : "add an event to your calendar";
    }
    case "vault_forget": {
      const content = str("content");
      return content ? `forget "${content}"` : "forget an item from your vault";
    }
    case "vault_pin": {
      const content = str("content");
      return content ? `pin "${content}"` : "pin that to your vault";
    }
    case "memory_save":
      return "save that to memory";
    case "memory_supersede": {
      const target = str("target");
      const content = str("content");
      if (target && content) return `replace "${target}" with "${content}"`;
      return content ? `replace that memory with "${content}"` : "replace that memory";
    }
    case "memory_archive": {
      const ids = Array.isArray(args.ids) ? args.ids.filter((id) => typeof id === "string") : [];
      const count = new Set(ids).size;
      if (count === 0) return "archive those memories";
      return `archive ${count} old ${count === 1 ? "memory" : "memories"}`;
    }
    default:
      return name.replaceAll("_", " ");
  }
}

/** Confirm prompt sentence shown in the chat and spoken by Jarvis. */
export function confirmPrompt(name: string, args: Record<string, unknown> = {}): string {
  return `Shall I ${toolLabel(name, args)}? Say yes to confirm.`;
}
