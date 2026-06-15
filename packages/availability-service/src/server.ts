import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import { AvailabilityService } from "./service";

export interface ServerOptions {
  service: AvailabilityService;
  /** Shared secret required in the x-availability-key header. */
  apiKey: string;
  /** Reject bodies larger than this many bytes. */
  maxBodyBytes?: number;
}

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

/**
 * The private HTTP contract: POST /v1/availability with header
 * x-availability-key. Built on node:http to keep the package
 * dependency-light. Call listen() to start.
 */
export function createAvailabilityServer(opts: ServerOptions): Server {
  if (!opts.apiKey) {
    throw new Error("createAvailabilityServer requires a non-empty apiKey");
  }
  const maxBodyBytes = opts.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;

  return createServer((req, res) => {
    void handle(req, res, opts, maxBodyBytes).catch((err) => {
      sendJson(res, 500, { error: "internal_error" });
      console.error("[availability-service] request failed:", err);
    });
  });
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  opts: ServerOptions,
  maxBodyBytes: number,
): Promise<void> {
  if (req.method === "GET" && (req.url === "/health" || req.url === "/healthz")) {
    return sendJson(res, 200, { status: "ok" });
  }

  if (req.method !== "POST" || req.url !== "/v1/availability") {
    return sendJson(res, 404, { error: "not_found" });
  }

  const presented = req.headers["x-availability-key"];
  if (typeof presented !== "string" || !keysMatch(presented, opts.apiKey)) {
    return sendJson(res, 401, { error: "unauthorized" });
  }

  let body: string;
  try {
    body = await readBody(req, maxBodyBytes);
  } catch {
    return sendJson(res, 413, { error: "payload_too_large" });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return sendJson(res, 400, { error: "invalid_json" });
  }

  try {
    const response = await opts.service.handle(parsed);
    return sendJson(res, 200, response);
  } catch (err) {
    if (err instanceof ZodError) {
      return sendJson(res, 400, { error: "invalid_request", issues: err.issues });
    }
    throw err;
  }
}

/** Constant-time comparison that does not leak length via early return. */
function keysMatch(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Compare against self to keep timing uniform, then fail.
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body);
}
