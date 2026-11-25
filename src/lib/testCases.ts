import {
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
// T1–T8: Shared contract test cases (used by both the test suite and the UI)
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
// Additional test cases (used by both the test suite and the UI)
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

export { baseInput };
