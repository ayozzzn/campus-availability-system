# Smart Campus — Background Agent Review Checklist

Read-only checklist. The agent follows every section in order and records evidence for each item. The agent does not merge, deploy, or push without an explicit human approval gate (Section 8).

## 0. Definitions

- **Agent**: the background coding agent making changes.
- **Reviewer**: the human who approves or rejects the agent's work.
- **Acceptance**: the state where all sections pass and the Reviewer has signed Section 8.
- **Tool execution**: a real shell, test, build, or MCP command that returned output in this session. A statement that something "would pass" or "should work" is not a tool execution.

## 1. Isolated branch or worktree

- [ ] All changes are made on a branch or worktree separate from the main working line. No changes land directly on the default branch.
- [ ] The branch name is descriptive of the task (e.g. `room-selector-ui`, not `patch-1`).
- [ ] Record: the branch or worktree name used.

Evidence required: the branch/worktree name and the command that confirms the agent is on it.

## 2. No credentials

- [ ] No API keys, passwords, tokens, private keys, or connection strings are added to source, config, or any file under version control.
- [ ] No `import.meta.env` value carries a secret. Values prefixed with `VITE_` are public in the shipped bundle.
- [ ] No `.env`, `.env.local`, `credentials.json`, `*.pem`, or `*.key` file is created or modified.
- [ ] The Supabase service role key is never used in client code.

Evidence required: a search of the diff for `password`, `secret`, `apikey`, `token`, `Bearer`, `-----BEGIN`, `VITE_`, and `.env` showing no secret values.

## 3. No deployment

- [ ] No external service, edge function, webhook, or database migration is deployed.
- [ ] No `fetch`, `axios`, `XMLHttpRequest`, or Supabase client call is added to the app. Smart Campus is a local-only, fictional-data calculator.
- [ ] No CI/CD pipeline, deployment config, or hosting setting is modified.
- [ ] The `@supabase/supabase-js` dependency is not introduced into application code.

Evidence required: a search of the diff for `fetch(`, `supabase`, `deploy`, `migration`, and network call patterns showing no new external calls.

## 4. Test and build commands

Run each command and paste the real terminal output into the evidence block. Do not summarize or paraphrase.

- [ ] `npm run typecheck` — must exit 0.
- [ ] `npm test` — must exit 0 with all tests passing.
- [ ] `npm run build` — must exit 0.

Evidence required: the full stdout tail of each command, including the exit code or the test count line. If a command was not run, state that plainly and do not claim it passed.

## 5. Constraint preservation

For each constraint in `AGENTS.md`, confirm the change does not violate it and record the file or function that proves it.

- [ ] AC1–AC6: the logic in `src/lib/roomAvailability.ts` (`canBook`) is unchanged, or if changed, every AC is re-verified by a test. Record which tests cover each AC.
- [ ] No login or database: no auth flow, no Supabase table, no migration is added.
- [ ] No booking creation: the app only checks availability; no write operation persists a booking.
- [ ] No secrets: covered by Section 2.
- [ ] No external deployments: covered by Section 3.
- [ ] Booking fixtures are not mutated: `DEFAULT_BOOKINGS` and `ROOMS` are frozen and no test or function mutates them. Record the test that asserts this (`fixtures stay unchanged`).

Evidence required: a one-line citation per constraint naming the file, function, or test that confirms it.

## 6. Risk register update

Review the existing risk register (from the most recent security or code review). For each change in this session:

- [ ] Does the change introduce a new risk in any of these categories: correctness, security, privacy, reliability, maintainability, agent operations?
- [ ] Does the change resolve or mitigate an existing risk?
- [ ] If a new risk is identified, record: category, file/function, impact, and a verification method.

If no new risks are introduced and no existing risks are resolved, state that explicitly. Do not leave the section empty.

Evidence required: the list of new, resolved, or unchanged risks with citations.

## 7. Evidence for each claim

Every checkbox in Sections 1–6 must be backed by concrete evidence in the format:

```
[Section X.Y] Claim: <what is claimed>
Evidence: <real tool output, file path + line, or search result>
```

Rules:

- A claim with no evidence is treated as unverified. List it under "Unverified claims" instead of checking the box.
- Evidence must come from a real tool execution in this session. Copied output from a prior session is invalid.
- If evidence requires a running instance, secret, or component not in the repository, mark the claim as "deferred — requires deployment testing" and do not check the box.

## 8. Changed files summary

List every file created, modified, or deleted in this session. For each file, give a one-sentence description of what changed and why.

```
<path> — <created/modified/deleted> — <one-sentence rationale>
```

- [ ] No orphaned files, dead exports, or commented-out code blocks are left behind.
- [ ] The list matches the actual diff. A reviewer can diff the branch against the base and confirm every entry.

Evidence required: the full file list with statuses.

## 9. Human approval gate

The agent does not merge, push, or close the branch until this section is filled by the Reviewer.

- [ ] Reviewer has read Sections 1–8.
- [ ] Reviewer has inspected the diff.
- [ ] Reviewer confirms all evidence blocks contain real tool output.
- [ ] Reviewer confirms no unverified or deferred claims are checked.
- [ ] Reviewer decision: [ ] Approved [ ] Rejected [ ] Changes requested

```
Reviewer: ____________________
Date:    ____________________
Decision: ____________________
Notes:   ____________________
```

The agent stops here and waits. No merge, no deploy, no push.
