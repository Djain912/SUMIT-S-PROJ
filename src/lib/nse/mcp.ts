// Minimal client for NSE's public MCP servers (https://www.nseindia.com/nse-mcp).
// Streamable-HTTP JSON-RPC: initialize → tools/call. No auth required.
// NSE terms: data is for informational use; outputs credit "Source: NSE".

export const NSE_MCP_BHAVCOPY = 'https://mcp.nseindia.in/bhavcopy/cm/mcp';

type Json = Record<string, unknown>;

async function rpc(url: string, method: string, params: Json | undefined, sid: string | null, id: number | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'User-Agent': 'Mozilla/5.0 (compatible; Chartix/1.0; +https://chartix.in)',
  };
  if (sid) headers['mcp-session-id'] = sid;
  const body = { jsonrpc: '2.0', method, ...(id != null ? { id } : {}), ...(params ? { params } : {}) };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(20_000), cache: 'no-store' });
  const raw = await res.text();
  let data: Json | null = null;
  for (const line of raw.split('\n')) if (line.startsWith('data:')) data = JSON.parse(line.slice(5));
  if (!data && raw.trim().startsWith('{')) data = JSON.parse(raw);
  return { data, sid: res.headers.get('mcp-session-id') ?? sid, status: res.status };
}

export class NseMcp {
  private sid: string | null = null;
  constructor(private url = NSE_MCP_BHAVCOPY) {}

  private async ensure() {
    if (this.sid) return;
    const r = await rpc(this.url, 'initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'chartix-market-desk', version: '1.0' } }, null, 1);
    if (r.status >= 400) throw new Error(`NSE MCP initialize failed (HTTP ${r.status})`);
    this.sid = r.sid;
    await rpc(this.url, 'notifications/initialized', undefined, this.sid, null).catch(() => {});
  }

  /** Calls a tool and parses its JSON text payload. */
  async call<T = Json>(name: string, args: Json): Promise<T> {
    await this.ensure();
    const r = await rpc(this.url, 'tools/call', { name, arguments: args }, this.sid, 2);
    const result = r.data?.result as { content?: { type: string; text?: string }[]; isError?: boolean } | undefined;
    const text = result?.content?.find((c) => c.type === 'text')?.text;
    if (!text || result?.isError) throw new Error(`NSE MCP ${name} failed: ${text ?? JSON.stringify(r.data?.error ?? r.status)}`);
    return JSON.parse(text) as T;
  }
}
