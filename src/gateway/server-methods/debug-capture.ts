import { resolveDebugProxySettings } from "../../proxy-capture/env.js";
import { getDebugProxyCaptureStore } from "../../proxy-capture/store.sqlite.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

export const debugCaptureHandlers: GatewayRequestHandlers = {
  "debug.capture.recent": ({ params, respond }) => {
    try {
      const settings = resolveDebugProxySettings();
      if (!settings.enabled) {
        respond(true, { enabled: false, events: [] }, undefined);
        return;
      }
      const limit =
        typeof (params as Record<string, unknown>)?.limit === "number"
          ? Math.min(Math.max(1, (params as Record<string, unknown>).limit as number), 200)
          : 50;
      const store = getDebugProxyCaptureStore(settings.dbPath, settings.blobDir);

      // Query recent capture events for this session, grouped by flowId for request/response pairs
      const rows = store.db
        .prepare(
          `SELECT
             id, session_id AS sessionId, ts, protocol, direction, kind, flow_id AS flowId,
             method, host, path, status, content_type AS contentType,
             headers_json AS headersJson, data_text AS dataText, meta_json AS metaJson
           FROM capture_events
           WHERE session_id = ?
           ORDER BY ts DESC, id DESC
           LIMIT ?`,
        )
        .all(settings.sessionId, limit) as Array<Record<string, unknown>>;

      // Parse JSON fields and build structured output
      const events = rows.map((row) => {
        let headers: unknown = undefined;
        let meta: unknown = undefined;
        let body: unknown = undefined;
        try {
          headers = row.headersJson ? JSON.parse(row.headersJson as string) : undefined;
        } catch {}
        try {
          meta = row.metaJson ? JSON.parse(row.metaJson as string) : undefined;
        } catch {}
        try {
          body =
            row.dataText && typeof row.dataText === "string" && row.dataText.trim().startsWith("{")
              ? JSON.parse(row.dataText as string)
              : row.dataText || undefined;
        } catch {
          body = row.dataText || undefined;
        }
        return {
          ts: row.ts,
          kind: row.kind,
          direction: row.direction,
          method: row.method,
          host: row.host,
          path: row.path,
          status: row.status,
          contentType: row.contentType,
          headers,
          body,
          meta,
          flowId: row.flowId,
        };
      });

      respond(true, { enabled: true, sessionId: settings.sessionId, events }, undefined);
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
