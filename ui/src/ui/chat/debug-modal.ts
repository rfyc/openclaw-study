import { html, nothing } from "lit";
import type { GatewayBrowserClient } from "../gateway.ts";

export type DebugFrame = { direction: "out" | "in"; ts: number; data: unknown };

export type DebugModalState = {
  open: boolean;
  loading: boolean;
  events: unknown[];
  error: string | null;
};

type CaptureEvent = {
  kind?: string;
  direction?: string;
  method?: string;
  host?: string;
  path?: string;
  status?: number;
  contentType?: string;
  body?: unknown;
  flowId?: string;
};

export async function loadDebugCaptureEvents(client: GatewayBrowserClient | null): Promise<{
  events: unknown[];
  error: string | null;
}> {
  if (!client) {
    return { events: [], error: "Gateway not connected" };
  }
  try {
    const result = (await client.request("debug.capture.recent", { limit: 100 })) as {
      enabled: boolean;
      events?: unknown[];
    };
    if (!result.enabled) {
      return { events: [], error: "Debug proxy not enabled. Set OPENCLAW_DEBUG_PROXY_ENABLED=1" };
    }
    return { events: result.events ?? [], error: null };
  } catch (err) {
    return { events: [], error: err instanceof Error ? err.message : String(err) };
  }
}

function parseSseChunks(text: string): unknown | null {
  const lines = text.split(/\r?\n/);
  const dataLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data:")) {
      const value = trimmed.slice(5).trim();
      if (value && value !== "[DONE]") {
        dataLines.push(value);
      }
    }
  }
  if (dataLines.length === 0) {
    return null;
  }

  let mergedContent = "";
  let mergedRole = "";
  let lastFinishReason: string | null = null;
  let lastId = "";
  let lastModel = "";
  const toolCalls: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }> = [];

  for (const line of dataLines) {
    try {
      const chunk = JSON.parse(line) as Record<string, unknown>;
      if (chunk.id) lastId = String(chunk.id);
      if (chunk.model) lastModel = String(chunk.model);
      const choices = chunk.choices as Array<Record<string, unknown>> | undefined;
      if (choices && choices.length > 0) {
        const choice = choices[0];
        const delta = choice.delta as Record<string, unknown> | undefined;
        if (delta) {
          if (typeof delta.role === "string" && !mergedRole) {
            mergedRole = delta.role;
          }
          if (typeof delta.content === "string") {
            mergedContent += delta.content;
          }
          const tc = delta.tool_calls as Array<Record<string, unknown>> | undefined;
          if (tc) {
            for (const t of tc) {
              const idx = typeof t.index === "number" ? t.index : toolCalls.length;
              const existing = toolCalls[idx];
              const fn = t.function as Record<string, unknown> | undefined;
              if (!existing) {
                toolCalls[idx] = {
                  id: String(t.id ?? ""),
                  type: String(t.type ?? "function"),
                  function: {
                    name: String(fn?.name ?? ""),
                    arguments: String(fn?.arguments ?? ""),
                  },
                };
              } else {
                if (fn?.name) existing.function.name += String(fn.name);
                if (fn?.arguments) existing.function.arguments += String(fn.arguments);
              }
            }
          }
        }
        if (typeof choice.finish_reason === "string") {
          lastFinishReason = choice.finish_reason;
        }
      }
    } catch {
      // skip unparseable line
    }
  }

  const message: Record<string, unknown> = {
    role: mergedRole || "assistant",
    content: mergedContent,
  };
  if (toolCalls.length > 0) {
    message.tool_calls = toolCalls;
  }
  const result: Record<string, unknown> = {
    id: lastId,
    model: lastModel,
    choices: [
      {
        index: 0,
        message,
        finish_reason: lastFinishReason,
      },
    ],
  };
  return result;
}

function formatBody(event: CaptureEvent): string {
  if (event.body == null) {
    return "";
  }
  if (typeof event.body === "string") {
    const ct = event.contentType ?? "";
    const looksLikeSse = ct.includes("event-stream") || event.body.trim().startsWith("data:");
    if (looksLikeSse) {
      const merged = parseSseChunks(event.body);
      if (merged) {
        return JSON.stringify(merged, null, 2);
      }
    }
    try {
      const parsed = JSON.parse(event.body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return event.body;
    }
  }
  try {
    return JSON.stringify(event.body, null, 2);
  } catch {
    return String(event.body);
  }
}

function renderEventCard(event: CaptureEvent, index: number) {
  const isRequest = event.kind === "request";
  const url = `${event.method ?? "POST"} ${event.host ?? ""}${event.path ?? ""}`;
  const statusLabel = isRequest ? url : `${event.status ?? ""} ${url}`;
  const borderColor = isRequest ? "#2196f3" : "#4caf50";
  const labelBg = isRequest ? "#e3f2fd" : "#e8f5e9";
  const labelColor = isRequest ? "#1565c0" : "#2e7d32";
  const tagText = isRequest ? "REQUEST" : "RESPONSE";
  const bodyStr = formatBody(event);

  return html`
    <details
      ?open=${index < 2}
      style="
        border-left: 3px solid ${borderColor};
        margin-bottom: 12px;
        background: #fff;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        overflow: hidden;
      "
    >
      <summary
        style="
          padding: 8px 12px;
          background: ${labelBg};
          color: ${labelColor};
          font-size: 11px;
          font-weight: 600;
          font-family: 'SF Mono', monospace;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          list-style: none;
          user-select: none;
        "
      >
        <span
          style="
            background: ${borderColor};
            color: #fff;
            padding: 1px 6px;
            border-radius: 3px;
            font-size: 10px;
          "
          >${tagText}</span
        >
        <span>${statusLabel}</span>
      </summary>
      ${bodyStr
        ? html`<pre
            style="
              margin: 0;
              padding: 10px 12px;
              font-size: 12px;
              line-height: 1.5;
              white-space: pre-wrap;
              word-break: break-all;
              font-family: 'SF Mono', 'Fira Code', monospace;
              color: #1a1a1a;
              max-height: 500px;
              overflow: auto;
            "
          >
${bodyStr}</pre
          >`
        : html`<p style="margin: 0; padding: 8px 12px; color: #999; font-size: 12px;">No body</p>`}
    </details>
  `;
}

export function renderDebugModal(params: {
  open: boolean;
  frames: DebugFrame[];
  captureEvents: unknown[];
  captureLoading: boolean;
  captureError: string | null;
  onClose: () => void;
}) {
  if (!params.open) {
    return nothing;
  }

  const events = (params.captureEvents as CaptureEvent[]).filter((e) => e.body != null);

  return html`
    <openclaw-modal-dialog label="Debug - LLM Raw Payloads" @modal-cancel=${params.onClose}>
      <div
        style="
          background: #ffffff;
          color: #1a1a1a;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          max-height: calc(100dvh - 96px);
          width: min(900px, calc(100vw - 48px));
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        "
      >
        <div
          style="
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding: 8px 16px;
            border-bottom: 1px solid #e0e0e0;
          "
        >
          <button class="btn btn--sm" @click=${params.onClose} style="font-size: 12px;">
            Close
          </button>
        </div>
        <div style="overflow: auto; padding: 12px 16px; flex: 1; background: #f5f5f5;">
          ${params.captureLoading
            ? html`<p style="margin: 0; color: #666;">Loading...</p>`
            : params.captureError
              ? html`<p style="margin: 0; color: #d32f2f;">${params.captureError}</p>`
              : events.length === 0
                ? html`<p style="margin: 0; color: #666;">
                    No LLM request body captured. Send a message first.
                  </p>`
                : events.map((event, i) => renderEventCard(event, i))}
        </div>
      </div>
    </openclaw-modal-dialog>
  `;
}
