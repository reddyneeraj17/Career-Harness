# INSTALL_LAYOUT.md — where every file goes in the customer's workspace

The kit ships as one folder (`harness-kit/`). `install/install.sh` performs
the entire arrangement below automatically — this document is the map it
follows, so you can verify the result by hand. Anything marked **script**
is done by `install.sh`; **agent** means the customer's Muse does it while
following `INSTALL.md`; **human** means the customer does it.

## The rule of the layout

Muse only "recognizes" things in their canonical places. Skills load from
`~/workspace/skills/`. Schedule templates compile from
`~/workspace/templates/`. The profile lives at `~/workspace/profile.yaml`.
Goals live at `~/workspace/goals/`. Nothing works from inside the kit
folder except the kit's own source files, which the agent reads in place.

## File-by-file map

| Kit path | Customer destination | Moved by | Purpose |
|---|---|---|---|
| `skills/` (31 skills) | `~/workspace/skills/` | **script** | The logic layer. Read-only after staging. This exact path is where Muse discovers skills. |
| `templates/*.body.md` + `profile.schema.yaml` | `~/workspace/templates/` | **script** | Cron body templates + the profile validation schema. Read-only after staging. |
| `harness-core/` (client/, server/, drizzle/, space.json) | *stays in the kit* (`~/workspace/harness-kit/harness-core/`) | — | Source the **agent** reads to build the `harness-core` dashboard artifact. Never copied elsewhere; never edited. |
| `harness-core/drizzle/*.sql` | applied into the artifact's database, in filename order | **agent** | Ordered migrations. Never skipped, never hand-edited. |
| `seed/h1b_employer_hub.csv` | imported into `h1b_sponsors` table | **agent** (`h1b_import`) | H-1B sponsorship data. Read from the kit in place. |
| `seed/companies_seed.csv` | imported into `companies` table | **agent** (`companies_import`) | Tier/industry/ATS seed list. Read from the kit in place. |
| `goal-skeletons/*/` | `~/workspace/goals/<campaign>/` (+ `crons/`, `files/`, `hidden_files/`, `briefs/`, `agent_notes/`, `references/` subdirs) | **script** | Per-campaign goal dirs. Script never overwrites an existing goal dir. |
| `profile.example.yaml` | `~/workspace/profile.yaml` | **script** (only if missing) | The customer's live profile. The **customer** fills it in the dashboard's guided setup wizard on first run; the dashboard's Profile tab edits it afterwards. This is the one customer-owned config file. |
| *(customer's resume PDF)* | `~/workspace/user/files/` | **human** | Script creates the folder. The customer drops their resume here; the filename must match `profile.yaml`. |
| `install/install.sh` | *stays in the kit* | — | Fresh-install staging. Idempotent; safe to re-run. |
| `install/upgrade.sh` | *stays in the kit* | — | Version upgrades / rollbacks. |
| `install/MANIFEST.sha256` | *stays in the kit* | — | Checksum of every kit file; `--check` verifies it. |
| `CUSTOMER_RULES.md`, `PACKAGING.md`, `README.md`, `CHANGELOG.md`, `VERSION`, `.gitignore` | *stay in the kit* | — | Documentation and release metadata. Read, don't move. |
| `docs/OPERATOR.md` | *stays in the kit* (`docs/`) | — | The customer's manual. |
| `docs/job-apply-harness-blueprint-v2.pdf` | *stays in the kit* (`docs/`) | — | Architecture spec. Reference only. |

## What the script does NOT place (the agent does, per INSTALL.md)

1. **Build the `harness-core` artifact** from the kit's `harness-core/`
   source — a shell script cannot call the artifact builder; the agent does.
2. **Run the drizzle migrations** in order against the new artifact's DB.
3. **Import the seeds** via the `h1b_import` / `companies_import` actions.
4. **Compile the schedules** from `~/workspace/profile.yaml` via the
   `compile-schedules` skill, then write `schedules_manifest.json`.
5. **Connect the customer's accounts** (Secure Vault / connector flows).

After `install.sh` finishes, it prints these as a numbered runbook so the
agent (or the human driving it) can't miss a step.

## Verifying the arrangement

```sh
./install/install.sh --check   # verifies kit integrity, checksums, no-PII; changes nothing
```

Then confirm by hand: `~/workspace/skills/` holds 31 skills,
`~/workspace/templates/` holds the body templates + `profile.schema.yaml`,
`~/workspace/goals/` holds 5 campaign dirs, `~/workspace/profile.yaml`
exists, and `~/workspace/user/files/` is ready for the resume.

## What never lands in the customer's workspace

`profile.yaml` with real data, any resume, any `.db` file, credentials,
run logs, `hidden_files/` contents — these are created live in the
customer's environment, never shipped. (Enforced by `.gitignore` at pack
time and the PII guardrail at install time.)
