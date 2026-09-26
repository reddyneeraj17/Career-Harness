---
name: compile-schedules
version: "1.0.0"
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
2. **Sync.** `profile_put` — the DB and the bodies must agree; a compiled body rendered from stale facts is a bug.
3. **Render.** Render each `templates/<campaign>.body.md` with `{{ }}` placeholders filled from the profile. A placeholder with no value FAILS the compile. `[FILL IN]` never ships.
4. **Save.** `cron.update` for existing jobs; `cron.add` on first install. Bodies are thin: invoke the run-coordinator skill with `campaign_id`, then the standard footer (run_close, report rule). Disabled campaigns are saved with `enabled: false`, never deleted — re-enabling is a recompile, not archaeology.
5. **Verify and manifest.** `cron.view` each job back; sha256 each saved body; write `~/workspace/schedules_manifest.json` with: job id, campaign, cadence, body hash, skill versions, profile_hash, compiled_at.
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
- Never hand-edit a saved cron body; recompile from the profile. The doctor reports drift; it never auto-recompiles.
- The manifest is the compiled-vs-live truth; dashboards read it, not chat history.
- No personal data in this file; customer facts come from the profile only.
- Append one `event_log` row on exit, always.
