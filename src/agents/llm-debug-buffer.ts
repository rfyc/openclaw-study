const MAX_EVENTS = 200;

export type LlmDebugEvent = {
  ts: number;
  kind: "request" | "response";
  method: string;
  host: string;
  path: string;
  status?: number;
  contentType?: string;
  body: unknown;
  flowId: string;
  debugSessionId?: string;
};

const buffer: LlmDebugEvent[] = [];

// Simple global variable instead of AsyncLocalStorage for reliability
let currentDebugSessionId: string | undefined;

// Broadcast callback for real-time push to frontend
let broadcastFn: ((event: string, payload: unknown) => void) | null = null;

export function setLlmDebugBroadcast(fn: ((event: string, payload: unknown) => void) | null): void {
  broadcastFn = fn;
}

export function setDebugSessionId(id: string | undefined): void {
  currentDebugSessionId = id;
}

const LLM_PATH_PATTERNS = [
  "/v1/chat/completions",
  "/v1/completions",
  "/v1/responses",
  "/v1/messages",
  "/openai-compatible/",
];

function isLlmRequest(url: string): boolean {
  return LLM_PATH_PATTERNS.some((p) => url.includes(p));
}

function isHeartbeatRequest(bodyText: string): boolean {
  try {
    const parsed = JSON.parse(bodyText) as {
      messages?: Array<{ role?: string; content?: unknown }>;
    };
    const messages = parsed.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return false;
    }
    const last = messages[messages.length - 1];
    const content =
      typeof last?.content === "string"
        ? last.content
        : Array.isArray(last?.content)
          ? ((last.content as Array<{ type?: string; text?: string }>).find(
              (c) => c.type === "text",
            )?.text ?? "")
          : "";
    return content.includes("[OpenClaw heartbeat poll]");
  } catch {
    return false;
  }
}

let installed = false;
let originalFetch: typeof globalThis.fetch | null = null;

export function installLlmFetchInterceptor(): void {
  if (installed) return;
  installed = true;
  originalFetch = globalThis.fetch;
  console.error("[llm-debug] fetch interceptor installed");

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input instanceof Request
            ? input.url
            : "";

    if (!url || !isLlmRequest(url)) {
      return originalFetch!(input, init);
    }

    console.error(`[llm-debug] LLM fetch intercepted: ${url}`);
    const parsedUrl = new URL(url);
    const flowId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const method = init?.method ?? (input instanceof Request ? input.method : "POST");
    const sid = currentDebugSessionId;
    let isRealRequest = false;

    try {
      const rawBody = init?.body;
      let bodyText: string | undefined;
      console.error(
        `[llm-debug] input type=${typeof input} instanceof Request=${input instanceof Request} init=${init ? "yes" : "no"} rawBody=${rawBody ? typeof rawBody : "null"}`,
      );
      if (typeof rawBody === "string") {
        bodyText = rawBody;
      } else if (Buffer.isBuffer(rawBody)) {
        bodyText = rawBody.toString("utf8");
      } else if (input instanceof Request) {
        try {
          const clonedReq = input.clone();
          bodyText = await clonedReq.text();
        } catch (e) {
          console.error(`[llm-debug] clone.text() error: ${e}`);
        }
      }
      console.error(
        `[llm-debug] bodyText length=${bodyText?.length ?? 0} isHeartbeat=${bodyText ? isHeartbeatRequest(bodyText) : false}`,
      );
      if (bodyText && !isHeartbeatRequest(bodyText)) {
        isRealRequest = true;
        let parsedBody: unknown = bodyText;
        try {
          parsedBody = JSON.parse(bodyText);
        } catch {}
        recordLlmDebugEvent({
          ts: Date.now(),
          kind: "request",
          method,
          host: parsedUrl.host,
          path: `${parsedUrl.pathname}${parsedUrl.search}`,
          contentType:
            init?.headers instanceof Headers
              ? (init.headers.get("content-type") ?? undefined)
              : input instanceof Request
                ? (input.headers.get("content-type") ?? undefined)
                : undefined,
          body: parsedBody,
          flowId,
          debugSessionId: sid,
        });
      }
    } catch {}

    const response = await originalFetch!(input, init);

    if (isRealRequest) {
      try {
        const cloned = response.clone();
        void cloned
          .text()
          .then((respText) => {
            let parsedBody: unknown = respText;
            const ct = response.headers.get("content-type") ?? "";
            if (respText.trim().startsWith("{") || respText.trim().startsWith("[")) {
              try {
                parsedBody = JSON.parse(respText);
              } catch {}
            }
            recordLlmDebugEvent({
              ts: Date.now(),
              kind: "response",
              method,
              host: parsedUrl.host,
              path: `${parsedUrl.pathname}${parsedUrl.search}`,
              status: response.status,
              contentType: ct || undefined,
              body: parsedBody,
              flowId,
              debugSessionId: sid,
            });
          })
          .catch(() => {});
      } catch {}
    }

    return response;
  }) as typeof globalThis.fetch;
}

export function recordLlmDebugEvent(event: LlmDebugEvent): void {
  buffer.push(event);
  if (buffer.length > MAX_EVENTS) {
    buffer.splice(0, buffer.length - MAX_EVENTS);
  }
  console.error(
    `[llm-debug] record kind=${event.kind} broadcastFn=${broadcastFn ? "set" : "null"}`,
  );
  if (broadcastFn) {
    try {
      broadcastFn("debug.llm", event);
    } catch (e) {
      console.error(`[llm-debug] broadcast error: ${e}`);
    }
  }
}

export function getLlmDebugEvents(params: {
  limit?: number;
  debugSessionId?: string;
}): LlmDebugEvent[] {
  const limit = Math.min(Math.max(1, params.limit ?? 50), 200);
  let events = buffer;
  if (params.debugSessionId) {
    events = events.filter((e) => e.debugSessionId === params.debugSessionId);
  }
  return events.slice(-limit).reverse();
}

export function clearLlmDebugEvents(): void {
  buffer.length = 0;
}
