/**
 * n8n webhook trigger helper.
 * Sends event + payload to n8n via HTTP POST (fire-and-forget).
 * If N8N_WEBHOOK_BASE_URL is not configured, silently skips.
 */
export async function triggerN8n(event: string, data: unknown): Promise<void> {
  const baseUrl = process.env.N8N_WEBHOOK_BASE_URL;
  if (!baseUrl) return;
  try {
    await fetch(`${baseUrl}/webhook/tracker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data, timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.warn(`[n8n] ${event} trigger failed:`, (err as Error).message);
  }
}
