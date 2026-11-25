import { describe, expect, it } from 'vitest';
import {
  checkAvailability,
  isOverlapping,
  validateInput,
  FIXED_BOOKINGS,
  FIXED_NOW,
} from '@/lib/rules';
import {
  CONTRACT_TEST_CASES,
  EXTRA_TEST_CASES,
  baseInput,
} from '@/lib/testCases';

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
