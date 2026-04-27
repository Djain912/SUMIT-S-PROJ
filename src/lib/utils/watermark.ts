export type WatermarkPosition = 'TILE' | 'CENTER' | 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT';

export type WatermarkConfig = {
  enabled: boolean;
  text: string;
  opacity: number;
  position: WatermarkPosition;
  fontSize: number;
  color: string;
};

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  enabled: false,
  text: 'Confidential',
  opacity: 0.14,
  position: 'TILE',
  fontSize: 18,
  color: '#1f293780',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeColor(input: unknown): string {
  if (typeof input !== 'string') {
    return DEFAULT_WATERMARK_CONFIG.color;
  }

  if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(input)) {
    return input;
  }

  return DEFAULT_WATERMARK_CONFIG.color;
}

export function sanitizeWatermarkConfig(raw: unknown): WatermarkConfig {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_WATERMARK_CONFIG;
  }

  const input = raw as Partial<WatermarkConfig>;
  const allowedPositions: WatermarkPosition[] = ['TILE', 'CENTER', 'TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'];

  return {
    enabled: Boolean(input.enabled),
    text:
      typeof input.text === 'string' && input.text.trim().length > 0
        ? input.text.trim().slice(0, 120)
        : DEFAULT_WATERMARK_CONFIG.text,
    opacity:
      typeof input.opacity === 'number' && Number.isFinite(input.opacity)
        ? clamp(input.opacity, 0.05, 0.4)
        : DEFAULT_WATERMARK_CONFIG.opacity,
    position:
      typeof input.position === 'string' && allowedPositions.includes(input.position as WatermarkPosition)
        ? (input.position as WatermarkPosition)
        : DEFAULT_WATERMARK_CONFIG.position,
    fontSize:
      typeof input.fontSize === 'number' && Number.isFinite(input.fontSize)
        ? Math.round(clamp(input.fontSize, 12, 40))
        : DEFAULT_WATERMARK_CONFIG.fontSize,
    color: normalizeColor(input.color),
  };
}
