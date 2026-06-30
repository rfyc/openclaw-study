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

function renderEventCard(event: CaptureEvent) {
  const isRequest = event.kind === "request";
  const label = isRequest
    ? `${event.method ?? "POST"} ${event.host ?? ""}${event.path ?? ""}`
    : `${event.status ?? ""} Response`;
  const borderColor = isRequest ? "#2196f3" : "#4caf50";
  const labelBg = isRequest ? "#e3f2fd" : "#e8f5e9";
  const labelColor = isRequest ? "#1565c0" : "#2e7d32";
  const bodyStr =
    event.body != null
      ? typeof event.body === "string"
        ? event.body
        : JSON.stringify(event.body, null, 2)
      : null;

  return html`
    <div
      style="
        border-left: 3px solid ${borderColor};
        margin-bottom: 12px;
        background: #fff;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      "
    >
      <div
        style="
          padding: 6px 12px;
          background: ${labelBg};
          color: ${labelColor};
          font-size: 11px;
          font-weight: 600;
          font-family: 'SF Mono', monospace;
          border-radius: 4px 4px 0 0;
        "
      >
        ${label}
      </div>
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
              max-height: 400px;
              overflow: auto;
            "
          >
${bodyStr}</pre
          >`
        : html`<p style="margin: 0; padding: 8px 12px; color: #999; font-size: 12px;">No body</p>`}
    </div>
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

  // Only show events that have body data
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
            justify-content: space-between;
            padding: 12px 16px;
            border-bottom: 1px solid #e0e0e0;
          "
        >
          <span style="font-weight: 600; font-size: 14px; color: #1a1a1a;">
            LLM Request/Response Body (${events.length})
          </span>
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
                : events.map((event) => renderEventCard(event))}
        </div>
      </div>
    </openclaw-modal-dialog>
  `;
}
