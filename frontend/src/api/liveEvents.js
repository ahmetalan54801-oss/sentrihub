import { getStoredAuth } from "./client";

const API_BASE =
  import.meta.env.VITE_API_BASE !== undefined
    ? import.meta.env.VITE_API_BASE
    : "http://localhost:8000";

/**
 * Subscribes to the backend's SSE event stream. Uses fetch + a readable
 * stream (not the native EventSource) because EventSource cannot send the
 * Authorization header our Basic-auth backend requires.
 * Returns an unsubscribe function.
 */
export function subscribeLiveEvents(onEvent) {
  const encoded = getStoredAuth();
  const controller = new AbortController();

  async function run() {
    try {
      const res = await fetch(`${API_BASE}/api/events/stream`, {
        headers: encoded ? { Authorization: `Basic ${encoded}` } : {},
        signal: controller.signal,
      });
      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            onEvent(JSON.parse(line.slice(6)));
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } catch {
      // aborted or connection dropped - caller can resubscribe if needed
    }
  }

  run();
  return () => controller.abort();
}
