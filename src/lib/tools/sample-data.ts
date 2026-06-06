// Bundled sample data for the interactive indicator tools (Apple / AAPL, 35 daily bars).
// Used for teaching the calculations; swap for a live feed later if licensed.
export type Bar = { date: string; open: number; high: number; low: number; close: number; volume: number };

export const AAPL_SAMPLE: Bar[] = [
  {
    "date": "2026-05-15",
    "open": 297.9,
    "high": 303.2,
    "low": 296.52,
    "close": 300.23,
    "volume": 54860000
  },
  {
    "date": "2026-05-18",
    "open": 300.24,
    "high": 300.66,
    "low": 294.91,
    "close": 297.84,
    "volume": 34480000
  },
  {
    "date": "2026-05-19",
    "open": 296.97,
    "high": 300.51,
    "low": 296.35,
    "close": 298.97,
    "volume": 42240000
  },
  {
    "date": "2026-05-20",
    "open": 298.18,
    "high": 302.8,
    "low": 298.08,
    "close": 302.25,
    "volume": 38230000
  },
  {
    "date": "2026-05-21",
    "open": 301.05,
    "high": 305.54,
    "low": 300.4,
    "close": 304.99,
    "volume": 42970000
  },
  {
    "date": "2026-05-22",
    "open": 306.12,
    "high": 311.4,
    "low": 305.84,
    "close": 308.82,
    "volume": 43670000
  },
  {
    "date": "2026-05-26",
    "open": 309.56,
    "high": 311.82,
    "low": 307.67,
    "close": 308.33,
    "volume": 48000000
  },
  {
    "date": "2026-05-27",
    "open": 308.33,
    "high": 313.26,
    "low": 308.3,
    "close": 310.85,
    "volume": 50430000
  },
  {
    "date": "2026-05-28",
    "open": 310.68,
    "high": 312.8,
    "low": 309.57,
    "close": 312.51,
    "volume": 48220000
  },
  {
    "date": "2026-05-29",
    "open": 311.77,
    "high": 315.0,
    "low": 309.53,
    "close": 312.06,
    "volume": 70030000
  },
  {
    "date": "2026-06-01",
    "open": 267.0,
    "high": 267.55,
    "low": 262.12,
    "close": 262.36,
    "volume": 52350000
  },
  {
    "date": "2026-06-02",
    "open": 277.12,
    "high": 280.9,
    "low": 276.92,
    "close": 278.12,
    "volume": 50450000
  },
  {
    "date": "2026-06-03",
    "open": 258.63,
    "high": 258.77,
    "low": 254.37,
    "close": 257.46,
    "volume": 41120000
  },
  {
    "date": "2026-06-04",
    "open": 256.51,
    "high": 262.16,
    "low": 256.46,
    "close": 258.86,
    "volume": 29330000
  },
  {
    "date": "2026-06-05",
    "open": 281.92,
    "high": 288.03,
    "low": 281.07,
    "close": 287.51,
    "volume": 58340000
  },
  {
    "date": "2026-07-01",
    "open": 263.2,
    "high": 263.68,
    "low": 259.81,
    "close": 260.33,
    "volume": 48310000
  },
  {
    "date": "2026-07-04",
    "open": 256.15,
    "high": 256.2,
    "low": 245.7,
    "close": 253.5,
    "volume": 62150000
  },
  {
    "date": "2026-07-05",
    "open": 289.27,
    "high": 292.13,
    "low": 285.78,
    "close": 287.44,
    "volume": 45220000
  },
  {
    "date": "2026-08-01",
    "open": 257.02,
    "high": 259.29,
    "low": 255.7,
    "close": 259.04,
    "volume": 50420000
  },
  {
    "date": "2026-08-04",
    "open": 258.45,
    "high": 259.75,
    "low": 256.53,
    "close": 258.9,
    "volume": 41030000
  },
  {
    "date": "2026-08-05",
    "open": 290.01,
    "high": 294.76,
    "low": 290.0,
    "close": 293.32,
    "volume": 52690000
  },
  {
    "date": "2026-09-01",
    "open": 259.08,
    "high": 260.21,
    "low": 256.22,
    "close": 259.37,
    "volume": 40000000
  },
  {
    "date": "2026-09-02",
    "open": 277.9,
    "high": 278.2,
    "low": 271.7,
    "close": 274.62,
    "volume": 44620000
  },
  {
    "date": "2026-09-03",
    "open": 255.69,
    "high": 261.15,
    "low": 253.68,
    "close": 259.88,
    "volume": 38220000
  },
  {
    "date": "2026-09-04",
    "open": 259.0,
    "high": 261.12,
    "low": 256.07,
    "close": 260.49,
    "volume": 28120000
  },
  {
    "date": "2026-10-02",
    "open": 274.89,
    "high": 275.37,
    "low": 272.94,
    "close": 273.68,
    "volume": 34380000
  },
  {
    "date": "2026-10-03",
    "open": 257.64,
    "high": 262.48,
    "low": 256.95,
    "close": 260.83,
    "volume": 30590000
  },
  {
    "date": "2026-10-04",
    "open": 259.98,
    "high": 262.19,
    "low": 259.02,
    "close": 260.48,
    "volume": 31290000
  },
  {
    "date": "2026-11-02",
    "open": 274.7,
    "high": 280.18,
    "low": 274.45,
    "close": 275.5,
    "volume": 51930000
  },
  {
    "date": "2026-11-03",
    "open": 261.09,
    "high": 262.13,
    "low": 259.55,
    "close": 260.81,
    "volume": 26220000
  },
  {
    "date": "2026-11-05",
    "open": 291.98,
    "high": 293.88,
    "low": 290.23,
    "close": 292.68,
    "volume": 42250000
  },
  {
    "date": "2026-12-01",
    "open": 259.16,
    "high": 261.3,
    "low": 256.8,
    "close": 260.25,
    "volume": 45260000
  },
  {
    "date": "2026-12-02",
    "open": 275.59,
    "high": 275.72,
    "low": 260.18,
    "close": 261.73,
    "volume": 81080000
  },
  {
    "date": "2026-12-03",
    "open": 258.66,
    "high": 258.95,
    "low": 254.18,
    "close": 255.76,
    "volume": 40790000
  },
  {
    "date": "2026-12-05",
    "open": 292.56,
    "high": 295.27,
    "low": 292.56,
    "close": 294.8,
    "volume": 45750000
  }
];
