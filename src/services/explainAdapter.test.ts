import { describe, expect, it } from 'vitest';
import {
  buildFallback,
  explainAvailability,
  isValidExplanation,
  isValidExplainInput,
} from '@/services/explainAdapter';

const baseInput = {
  roomLabel: 'Room A-101',
  startTime: '10:00',
  endTime: '11:00',
  isAvailable: true,
  reasonCode: 'AVAILABLE' as const,
};

describe('input validation', () => {
  it('accepts a well-formed input', () => {
    expect(isValidExplainInput(baseInput)).toBe(true);
  });

  it('rejects non-objects', () => {
    expect(isValidExplainInput(null)).toBe(false);
    expect(isValidExplainInput('available')).toBe(false);
    expect(isValidExplainInput(42)).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(isValidExplainInput({ ...baseInput, roomLabel: ' ' })).toBe(false);
    expect(isValidExplainInput({ ...baseInput, startTime: '' })).toBe(false);
  });

  it('rejects strings over 200 chars', () => {
    expect(isValidExplainInput({ ...baseInput, roomLabel: 'x'.repeat(201) })).toBe(false);
  });

  it('rejects unknown reason codes', () => {
    expect(isValidExplainInput({ ...baseInput, reasonCode: 'MAYBE' })).toBe(false);
  });

  it('rejects a non-boolean isAvailable', () => {
    expect(isValidExplainInput({ ...baseInput, isAvailable: 'yes' })).toBe(false);
  });
});

describe('output validation', () => {
  it('accepts a plain sentence within limits', () => {
    expect(isValidExplanation('Room A-101 is free from 10:00 to 11:00. All rules passed.', true)).toBe(true);
  });

  it('rejects empty text', () => {
    expect(isValidExplanation('  ', true)).toBe(false);
  });

  it('rejects text over 240 chars', () => {
    expect(isValidExplanation('a'.repeat(241), true)).toBe(false);
  });

  it('rejects more than 2 sentences', () => {
    const long = 'One. Two. Three. Four.';
    expect(isValidExplanation(long, true)).toBe(false);
  });

  it('rejects a contradiction: says available when it is not', () => {
    expect(isValidExplanation('The room is available then.', false)).toBe(false);
  });

  it('rejects a contradiction: says unavailable when it is', () => {
    expect(isValidExplanation('The room is not available then.', true)).toBe(false);
  });

  it('accepts a negative phrasing when isAvailable is false', () => {
    expect(isValidExplanation('The room is not available then.', false)).toBe(true);
  });
});

describe('mock adapter', () => {
  it('returns a template explanation for a valid input', async () => {
    const r = await explainAvailability(baseInput);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.source).toBe('mock');
      expect(r.explanation).toContain('Room A-101');
    }
  });

  it('returns fallback for an invalid input', async () => {
    const r = await explainAvailability({ ...baseInput, roomLabel: '' });
    expect(r.ok).toBe(false);
    expect(r.source).toBe('fallback');
  });

  it('falls back when the generated text is over the length cap', async () => {
    const r = await explainAvailability({
      ...baseInput,
      roomLabel: 'R'.repeat(195),
      startTime: 's'.repeat(180),
      endTime: 'e'.repeat(180),
    });
    expect(r.ok).toBe(false);
    expect(r.source).toBe('fallback');
  });

  it('falls back on simulated timeout', async () => {
    const r = await explainAvailability(baseInput, 'timeout');
    expect(r.ok).toBe(false);
    expect(r.source).toBe('fallback');
  });

  it('falls back on simulated error', async () => {
    await expect(explainAvailability(baseInput, 'error')).rejects.toThrow('Mock LLM error');
  });

  it('falls back when the mock produces a contradiction', async () => {
    const r = await explainAvailability(baseInput, 'contradiction');
    expect(r.ok).toBe(false);
    expect(r.source).toBe('fallback');
  });
});

describe('fallback text', () => {
  it('is non-empty, within length, and at most 2 sentences for every reason code', () => {
    for (const code of ['AVAILABLE', 'OVERLAP', 'ROOM_BLOCKED', 'INVALID_TIME', 'PAST_TIME'] as const) {
      const text = buildFallback(code);
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text.length).toBeLessThanOrEqual(240);
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim() !== '').length;
      expect(sentences).toBeLessThanOrEqual(2);
    }
  });
});
