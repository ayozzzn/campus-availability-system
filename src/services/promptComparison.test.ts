import { describe, expect, it } from 'vitest';
import { runComparison } from '@/services/promptComparison';

const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));

describe('prompt comparison (dev-only)', () => {
  it('runs all prompts on all scenarios', () => {
    const rows = runComparison();
    expect(rows).toHaveLength(18); // 3 prompts × 6 scenarios

    const header =
      '| Prompt   | Scenario           | isAvail | Valid | Agrees | Explanation\n' +
      '|----------|--------------------|---------|-------|--------|------------';
    const body = rows
      .map(
        (r) =>
          `| ${pad(r.prompt, 8)} | ${pad(r.scenario, 18)} | ${String(r.isAvailable).padEnd(7)} | ${String(r.valid).padEnd(5)} | ${String(r.agrees).padEnd(6)} | ${r.explanation}`
      )
      .join('\n');
    console.log(`${header}\n${body}`);
  });
});
