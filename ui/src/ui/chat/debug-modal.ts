import { html, nothing, type TemplateResult } from "lit";
import type { GatewayBrowserClient } from "../gateway.ts";

export type DebugFrame = { direction: "out" | "in"; ts: number; data: unknown };

type CaptureEvent = {
  kind?: string;
  method?: string;
  host?: string;
  path?: string;
  status?: number;
  contentType?: string;
  body?: unknown;
  flowId?: string;
};

export async function loadDebugCaptureEvents(
  client: GatewayBrowserClient | null,
  debugSessionId?: string,
): Promise<{ events: unknown[]; error: string | null }> {
  if (!client) return { events: [], error: "Gateway not connected" };
  try {
    const result = (await client.request("debug.capture.recent", {
      limit: 100,
      ...(debugSessionId ? { debugSessionId } : {}),
    })) as { enabled: boolean; events?: unknown[] };
    if (!result.enabled) return { events: [], error: "Debug proxy not enabled" };
    return { events: result.events ?? [], error: null };
  } catch (err) {
    return { events: [], error: err instanceof Error ? err.message : String(err) };
  }
}

function renderPrimitive(value: string | number | boolean | null): TemplateResult {
  if (value === null) return html`<span style="color: #757575; font-style: italic;">null</span>`;
  if (typeof value === "boolean") return html`<span style="color: #6a1b9a;">${value}</span>`;
  if (typeof value === "number") return html`<span style="color: #1565c0;">${value}</span>`;
  // string with newline support
  if (value.includes("\n")) {
    return html`<span style="color: #2e7d32;"
      >"<span style="white-space: pre-wrap;">${value}</span>"</span
    >`;
  }
  return html`<span style="color: #2e7d32;">"${value}"</span>`;
}

function renderMessagePreview(value: unknown): TemplateResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return nothing;
  const obj = value as Record<string, unknown>;
  const role = obj.role;
  const content = obj.content;
  if (typeof role !== "string") return nothing;

  let preview = "";
  if (typeof content === "string") {
    preview = content.length > 80 ? content.slice(0, 80) + "…" : content;
  } else if (Array.isArray(content)) {
    preview = content
      .map((part) => {
        if (typeof part === "object" && part !== null) {
          const p = part as Record<string, unknown>;
          const t = typeof p.type === "string" ? p.type : "?";
          const text =
            typeof p.text === "string"
              ? p.text.length > 50
                ? p.text.slice(0, 50) + "…"
                : p.text
              : "";
          return `[${t}: ${text}]`;
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  } else if (content == null) {
    preview = "";
  } else {
    preview = "{…}";
  }

  return html`<span style="color: #999; margin-left: 8px;"
    >${role}: <span style="color: #666;">${preview}</span></span
  >`;
}

function renderJsonNode(value: unknown, key?: string, depth = 0, isLast = true): TemplateResult {
  const comma = isLast ? nothing : html`<span style="color: #ccc;">,</span>`;

  // Primitives
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    const keyPart =
      key !== undefined
        ? html`<span style="color: #c62828; font-weight: 600;">"${key}"</span>: `
        : nothing;
    return html`<span
      >${keyPart}${renderPrimitive(value as string | number | boolean | null)}${comma}</span
    >`;
  }

  // Objects and arrays
  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(value as Record<string, unknown>);
  const isEmpty = entries.length === 0;
  const openByDefault = depth < 1;
  const keyPart =
    key !== undefined
      ? html`<span style="color: #c62828; font-weight: 600;">"${key}"</span>: `
      : nothing;

  if (isEmpty) {
    return html`<span
      >${keyPart}<span style="color: #666;">${isArray ? "[]" : "{}"}</span>${comma}</span
    >`;
  }

  return html`
    <details ?open=${openByDefault} style="margin: 0;">
      <summary
        style="cursor: pointer; user-select: none; color: #666; font-size: 11px; list-style: none;"
      >
        ${keyPart}<span style="color: #888;"
          >${isArray ? `[${entries.length} items]` : `{${entries.length} keys}`}</span
        >${renderMessagePreview(value)}${comma}
      </summary>
      <div style="margin-left: 16px; border-left: 1px solid #e0e0e0; padding-left: 8px;">
        <span style="color: #ccc;">${isArray ? "[" : "{"}</span>
        ${entries.map(
          ([k, v], i) =>
            html`<div>
              ${renderJsonNode(v, isArray ? undefined : k, depth + 1, i === entries.length - 1)}
            </div>`,
        )}
        <span style="color: #ccc;">${isArray ? "]" : "}"}</span>
      </div>
    </details>
  `;
}

function mergeSseStream(text: string): unknown | null {
  const lines = text.split(/\r?\n/);
  const dataLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data:")) {
      const value = trimmed.slice(5).trim();
      if (value && value !== "[DONE]") dataLines.push(value);
    }
  }
  if (dataLines.length === 0) return null;

  let content = "";
  let role = "";
  let finishReason: string | null = null;
  let id = "";
  let model = "";
  const toolCalls: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }> = [];

  for (const line of dataLines) {
    try {
      const chunk = JSON.parse(line) as Record<string, unknown>;
      if (chunk.id) id = String(chunk.id);
      if (chunk.model) model = String(chunk.model);
      const choices = chunk.choices as Array<Record<string, unknown>> | undefined;
      if (choices?.length) {
        const choice = choices[0];
        const delta = choice.delta as Record<string, unknown> | undefined;
        if (delta) {
          if (typeof delta.role === "string" && !role) role = delta.role;
          if (typeof delta.content === "string") content += delta.content;
          const tc = delta.tool_calls as Array<Record<string, unknown>> | undefined;
          if (tc) {
            for (const t of tc) {
              const idx = typeof t.index === "number" ? t.index : toolCalls.length;
              const fn = t.function as Record<string, unknown> | undefined;
              if (!toolCalls[idx]) {
                toolCalls[idx] = {
                  id: String(t.id ?? ""),
                  type: String(t.type ?? "function"),
                  function: {
                    name: String(fn?.name ?? ""),
                    arguments: String(fn?.arguments ?? ""),
                  },
                };
              } else {
                if (fn?.name) toolCalls[idx].function.name += String(fn.name);
                if (fn?.arguments) toolCalls[idx].function.arguments += String(fn.arguments);
              }
            }
          }
        }
        if (typeof choice.finish_reason === "string") finishReason = choice.finish_reason;
      }
    } catch {}
  }

  const message: Record<string, unknown> = { role: role || "assistant", content };
  if (toolCalls.length) message.tool_calls = toolCalls;
  return { id, model, choices: [{ index: 0, message, finish_reason: finishReason }] };
}

function isHeartbeatMessage(msg: unknown): boolean {
  if (typeof msg !== "object" || msg === null) return false;
  const content = (msg as Record<string, unknown>).content;
  if (typeof content === "string") {
    return content === "HEARTBEAT_OK" || content.includes("[OpenClaw heartbeat poll]");
  }
  if (Array.isArray(content)) {
    for (const part of content) {
      if (typeof part === "object" && part !== null) {
        const text = (part as Record<string, unknown>).text;
        if (typeof text === "string" && text.includes("[OpenClaw heartbeat poll]")) {
          return true;
        }
      }
    }
  }
  return false;
}

function filterHeartbeatMessages(body: unknown): unknown {
  if (typeof body !== "object" || body === null) return body;
  const obj = body as Record<string, unknown>;
  if (!Array.isArray(obj.messages)) return body;
  return { ...obj, messages: obj.messages.filter((m) => !isHeartbeatMessage(m)) };
}

function normalizeBody(event: CaptureEvent): unknown {
  if (event.body == null) return null;
  let result: unknown = event.body;
  // SSE stream: merge into final message
  if (typeof event.body === "string") {
    if (
      event.body.trim().startsWith("data:") ||
      (event.contentType ?? "").includes("event-stream")
    ) {
      const merged = mergeSseStream(event.body);
      if (merged) result = merged;
      else {
        try {
          result = JSON.parse(event.body);
        } catch {
          result = event.body;
        }
      }
    } else {
      try {
        result = JSON.parse(event.body);
      } catch {
        result = event.body;
      }
    }
  }
  // Filter out heartbeat messages from the messages array
  return filterHeartbeatMessages(result);
}

function renderEventCard(event: CaptureEvent, index: number): TemplateResult {
  const isRequest = event.kind === "request";
  const url = `${event.method ?? "POST"} ${event.host ?? ""}${event.path ?? ""}`;
  const statusLabel = isRequest ? url : `${event.status ?? ""} ${url}`;
  const borderColor = isRequest ? "#2196f3" : "#4caf50";
  const labelBg = isRequest ? "#e3f2fd" : "#e8f5e9";
  const labelColor = isRequest ? "#1565c0" : "#2e7d32";
  const tagText = isRequest ? "Request" : "Response";
  const displayBody = normalizeBody(event);
  const hasBody = displayBody != null;

  return html`
    <details
      ?open=${index < 2}
      style="border-left: 3px solid ${borderColor}; margin-bottom: 12px; background: #fff; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden;"
    >
      <summary
        style="padding: 8px 12px; background: ${labelBg}; color: ${labelColor}; font-size: 11px; font-weight: 600; font-family: 'SF Mono', monospace; cursor: pointer; display: flex; align-items: center; gap: 8px; list-style: none; user-select: none;"
      >
        <span
          style="background: ${borderColor}; color: #fff; padding: 1px 6px; border-radius: 3px; font-size: 10px;"
          >${tagText}</span
        >
        <span>${statusLabel}</span>
      </summary>
      ${hasBody
        ? html`<div
            style="margin: 0; padding: 10px 12px; font-size: 12px; line-height: 1.6; font-family: 'SF Mono', 'Fira Code', monospace; color: #1a1a1a; overflow: auto;"
          >
            ${renderJsonNode(displayBody, undefined, 0, true)}
          </div>`
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
  if (!params.open) return nothing;

  const allEvents = (
    params.captureEvents as Array<CaptureEvent & { ts?: number; flowId?: string }>
  ).filter((e) => e.body != null);

  // Group by flowId, order each group: request before response, groups by earliest ts
  const flowOrder: string[] = [];
  const flowFirstTs: Record<string, number> = {};
  for (const e of allEvents) {
    const fid = e.flowId ?? "_unknown";
    if (!(fid in flowFirstTs)) {
      flowFirstTs[fid] = e.ts ?? 0;
      flowOrder.push(fid);
    }
  }
  flowOrder.sort((a, b) => flowFirstTs[a] - flowFirstTs[b]);

  const events: CaptureEvent[] = [];
  for (const fid of flowOrder) {
    const group = allEvents.filter((e) => (e.flowId ?? "_unknown") === fid);
    group.sort((a, b) => {
      const aReq = a.kind === "request" ? 0 : 1;
      const bReq = b.kind === "request" ? 0 : 1;
      return aReq - bReq;
    });
    events.push(...group);
  }

  return html`
    <div
      @click=${(e: Event) => {
        if (e.target === e.currentTarget) params.onClose();
      }}
      style="position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 4vh 4vw;"
    >
      <div
        style="background: #ffffff; color: #1a1a1a; border: 1px solid #c0c0c0; border-radius: 8px; display: flex; flex-direction: column; width: 70vw; max-width: 1600px; height: 92vh; min-width: 400px; min-height: 300px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3); resize: both; position: relative; margin-left: 10vw;"
      >
        <div
          style="display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; border-bottom: 1px solid #e0e0e0; flex-shrink: 0;"
        >
          <span style="font-size: 12px; color: #666; font-family: 'SF Mono', monospace;"
            >${events.length} events</span
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
    </div>
  `;
}
