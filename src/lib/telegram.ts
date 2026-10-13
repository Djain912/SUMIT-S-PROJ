// Minimal Telegram Bot API client for admin notifications (@Chartix_postbot → owner's DM).
// Every call is a no-op returning false when the bot isn't configured.

const token = () => process.env.TELEGRAM_BOT_TOKEN;
const chat = () => process.env.TELEGRAM_CHAT_ID;

export const telegramConfigured = () => !!(token() && chat());

async function call(method: string, body: FormData | Record<string, unknown>): Promise<boolean> {
  if (!telegramConfigured()) return false;
  const isForm = body instanceof FormData;
  const res = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: 'POST',
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body: isForm ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
  if (!json?.ok) throw new Error(`Telegram ${method} failed: ${json?.description ?? res.status}`);
  return true;
}

export function sendTelegramMessage(text: string) {
  return call('sendMessage', { chat_id: chat(), text, disable_web_page_preview: true });
}

/** Sends one or more PNGs as a single album; the caption goes on the first image. */
export function sendTelegramPhotos(photos: { png: ArrayBuffer; name: string }[], caption: string) {
  const form = new FormData();
  form.append('chat_id', chat() ?? '');
  if (photos.length === 1) {
    form.append('photo', new Blob([photos[0].png], { type: 'image/png' }), photos[0].name);
    form.append('caption', caption.slice(0, 1024));
    return call('sendPhoto', form);
  }
  const media = photos.map((p, i) => ({ type: 'photo', media: `attach://${p.name}`, ...(i === 0 ? { caption: caption.slice(0, 1024) } : {}) }));
  form.append('media', JSON.stringify(media));
  for (const p of photos) form.append(p.name, new Blob([p.png], { type: 'image/png' }), `${p.name}.png`);
  return call('sendMediaGroup', form);
}
