import { getLlmDebugEvents, installLlmFetchInterceptor } from "../../agents/llm-debug-buffer.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

installLlmFetchInterceptor();

export const debugCaptureHandlers: GatewayRequestHandlers = {
  "debug.capture.recent": ({ params, respond }) => {
    try {
      const p = (params ?? {}) as Record<string, unknown>;
      const sid = typeof p.debugSessionId === "string" ? p.debugSessionId : undefined;
      console.error(`[llm-debug] RPC called, debugSessionId=${sid ?? "none"}`);
      const events = getLlmDebugEvents({
        limit: typeof p.limit === "number" ? p.limit : 100,
        debugSessionId: sid,
      });
      console.error(
        `[llm-debug] returning ${events.length} events (total buffer: ${getLlmDebugEvents({ limit: 200 }).length})`,
      );
      respond(true, { enabled: true, events }, undefined);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INTERNAL_ERROR,
          err instanceof Error ? err.message : "debug.capture.recent failed",
        ),
      );
    }
  },
};
