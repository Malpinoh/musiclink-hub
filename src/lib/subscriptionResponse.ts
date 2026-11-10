export type SubscriptionResponse = { success?: boolean; code?: string; message?: string; error?: string; requestId?: string };

export async function readSubscriptionResponse(data: SubscriptionResponse | null, error: unknown): Promise<SubscriptionResponse> {
  if (error && typeof error === "object" && "context" in error && error.context instanceof Response) {
    try { return await error.context.clone().json(); } catch { /* Network/non-JSON errors use the safe fallback. */ }
  }
  return data || {};
}