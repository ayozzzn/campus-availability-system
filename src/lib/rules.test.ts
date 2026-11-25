import { describe, expect, it } from 'vitest';
import {
  checkAvailability,
  isOverlapping,
  validateInput,
  FIXED_BOOKINGS,
  FIXED_NOW,
  type AvailabilityInput,
  type ReasonCode,
} from '@/lib/rules';

const baseInput = (overrides: Partial<AvailabilityInput> = {}): AvailabilityInput => ({
  start: '2026-11-26T12:00',
  durationMinutes: 60,
  blocked: false,
  now: FIXED_NOW,
  bookings: FIXED_BOOKINGS,
  ...overrides,
});

// ---------------------------------------------------------------------------
// T1–T8: Shared contract test cases (exported for UI use)
// ---------------------------------------------------------------------------

export type ContractTestCase =
  | {
      kind: 'availability';
      id: string;
      label: string;
      input: AvailabilityInput;
      expectedAvailable: boolean;
      expectedReason: ReasonCode;
    }
  | {
      kind: 'immutability';
      id: string;
      label: string;
    };

export const CONTRACT_TEST_CASES: readonly ContractTestCase[] = Object.freeze([
  {
    kind: 'availability',
    id: 'T1',
    label: 'Free slot at 12:00 (no overlap)',
    input: baseInput({ start: '2026-11-26T12:00', durationMinutes: 60 }),
    expectedAvailable: true,
    expectedReason: 'AVAILABLE',
  },
  {
    kind: 'availability',
    id: 'T2',
    label: 'Slot overlapping B1 (10:30–11:30)',
    input: baseInput({ start: '2026-11-26T10:30', durationMinutes: 60 }),
    expectedAvailable: false,
    expectedReason: 'OVERLAP',
  },
  {
    kind: 'availability',
    id: 'T3',
    label: 'Free slot but room blocked',
    input: baseInput({ start: '2026-11-26T12:00', durationMinutes: 60, blocked: true }),
    expectedAvailable: false,
    expectedReason: 'ROOM_BLOCKED',
  },
  {
    kind: 'availability',
    id: 'T4',
    label: 'Duration zero (invalid)',
    input: baseInput({ start: '2026-11-26T12:00', durationMinutes: 0 }),
    expectedAvailable: false,
    expectedReason: 'INVALID_DURATION',
  },
  {
    kind: 'availability',
    id: 'T5',
    label: 'Duration 121 (exceeds max)',
    input: baseInput({ start: '2026-11-26T12:00', durationMinutes: 121 }),
    expectedAvailable: false,
    expectedReason: 'INVALID_DURATION',
  },
  {
    kind: 'availability',
    id: 'T6',
    label: 'Start time in the past (2026-11-24)',
    input: baseInput({ start: '2026-11-24T10:00', durationMinutes: 60 }),
    expectedAvailable: false,
    expectedReason: 'INVALID_START_PAST',
  },
  {
    kind: 'availability',
    id: 'T7',
    label: 'Adjacent to B1 end (11:00, half-open)',
    input: baseInput({ start: '2026-11-26T11:00', durationMinutes: 60 }),
    expectedAvailable: true,
    expectedReason: 'AVAILABLE',
  },
  {
    kind: 'immutability',
    id: 'T8',
    label: 'Bookings array unchanged after T1–T7',
  },
]);

// ---------------------------------------------------------------------------
// Additional test cases (exported for UI use)
// ---------------------------------------------------------------------------

export type ExtraTestCase = {
  id: string;
  label: string;
  input: AvailabilityInput;
  expectedAvailable: boolean;
  expectedReason: ReasonCode;
};

export const EXTRA_TEST_CASES: readonly ExtraTestCase[] = Object.freeze([
  {
    id: 'A1',
    label: 'Invalid input (non-string start)',
    input: { start: 123, durationMinutes: 60, blocked: false, now: FIXED_NOW, bookings: FIXED_BOOKINGS } as unknown as AvailabilityInput,
    expectedAvailable: false,
    expectedReason: 'INVALID_INPUT',
  },
  {
    id: 'A2',
    label: 'Start equals now (boundary)',
    input: baseInput({ start: FIXED_NOW }),
    expectedAvailable: false,
    expectedReason: 'INVALID_START_PAST',
  },
  {
    id: 'A3',
    label: 'Fractional duration (30.5 min)',
    input: baseInput({ durationMinutes: 30.5 }),
    expectedAvailable: false,
    expectedReason: 'INVALID_DURATION',
  },
  {
    id: 'A4',
    label: 'Blocked + overlap (blocked takes priority)',
    input: baseInput({ start: '2026-11-26T10:30', durationMinutes: 60, blocked: true }),
    expectedAvailable: false,
    expectedReason: 'ROOM_BLOCKED',
  },
  {
    id: 'A5',
    label: 'Gap between B1 and B2 (11:00, 120 min)',
    input: baseInput({ start: '2026-11-26T11:00', durationMinutes: 120 }),
    expectedAvailable: true,
    expectedReason: 'AVAILABLE',
  },
]);

// ---------------------------------------------------------------------------
// T1–T8 contract tests
// ---------------------------------------------------------------------------

describe('T1–T8 contract tests', () => {
  for (const tc of CONTRACT_TEST_CASES) {
    if (tc.kind === 'availability') {
      it(`${tc.id}: ${tc.label}`, () => {
        const result = checkAvailability(tc.input);
        expect(result.available).toBe(tc.expectedAvailable);
        expect(result.reasonCode).toBe(tc.expectedReason);
      });
    }
  }

  it('T8: bookings array deep-equals original snapshot after T1–T7', () => {
    const snapshot = FIXED_BOOKINGS.map((b) => ({ ...b }));
    for (const tc of CONTRACT_TEST_CASES) {
      if (tc.kind === 'availability') {
        checkAvailability(tc.input);
      }
    }
    expect(FIXED_BOOKINGS.map((b) => ({ ...b }))).toEqual(snapshot);
  });
});

// ---------------------------------------------------------------------------
// Additional tests
// ---------------------------------------------------------------------------

describe('Additional tests', () => {
  describe('extra availability cases', () => {
    for (const tc of EXTRA_TEST_CASES) {
      it(`${tc.id}: ${tc.label}`, () => {
        const result = checkAvailability(tc.input);
        expect(result.available).toBe(tc.expectedAvailable);
        expect(result.reasonCode).toBe(tc.expectedReason);
      });
    }
  });

  describe('validateInput', () => {
    it('returns AVAILABLE for a valid input', () => {
      expect(validateInput(baseInput())).toBe('AVAILABLE');
    });

    it('returns INVALID_INPUT for null', () => {
      expect(validateInput(null)).toBe('INVALID_INPUT');
    });

    it('returns INVALID_INPUT for non-object', () => {
      expect(validateInput('hello')).toBe('INVALID_INPUT');
      expect(validateInput(42)).toBe('INVALID_INPUT');
    });

    it('returns INVALID_INPUT for missing bookings array', () => {
      expect(validateInput({ start: '2026-11-26T10:00', durationMinutes: 60, blocked: false, now: FIXED_NOW })).toBe('INVALID_INPUT');
    });

    it('returns INVALID_START_PAST when start equals now', () => {
      expect(validateInput(baseInput({ start: FIXED_NOW }))).toBe('INVALID_START_PAST');
    });

    it('returns INVALID_DURATION for fractional duration', () => {
      expect(validateInput(baseInput({ durationMinutes: 30.5 }))).toBe('INVALID_DURATION');
    });

    it('returns INVALID_DURATION for negative duration', () => {
      expect(validateInput(baseInput({ durationMinutes: -5 }))).toBe('INVALID_DURATION');
    });
  });

  describe('isOverlapping', () => {
    it('returns false for adjacent intervals (half-open)', () => {
      expect(isOverlapping('2026-11-26T10:00', '2026-11-26T11:00', '2026-11-26T11:00', '2026-11-26T12:00')).toBe(false);
    });

    it('returns true for partially overlapping intervals', () => {
      expect(isOverlapping('2026-11-26T10:30', '2026-11-26T11:30', '2026-11-26T10:00', '2026-11-26T11:00')).toBe(true);
    });

    it('returns true for fully contained interval', () => {
      expect(isOverlapping('2026-11-26T10:15', '2026-11-26T10:45', '2026-11-26T10:00', '2026-11-26T11:00')).toBe(true);
    });

    it('returns false for completely separate intervals', () => {
      expect(isOverlapping('2026-11-26T08:00', '2026-11-26T09:00', '2026-11-26T14:00', '2026-11-26T15:00')).toBe(false);
    });

    it('returns false for invalid date strings', () => {
      expect(isOverlapping('invalid', '2026-11-26T11:00', '2026-11-26T11:00', '2026-11-26T12:00')).toBe(false);
    });
  });

  describe('check order', () => {
    it('checks INVALID_START_PAST before INVALID_DURATION', () => {
      const result = checkAvailability(baseInput({ start: '2026-11-25T09:00', durationMinutes: 0 }));
      expect(result.reasonCode).toBe('INVALID_START_PAST');
    });

    it('checks INVALID_DURATION before ROOM_BLOCKED', () => {
      const result = checkAvailability(baseInput({ durationMinutes: 200, blocked: true }));
      expect(result.reasonCode).toBe('INVALID_DURATION');
    });

    it('checks ROOM_BLOCKED before OVERLAP', () => {
      const result = checkAvailability(baseInput({ start: '2026-11-26T10:30', durationMinutes: 60, blocked: true }));
      expect(result.reasonCode).toBe('ROOM_BLOCKED');
    });
  });

  describe('fixtures integrity', () => {
    it('has exactly three fixed bookings', () => {
      expect(FIXED_BOOKINGS).toHaveLength(3);
      expect(FIXED_BOOKINGS.map((b) => b.id)).toEqual(['B1', 'B2', 'B3']);
    });
  });
});
