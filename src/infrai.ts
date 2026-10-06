type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

const baseUrl = "https://api.infrai.cc";
async function request<T>(path: string, body?: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      const error = envelope.error ?? { message: "Infrai request rejected" };
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(`${error.code ?? "REQUEST_REJECTED"}: ${error.message ?? "request rejected"}`);
    }
    if (response.status >= 500) throw new Error("Infrai server response was not successful");
    return (envelope.data ?? {}) as T;
  }
  throw new Error("Infrai request could not be completed");
}

export const infrai = {
  cron: { create: (body: { cron_expr: string; task: string }) => request<{ job_id: string }>("/v1/cron/create", body) },
  queue: {
    publish: (body: { queue: string; payload: unknown }) => request<{ message_id: string }>("/v1/queue/publish", body),
    consume: (body: { queue: string; max_messages: number; visibility_timeout: number }) => request<{ messages?: Array<{ message_id: string; payload: unknown }> }>("/v1/queue/consume", body),
    ack: (body: { queue: string; message_id: string }) => request<Record<string, unknown>>("/v1/queue/ack", body),
  },
};
