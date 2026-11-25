export type ReasonCode =
  | 'AVAILABLE'
  | 'OVERLAP'
  | 'ROOM_BLOCKED'
  | 'INVALID_TIME'
  | 'PAST_TIME';

export type ExplainInput = {
  roomLabel: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  reasonCode: ReasonCode;
};

export type ExplainResult =
  | { ok: true; explanation: string; source: 'mock' | 'fallback' }
  | { ok: false; error: string; source: 'fallback' };

export type MockFault = 'none' | 'timeout' | 'error' | 'contradiction';

export const EXPLANATION_MAX_LENGTH = 240;
export const EXPLANATION_MAX_SENTENCES = 2;
export const INPUT_MAX_LENGTH = 200;
export const TIMEOUT_MS = 3000;

const REASON_CODES: ReasonCode[] = [
  'AVAILABLE',
  'OVERLAP',
  'ROOM_BLOCKED',
  'INVALID_TIME',
  'PAST_TIME',
];

export function isReasonCode(value: unknown): value is ReasonCode {
  return typeof value === 'string' && (REASON_CODES as string[]).includes(value);
}

export function isValidExplainInput(value: unknown): value is ExplainInput {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!isReasonCode(v.reasonCode)) return false;
  if (typeof v.isAvailable !== 'boolean') return false;
  for (const key of ['roomLabel', 'startTime', 'endTime'] as const) {
    if (typeof v[key] !== 'string') return false;
    if ((v[key] as string).trim() === '') return false;
    if ((v[key] as string).length > INPUT_MAX_LENGTH) return false;
  }
  return true;
}

export function isValidExplanation(
  text: string,
  isAvailable: boolean
): boolean {
  if (typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed === '' || trimmed.length > EXPLANATION_MAX_LENGTH) return false;
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim() !== '').length;
  if (sentences > EXPLANATION_MAX_SENTENCES) return false;
  if (isAvailable && /\bnot available\b|\bunavailable\b/i.test(trimmed)) return false;
  if (!isAvailable && /\bavailable\b/i.test(trimmed) && !/\bnot available\b|\bunavailable\b/i.test(trimmed)) {
    return false;
  }
  return true;
}

export const FALLBACK_TEXT: Record<ReasonCode, string> = {
  AVAILABLE: 'The room is free for this window under the booking rules.',
  OVERLAP: 'The window overlaps an existing booking, so it is not available.',
  ROOM_BLOCKED: 'The room is blocked, so this window is not available.',
  INVALID_TIME: 'The requested time is outside the allowed range or malformed, so this window is not available.',
  PAST_TIME: 'The window starts at or before the current time, so it is not available.',
};

export function buildFallback(reasonCode: ReasonCode): string {
  return FALLBACK_TEXT[reasonCode];
}

const TEMPLATES: Record<ReasonCode, (i: ExplainInput) => string> = {
  AVAILABLE: (i) =>
    `${i.roomLabel} is free from ${i.startTime} to ${i.endTime}. All booking rules passed.`,
  OVERLAP: (i) =>
    `${i.roomLabel} already has a booking overlapping ${i.startTime}–${i.endTime}. Pick a different window.`,
  ROOM_BLOCKED: (i) =>
    `${i.roomLabel} is currently blocked. This window cannot be booked.`,
  INVALID_TIME: (i) =>
    `The window ${i.startTime}–${i.endTime} is outside the allowed range or malformed. Adjust the times and check again.`,
  PAST_TIME: (i) =>
    `The window starting at ${i.startTime} is at or before the current time. Choose a future slot.`,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock LLM adapter. Deterministic templates keyed by reasonCode.
 * The `fault` parameter is a dev switch to simulate failures.
 */
export async function explainAvailability(
  input: ExplainInput,
  fault: MockFault = 'none'
): Promise<ExplainResult> {
  if (!isValidExplainInput(input)) {
    return {
      ok: false,
      error: 'Invalid input for explanation.',
      source: 'fallback',
    };
  }

  if (fault === 'timeout') {
    await sleep(TIMEOUT_MS + 200);
    return { ok: false, error: 'Timed out.', source: 'fallback' };
  }
  if (fault === 'error') {
    throw new Error('Mock LLM error');
  }

  const raw = TEMPLATES[input.reasonCode](input);
  const text = fault === 'contradiction' ? contradict(raw, input) : raw;

  if (!isValidExplanation(text, input.isAvailable)) {
    return {
      ok: false,
      error: 'Generated explanation failed validation.',
      source: 'fallback',
    };
  }
  return { ok: true, explanation: text, source: 'mock' };
}

function contradict(text: string, input: ExplainInput): string {
  const flipped = !input.isAvailable;
  return flipped
    ? `${text} This window is actually available.`
    : `${text} This window is actually not available.`;
}
