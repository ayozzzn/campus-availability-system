# Project memory

## Product intent & audience

- Smart Campus room availability checker; users check whether a campus room can be booked for a time range.
- Extended with an optional "Explain availability" feature that generates a plain-text explanation of the booking decision.
- Deterministic rule-based checker remains the authoritative source; LLM-style explanation is supplemental and mock-only.

## Brand personality & voice

- Practical, campus-oriented, technical-but-friendly.
- UI copy clearly distinguishes authoritative status from mock-generated informational text.

## Visual design & UX direction

- Stack: Vite + React + TypeScript + Tailwind CSS; icons via `lucide-react`; imports via `@/` alias to `src/`.
- Result panel split into two visually separated sections: "Booking status (confirmed by rules)" and "Generated explanation (mock, informational only)".
- "Explain availability" button appears only after a check is made; "Regenerate" link shown after first explanation.
- Dev-only fault switch rendered as a dashed amber control bar at the top of the page.

## Decisions, constraints & rationale

- Reason codes: `AVAILABLE`, `OVERLAP`, `ROOM_BLOCKED`, `INVALID_TIME`, `PAST_TIME`.
- Explanation contract: input `{ roomLabel, startTime, endTime, isAvailable, reasonCode }`; output `{ explanation }` — non-empty, ≤240 chars, ≤2 sentences, plain text, must not contradict `isAvailable`.
- Input validation rejects non-objects, empty strings, strings over 200 chars, unknown reason codes.
- Output validation enforces length, sentence count, and contradiction checks.
- Mock adapter (`src/services/explainAdapter.ts`) uses per-reason templates and a `fault` dev switch (`none`, `timeout`, `error`, `contradiction`).
- UI enforces a 3-second race-timeout; any failure/timeout/invalid output falls back to deterministic text built from `reasonCode`.
- Availability checker must not be modified; no login, database, real personal data, or client-side secrets.
- Test suite: 48 tests (20 new) covering adapter, input validation, output validation, and fallback.
- Pre-existing lint failure: unused icon import in room finder component, intentionally left untouched.

## Open questions & assumptions

- Pre-existing lint issue in room finder (unused `lucide-react` import) remains unresolved — may be worth cleaning up if touch policy relaxes.
- Real LLM integration not in scope; adapter is mock-only and labeled as such.