# Board session — test fixtures (§6)

Fixtures for the job-board-search session probe + re-login (skill 1.3.0)
and the run-coordinator's loud-failure handling (skill 1.18.0). B1–B3 are
validated live against the real skills.

## B1 — logged_out recovers via re-login

`boards = ["dice", "indeed"]`. Probe: dice → `logged_out` (login form, no
challenge); indeed → `healthy`.

Expected:
- dice: one re-login attempt with the vault's saved login; no OTP needed;
  re-probe → `healthy`. `boards_session`: dice
  `{session: healthy, relogin_attempted: true, relogin_ok: true}`, indeed
  `{session: healthy, relogin_attempted: false}`.
- Both boards swept; verdict `pass`.

## B2 — challenge_wall reported distinctly from logged_out

`boards = ["glassdoor", "ziprecruiter", "dice"]`. Probe: glassdoor →
`challenge_wall` ("verify you are human"); ziprecruiter → `logged_out`;
dice → `healthy`. Re-login on ziprecruiter: credentials rejected →
stays `logged_out`.

Expected:
- No re-login attempted on glassdoor (challenge walls are never bypassed).
- Sweep runs on dice only. Verdict `hold`; reasons name
  `glassdoor=challenge_wall` and `ziprecruiter=logged_out after failed
  re-login` as distinct states, never one "auth issue".
- Coordinator writes `board_session_check` event_log row; the run's report
  names both dead boards and states.

## B3 — zero usable boards fails loudly

`boards = ["dice", "indeed"]`. Probe: dice → `challenge_wall`; indeed →
`logged_out`, re-login fails.

Expected:
- Verdict `reject`, reason starts `all boards unusable:` and lists both
  board=state pairs.
- Coordinator: `run_close(status="failed",
  blocker="job-board sessions dead: dice=challenge_wall,
  indeed=logged_out")`, one `event_log` row `board_session_failed`, loud
  report. The run is never closed as a pass and never silently retried
  in-run.
