import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  CalendarRange,
  Play,
  Building2,
  Info,
  Sparkles,
  Lock,
  Ban,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import {
  checkAvailability,
  FIXED_BOOKINGS,
  FIXED_NOW,
  ROOM_LABEL,
  type AvailabilityResult,
} from '@/lib/rules';
import {
  CONTRACT_TEST_CASES,
  EXTRA_TEST_CASES,
  type ContractTestCase,
  type ExtraTestCase,
} from '@/lib/rules.test';
import {
  buildFallback,
  explainAvailability,
  TIMEOUT_MS,
  type ExplainResult,
  type MockFault,
} from '@/services/explainAdapter';

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function computeEnd(start: string, durationMinutes: number): string {
  const ts = Date.parse(start);
  if (Number.isNaN(ts)) return '';
  return new Date(ts + durationMinutes * 60 * 1000).toISOString().slice(0, 16);
}

type ContractRow = { tc: ContractTestCase; pass: boolean; detail: string };
type ExtraRow = { tc: ExtraTestCase; observed: AvailabilityResult; pass: boolean };

export default function App() {
  const [start, setStart] = useState<string>('2026-11-26T12:00');
  const [duration, setDuration] = useState<string>('60');
  const [blocked, setBlocked] = useState<boolean>(false);

  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [contractRows, setContractRows] = useState<ContractRow[] | null>(null);
  const [extraRows, setExtraRows] = useState<ExtraRow[] | null>(null);

  const [explanation, setExplanation] = useState<ExplainResult | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [fault, setFault] = useState<MockFault>('none');

  const handleExplain = async () => {
    if (!result) return;
    const input = {
      roomLabel: ROOM_LABEL,
      startTime: start,
      endTime: computeEnd(start, Number(duration)),
      isAvailable: result.available,
      reasonCode: result.reasonCode,
    };
    setExplaining(true);
    setExplanation(null);
    try {
      const timeout = new Promise<ExplainResult>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
      );
      const r = (await Promise.race([explainAvailability(input, fault), timeout])) as ExplainResult;
      setExplanation(
        r.ok && r.source === 'mock'
          ? r
          : { ok: false, error: 'Explanation unavailable.', source: 'fallback' }
      );
    } catch {
      setExplanation({ ok: false, error: 'Explanation unavailable.', source: 'fallback' });
    } finally {
      setExplaining(false);
    }
  };

  const handleCheck = () => {
    const dur = Number(duration);
    const r = checkAvailability({
      start,
      durationMinutes: dur,
      blocked,
      now: FIXED_NOW,
      bookings: FIXED_BOOKINGS,
    });
    setResult(r);
    setExplanation(null);
  };

  const handleRunTests = () => {
    // Snapshot bookings before running any test
    const snapshot = FIXED_BOOKINGS.map((b) => ({ ...b }));

    // Run T1–T7 (availability cases)
    const rows: ContractRow[] = [];
    for (const tc of CONTRACT_TEST_CASES) {
      if (tc.kind === 'availability') {
        const observed = checkAvailability(tc.input);
        const pass =
          observed.available === tc.expectedAvailable &&
          observed.reasonCode === tc.expectedReason;
        rows.push({
          tc,
          pass,
          detail: `${observed.available ? 'Available' : 'Unavailable'} / ${observed.reasonCode}`,
        });
      }
    }

    // T8: verify bookings array deep-equals original snapshot
    const afterSnapshot = FIXED_BOOKINGS.map((b) => ({ ...b }));
    const t8Pass = JSON.stringify(afterSnapshot) === JSON.stringify(snapshot);
    const t8 = CONTRACT_TEST_CASES.find((t) => t.id === 'T8')!;
    rows.push({
      tc: t8,
      pass: t8Pass,
      detail: t8Pass ? 'B1, B2, B3 unchanged' : 'Bookings were mutated!',
    });

    setContractRows(rows);

    // Run additional tests
    const extras: ExtraRow[] = EXTRA_TEST_CASES.map((tc) => {
      const observed = checkAvailability(tc.input);
      const pass =
        observed.available === tc.expectedAvailable &&
        observed.reasonCode === tc.expectedReason;
      return { tc, observed, pass };
    });
    setExtraRows(extras);
  };

  const tone =
    result?.available
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : result && !result.available
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-slate-200 bg-slate-50 text-slate-500';

  const contractPassed = contractRows?.filter((r) => r.pass).length ?? 0;
  const contractTotal = contractRows?.length ?? 0;
  const extraPassed = extraRows?.filter((r) => r.pass).length ?? 0;
  const extraTotal = extraRows?.length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-50 to-slate-100 text-slate-800">
      <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-emerald-400 to-sky-500" />

      {/* Mock fault switch — dev only */}
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-700">
          <span className="font-medium">Mock fault switch (dev only):</span>
          {(['none', 'timeout', 'error', 'contradiction'] as MockFault[]).map((f) => (
            <button
              key={f}
              onClick={() => setFault(f)}
              className={`rounded-full px-2.5 py-0.5 font-medium transition ${
                fault === f
                  ? 'bg-amber-200 text-amber-900'
                  : 'border border-amber-200 bg-white text-amber-600 hover:bg-amber-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <header className="mb-8">
          <div className="flex items-center gap-2.5 text-sky-600">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-wider">Smart Campus</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-slate-800 sm:text-3xl">
            Room Availability Checker
          </h1>
          <p className="mt-2 max-w-lg text-sm text-slate-500">
            Check whether {ROOM_LABEL} can be booked for a time range. This tool does not create or confirm bookings.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Left column: form + existing bookings + demo now */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-lg shadow-sky-100/40 backdrop-blur-sm sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-sky-900">
                <Clock className="h-4 w-4 text-sky-500" />
                Check a time slot
              </h2>

              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-600">Start date &amp; time</span>
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="mt-4 block text-sm">
                <span className="mb-1.5 block font-medium text-slate-600">Duration (minutes, 1–120)</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  placeholder="e.g. 60"
                />
              </label>

              <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm transition hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={blocked}
                  onChange={(e) => setBlocked(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-200"
                />
                <Lock className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-600">Room is blocked</span>
              </label>

              <button
                onClick={handleCheck}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-sky-200 transition hover:from-sky-600 hover:to-sky-700 hover:shadow-lg hover:shadow-sky-200 active:scale-[0.98]"
              >
                Check availability
              </button>
            </section>

            {/* Existing bookings list */}
            <section className="rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-lg shadow-sky-100/40 backdrop-blur-sm sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-sky-900">
                <CalendarRange className="h-4 w-4 text-sky-500" />
                Existing bookings for {ROOM_LABEL}
              </h2>
              <ul className="space-y-2">
                {FIXED_BOOKINGS.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-sm"
                  >
                    <span className="font-mono font-medium text-sky-700">{b.id}</span>
                    <span className="text-slate-600">
                      {formatDateTime(b.start)} → {formatDateTime(b.end)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Demo "now" — prominent */}
            <section className="rounded-2xl border-2 border-sky-200 bg-sky-50/80 p-5 shadow-lg shadow-sky-100/40 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-500">
                    Demo "now" (reference time)
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-sky-900">
                    {formatDateTime(FIXED_NOW)}
                  </p>
                  <p className="mt-0.5 text-xs text-sky-600/70">
                    All availability checks compare the start time against this fixed reference.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right column: result + tests */}
          <div className="space-y-6">
            {/* Result panel */}
            {result && (
              <section
                className={`flex items-start gap-3 rounded-2xl border p-5 shadow-sm transition ${tone}`}
              >
                {result.available ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                    Booking status (confirmed by rules)
                  </p>
                  <p className="mt-0.5 text-base font-bold">
                    {result.available ? 'Available' : 'Unavailable'}
                  </p>
                  <p className="mt-0.5 text-sm opacity-90">{result.message}</p>
                  <p className="mt-1 text-xs font-mono opacity-60">reasonCode: {result.reasonCode}</p>

                  <div className="mt-4 border-t border-current/10 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                      Generated explanation (mock, informational only)
                    </p>
                    {!explanation && (
                      <button
                        onClick={handleExplain}
                        disabled={explaining}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-current/20 px-3 py-1.5 text-xs font-medium transition hover:bg-white/60 disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {explaining ? 'Generating…' : 'Explain availability'}
                      </button>
                    )}
                    {explanation && (
                      <div className="mt-2">
                        {explanation.ok ? (
                          <p className="text-sm">{explanation.explanation}</p>
                        ) : (
                          <p className="text-sm">
                            {buildFallback(result.reasonCode)}
                            <span className="mt-1 block text-xs opacity-60">
                              Mock explanation unavailable — showing rule-based fallback.
                            </span>
                          </p>
                        )}
                        <button
                          onClick={handleExplain}
                          disabled={explaining}
                          className="mt-2 inline-flex items-center gap-1 text-xs opacity-60 transition hover:opacity-90 disabled:opacity-30"
                        >
                          <Sparkles className="h-3 w-3" />
                          {explaining ? 'Generating…' : 'Regenerate'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {!result && (
              <section className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-5 text-sm text-slate-500 shadow-sm">
                <Info className="h-5 w-5 shrink-0 text-sky-400" />
                Enter a start time and duration, then click "Check availability" to see the result.
              </section>
            )}

            {/* Contract tests T1–T8 */}
            <section className="rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-lg shadow-sky-100/40 backdrop-blur-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-sky-900">
                  <FlaskConical className="h-4 w-4 text-sky-500" />
                  Contract tests (T1–T8)
                </h2>
                <button
                  onClick={handleRunTests}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.98]"
                >
                  <Play className="h-3.5 w-3.5" />
                  Run tests
                </button>
              </div>

              {contractRows ? (
                <>
                  <div className="mb-3 flex items-center gap-2 text-xs font-medium">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 ${
                        contractPassed === contractTotal
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {contractPassed === contractTotal ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Ban className="h-3.5 w-3.5" />
                      )}
                      {contractPassed} / {contractTotal} passed
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400">
                          <th className="py-2 pr-2 font-medium">ID</th>
                          <th className="py-2 pr-2 font-medium">Scenario</th>
                          <th className="py-2 pr-2 font-medium">Expected</th>
                          <th className="py-2 pr-2 font-medium">Observed</th>
                          <th className="py-2 font-medium">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contractRows.map(({ tc, pass, detail }) => (
                          <tr key={tc.id} className="border-b border-slate-100 last:border-0">
                            <td className="py-2 pr-2 font-mono font-medium text-sky-700">{tc.id}</td>
                            <td className="py-2 pr-2 text-slate-600">{tc.label}</td>
                            <td className="py-2 pr-2 text-slate-500">
                              {tc.kind === 'availability' ? (
                                <>
                                  <span
                                    className={`font-medium ${
                                      tc.expectedAvailable ? 'text-emerald-600' : 'text-rose-600'
                                    }`}
                                  >
                                    {tc.expectedAvailable ? 'Available' : 'Unavailable'}
                                  </span>
                                  <span className="block font-mono text-[10px] text-slate-400">
                                    {tc.expectedReason}
                                  </span>
                                </>
                              ) : (
                                <span className="flex items-center gap-1 text-slate-500">
                                  <ShieldCheck className="h-3 w-3" />
                                  Bookings unchanged
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-2 text-slate-500">{detail}</td>
                            <td className="py-2">
                              {pass ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-rose-500" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400">
                  Click "Run tests" to execute T1–T8 against the rules engine and see expected vs observed results.
                </p>
              )}
            </section>

            {/* Additional tests */}
            {extraRows && (
              <section className="rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-lg shadow-sky-100/30 backdrop-blur-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <FlaskConical className="h-4 w-4 text-slate-400" />
                    Additional tests
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      extraPassed === extraTotal
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {extraPassed} / {extraTotal} passed
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="py-2 pr-2 font-medium">ID</th>
                        <th className="py-2 pr-2 font-medium">Scenario</th>
                        <th className="py-2 pr-2 font-medium">Expected</th>
                        <th className="py-2 pr-2 font-medium">Observed</th>
                        <th className="py-2 font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extraRows.map(({ tc, observed, pass }) => (
                        <tr key={tc.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 pr-2 font-mono font-medium text-slate-500">{tc.id}</td>
                          <td className="py-2 pr-2 text-slate-600">{tc.label}</td>
                          <td className="py-2 pr-2">
                            <span
                              className={`font-medium ${
                                tc.expectedAvailable ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {tc.expectedAvailable ? 'Available' : 'Unavailable'}
                            </span>
                            <span className="block font-mono text-[10px] text-slate-400">
                              {tc.expectedReason}
                            </span>
                          </td>
                          <td className="py-2 pr-2">
                            <span
                              className={`font-medium ${
                                observed.available ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {observed.available ? 'Available' : 'Unavailable'}
                            </span>
                            <span className="block font-mono text-[10px] text-slate-400">
                              {observed.reasonCode}
                            </span>
                          </td>
                          <td className="py-2">
                            {pass ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-rose-500" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-400">
          Fictional data · {ROOM_LABEL} only · Availability check only · No bookings are created
        </footer>
      </div>
    </div>
  );
}
