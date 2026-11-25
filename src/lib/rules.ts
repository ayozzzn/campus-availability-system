/**
 * Pure availability rules for the Smart Campus Room Availability Checker.
 * No DOM access. All functions are pure and accept "now" as a parameter.
 */

export type ReasonCode =
  | 'AVAILABLE'
  | 'INVALID_INPUT'
  | 'INVALID_START_PAST'
  | 'INVALID_DURATION'
  | 'ROOM_BLOCKED'
  | 'OVERLAP';

export type AvailabilityResult = {
  available: boolean;
  reasonCode: ReasonCode;
  message: string;
};

export type Booking = {
  id: string;
  start: string; // ISO datetime string, e.g. "2026-11-26T10:00"
  end: string;
};

export type AvailabilityInput = {
  start: string; // ISO datetime string
  durationMinutes: number;
  blocked: boolean;
  now: string; // ISO datetime string
  bookings: readonly Booking[];
};

const MESSAGES: Record<ReasonCode, string> = {
  AVAILABLE: 'Room A-101 is available for the requested time.',
  INVALID_INPUT: 'The input is invalid: start time and duration are required and must be correct types.',
  INVALID_START_PAST: 'The start time must be in the future.',
  INVALID_DURATION: 'Duration must be between 1 and 120 minutes.',
  ROOM_BLOCKED: 'Room A-101 is blocked and cannot be booked.',
  OVERLAP: 'The requested time overlaps an existing booking.',
};

/**
 * Parse an ISO datetime string into a millisecond timestamp.
 * Returns NaN if the string is not a valid datetime.
 */
function parseDate(value: string): number {
  if (typeof value !== 'string' || value.trim() === '') return NaN;
  const ts = Date.parse(value);
  return ts;
}

/**
 * validateInput — checks that the input object has the right shape and types.
 * Returns a ReasonCode: 'AVAILABLE' means valid, anything else is the failure reason.
 *
 * Check order: invalid input first, then start-in-past, then duration range.
 */
export function validateInput(input: unknown): ReasonCode {
  if (typeof input !== 'object' || input === null) return 'INVALID_INPUT';
  const v = input as Record<string, unknown>;

  if (typeof v.start !== 'string' || typeof v.now !== 'string') return 'INVALID_INPUT';
  if (typeof v.durationMinutes !== 'number' || !Number.isFinite(v.durationMinutes)) return 'INVALID_INPUT';
  if (typeof v.blocked !== 'boolean') return 'INVALID_INPUT';
  if (!Array.isArray(v.bookings)) return 'INVALID_INPUT';

  const startTs = parseDate(v.start);
  const nowTs = parseDate(v.now);
  if (Number.isNaN(startTs) || Number.isNaN(nowTs)) return 'INVALID_INPUT';

  // Start must be strictly in the future
  if (startTs <= nowTs) return 'INVALID_START_PAST';

  // Duration must be between 1 and 120 (inclusive)
  if (v.durationMinutes < 1 || v.durationMinutes > 120 || !Number.isInteger(v.durationMinutes)) {
    return 'INVALID_DURATION';
  }

  // Validate each booking entry shape
  for (const b of v.bookings as unknown[]) {
    if (typeof b !== 'object' || b === null) return 'INVALID_INPUT';
    const bk = b as Record<string, unknown>;
    if (typeof bk.id !== 'string') return 'INVALID_INPUT';
    if (typeof bk.start !== 'string' || typeof bk.end !== 'string') return 'INVALID_INPUT';
    if (Number.isNaN(parseDate(bk.start)) || Number.isNaN(parseDate(bk.end))) return 'INVALID_INPUT';
  }

  return 'AVAILABLE';
}

/**
 * isOverlapping — checks whether [startA, endA) overlaps [startB, endB).
 * Intervals are half-open: adjacent bookings (endA === startB) do NOT overlap.
 */
export function isOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = parseDate(startA);
  const eA = parseDate(endA);
  const sB = parseDate(startB);
  const eB = parseDate(endB);
  if (Number.isNaN(sA) || Number.isNaN(eA) || Number.isNaN(sB) || Number.isNaN(eB)) {
    return false;
  }
  // Half-open [startA, endA) ∩ [startB, endB) is non-empty iff startA < endB && startB < endA
  return sA < eB && sB < eA;
}

/**
 * checkAvailability — the main entry point. Pure function.
 *
 * Check order:
 *   1. Invalid input
 *   2. Start in the future (past check)
 *   3. Duration 1–120
 *   4. Room blocked
 *   5. Overlap
 *
 * Never mutates the bookings array.
 */
export function checkAvailability(input: AvailabilityInput): AvailabilityResult {
  const validCode = validateInput(input);
  if (validCode !== 'AVAILABLE') {
    return { available: false, reasonCode: validCode, message: MESSAGES[validCode] };
  }

  const startTs = parseDate(input.start);
  const endTs = startTs + input.durationMinutes * 60 * 1000;
  const endISO = new Date(endTs).toISOString().slice(0, 16);

  if (input.blocked) {
    return { available: false, reasonCode: 'ROOM_BLOCKED', message: MESSAGES.ROOM_BLOCKED };
  }

  for (const b of input.bookings) {
    if (isOverlapping(input.start, endISO, b.start, b.end)) {
      return { available: false, reasonCode: 'OVERLAP', message: MESSAGES.OVERLAP };
    }
  }

  return { available: true, reasonCode: 'AVAILABLE', message: MESSAGES.AVAILABLE };
}

// ---------------------------------------------------------------------------
// Fixed fictional data (Room A-101)
// ---------------------------------------------------------------------------

export const ROOM_LABEL = 'Room A-101';

/** Fixed "now" for deterministic tests: 2026-11-25 10:00 */
export const FIXED_NOW = '2026-11-25T10:00';

/** Fixed bookings — frozen so they can never be mutated. */
export const FIXED_BOOKINGS: readonly Booking[] = Object.freeze([
  Object.freeze({ id: 'B1', start: '2026-11-26T10:00', end: '2026-11-26T11:00' }) as Booking,
  Object.freeze({ id: 'B2', start: '2026-11-26T14:00', end: '2026-11-26T15:30' }) as Booking,
  Object.freeze({ id: 'B3', start: '2026-11-27T09:00', end: '2026-11-27T10:00' }) as Booking,
]);
