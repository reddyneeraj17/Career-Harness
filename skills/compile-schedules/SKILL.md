<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: compile-schedules
version: "1.0.1"
description: Validates profile.yaml and compiles every campaign cron body from it, writing schedules_manifest.json.
---

# compile-schedules

## Inputs

```json
{
  "profile_path": "~/workspace/profile.yaml"
}
```

The profile is the single human-editable rule source. Templates live at `~/workspace/templates/<campaign>.body.md`; the schema at `~/workspace/templates/profile.schema.yaml`.

## Actions called

- `profile_put` — sync the validated `profile.yaml` into the `profile` table; returns `profile_hash`. DB and bodies render from the same facts.
- `event_log` — one exit row with the verdict, plus a manifest row carrying the compiled manifest summary.
- `cron.add` / `cron.update` / `cron.view` — Muse platform scheduler primitives (not harness-core actions), invoked directly by this skill: save compiled bodies, verify the saved bodies by reading them back.

## Compile steps

1. **Validate.** Validate `profile.yaml` against `templates/profile.schema.yaml` (required keys, enums). Fail loudly on any missing key. Never render a half-profile.
2. **Sync.** `profile_put` — the DB and the bodies must agree; a compiled body rendered from stale facts is a bug. The `profile_put` args are the **parsed `profile.yaml` itself** (validated in step 1) — serialize from the real file, never hand-build the dict from memory or chat. Use the returned `profile_hash` as the manifest's profile hash — the server owns the canonical hash (§8); never compute your own.
3. **Render.** Render each `templates/<campaign>.body.md` with `{{ }}` placeholders filled from the profile. A placeholder with no value FAILS the compile. `[FILL IN]` never ships. `{{chat_id}}` (browser_watch template) renders from the chat this compile runs in — read it from the worker's own runtime context; the watch job owns its delivery chat (§8). The campaign set is the `campaigns` map in `templates/profile.schema.yaml` — currently 13 entries: the 12 campaigns plus `schedule_trigger_dispatch`, the control-plane dispatcher for the dashboard's "Trigger now" buttons (default cadence `every 2m`, always compiled even when every campaign is disabled; without it, queued triggers sit unpicked forever).
4. **Save.** `cron.update` for existing jobs whose rendered body actually changed
   (compare against `cron.view` first); `cron.add` if a job is missing, or on
   first install. Bodies are thin: invoke the run-coordinator skill with
   `campaign_id`, then the standard footer (run_close, report rule).
   **Cadence and enabled come from `campaigns.<name>` in the profile:** when the
   entry is present, its `cadence` sets the job's schedule and `enabled: false`
   saves the job DISABLED — never deleted; re-enabling is a recompile, not
   archaeology. When the entry is absent, fall back to the template/skill-convention
   default cadence and treat the job as enabled. (The dashboard's `schedule_update`
   action is the supported writer of these entries; the profile_watch job picks
   them up within ~15 min.)
5. **Verify and manifest.** `cron.view` each job back; sha256 each saved body; write `~/workspace/schedules_manifest.json`. Every entry in `jobs` MUST carry the full per-job schema the dashboard validates: `job_id`, `title`, `campaign`, `cadence`, `schedule` (the concrete schedule string, e.g. `daily@07:00 America/Chicago`), `enabled` (boolean), `body_hash` — plus top-level skill versions, `profile_hash`, `compiled_at`. The dashboard's manifest schema requires all seven per-job fields; omitting `title`, `schedule`, or `enabled` fails validation and the Schedules tab renders as "manifest missing". Never write a reduced schema.
6. **Log.** `event_log` the manifest summary.

**A rule stated in chat is not live until this skill runs.** Say so every time.

## Output

```json
{"skill":"compile-schedules","version":"1.0.0","verdict":"pass|reject","score":0-100,
 "reasons":["5 bodies compiled","manifest sha256 abc123"],
 "evidence":{"profile_hash":"...","jobs":[{"job_id":"...","campaign":"...","body_hash":"..."}],"manifest_path":"~/workspace/schedules_manifest.json"},
 "tokens":1234}
```

- `pass`: all bodies compiled, verified against `cron.view`, manifest written. `reject`: validation or placeholder failure — the compile stopped and nothing was saved; the reasons list names the missing key or placeholder.

## Hard limits

- Never render a body from an unvalidated profile. Missing key -> fail loudly, fix the profile, re-run.
- Never ship a placeholder with no value; never ship `[FILL IN]`.
- Never delete a cron job to disable a campaign; use `enabled: false`.
- Never hand-edit a saved cron body; recompile from the profile. The profile-watch
  ops job auto-recompiles within ~15 min of any profile.yaml change; the doctor
  remains report-only as the drift backstop.
- The manifest is the compiled-vs-live truth; dashboards read it, not chat history.
- No personal data in this file; customer facts come from the profile only.
- Append one `event_log` row on exit, always.
