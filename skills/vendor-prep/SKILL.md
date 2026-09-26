<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: vendor-prep
version: "1.0.0"
description: Generates vendor/recruiter call talking points for one application, grounded only in the stored job description and the exact tailored resume PDF that was submitted.
---

# vendor-prep

Builds the call-prep sheet Neeraj reads before a vendor/recruiter screen: a
30-second pitch, one block per key JD requirement mapped to resume evidence
with a "say it like this" line, likely screening questions with
resume-grounded answers, and honest gap deflections. The only two sources of
truth are the stored JD snapshot and the submitted resume PDF. Everything else
is fabrication.

## Inputs

```json
{
  "app_id": "app-9f2c…",
  "posting_id": "<optional: coordinator-supplied>",
  "jd_path": "<optional: coordinator-supplied, goals/<campaign>/hidden_files/<run>/jd/<posting_id>.txt>"
}
```

`app_id` is required. `posting_id` / `jd_path` are optional hints the
run-coordinator passes from its own pipeline state (it ran jd-fetch and knows
both). When absent, the skill resolves them from `snapshot` as below; when
resolution fails it holds — never guesses a path.

## Procedure

1. **Load the application row.** Call `snapshot` with
   `{"view": "applications"}` and find the ledger row whose `app_id` matches
   the input. Extract `resume_path`, `resume_hash`, `campaign_id`, `run_id`,
   `company`, `role`, `state`. No matching row → `hold`
   (`application_not_found`). `resume_path` missing → `hold`
   (`no_submitted_resume`). `campaign_id` or `run_id` missing → `hold`
   (`missing_run_context`).
2. **Verify the resume is the submitted one.** Read `resume_path` with the
   read tool (PDF converts to markdown). Compute
   `sha256(file bytes)[:12]` and compare to the row's `resume_hash`.
   Mismatch → `reject` (`resume_hash_mismatch`): refuse to ground talking
   points on a file that was not submitted. Never fall back to the base
   variant in `user/files/` — the variant is not what the vendor saw.
3. **Resolve the JD.** In order:
   - the input `jd_path` hint, when supplied and the file exists;
   - a `jd_path` field on the snapshot row, when present (newer snapshot
     shapes carry it);
   - the canonical jd-fetch path
     `goals/<campaign_id>/hidden_files/<run_id>/jd/<posting_id>.txt`
     using `posting_id` from the input hint.
   
   No resolvable JD → `hold` (`jd_unresolvable`). Read the JD text with the
   read tool (UTF-8 text, read verbatim — never summarize before mapping).
   Compute `jd_hash = sha256(JD text)[:12]` for the evidence record.
4. **Extract key JD requirements.** Pull the 5–10 requirements that decide a
   screen: must-have skills, years-of-experience asks, domain asks, and any
   deal-breaker (clearance, location, work authorization). Quote each
   requirement briefly; do not reword requirements into easier ones.
5. **Map each requirement to resume evidence.** For every requirement, find
   the resume bullet(s) that genuinely support it. Quote or tightly
   paraphrase the bullet. Metrics are copied **verbatim** from the resume or
   omitted — never rounded, never upgraded, never invented. If the resume
   does not support the requirement, say so plainly (see gaps).
6. **Draft likely vendor screening questions.** The usual vendor set —
   current role and scope, years per key skill, why this move, work
   authorization/sponsorship, location and relocation, availability/start
   date, compensation expectations. Answer each strictly from the resume
   (and from standing profile answers for authorization, relocation, and
   start date — the same answers `screening-answerer` uses). A question the
   resume cannot answer gets an honest deflection, not an invention.
7. **Write the document** to
   `goals/<campaign_id>/hidden_files/<run_id>/screenshots/<app_id>_talking_points.md`
   (create parent directories as needed), in this shape:

   ```markdown
   # Talking points — <Company> · <Role>
   app_id: <app_id> · prepared: <YYYY-MM-DD HH:MM America/Chicago>
   Sources: JD `<jd_path>` (sha256[:12] `<jd_hash>`) · Resume `<resume_path>` (sha256[:12] `<resume_hash>`)
   Every claim below traces to one of those two files.

   ## 30-second pitch
   <3–4 sentences, resume facts only, tuned to the JD's top asks>

   ## Requirement → evidence → say it like this
   ### 1. <JD requirement, quoted briefly>
   - **Resume evidence:** "<quoted or paraphrased resume bullet, metric verbatim>"
   - **Say it like this:** "<one conversational line for the call — a rephrasing of the evidence, no new claims>"
   ...

   ## Likely screening questions
   - **Q:** <question>
     **A:** <resume-grounded answer, or honest deflection>
   ...

   ## Gaps — JD asks, resume is thin
   - **JD asks `<X>`:** the resume shows <what it actually shows or doesn't>. **Deflect:** "<honest line, e.g. adjacent strength + willingness to ramp>"
   ...

   ## Do not claim on this call
   <bulleted list of the specific things the resume does NOT support, so nothing slips out under pressure>
   ```

8. **Record it.** Call
   `talking_points_attach({"app_id": <app_id>, "talking_points_path": <path>})`.
   The action records the document path on the application and writes a
   `talking_points_attached` event. If it errors, return `hold` with the
   error named — the document on disk is still complete and correct.
9. **Log.** Append exactly one `event_log` row on exit (`run_id`, `app_id`,
   verdict, token count), even on failure.

## Actions called

- `snapshot` — read-only: `{"view": "applications"}`, filtered client-side
  by `app_id`. Never writes application state.
- `talking_points_attach` — records the document path on the application
  (see deployment note above).
- `event_log` — one row on exit with the verdict and token count. This skill
  writes nothing else; the markdown goes to the filesystem and the path
  travels in the output envelope.

## Output

The verdict envelope:

```json
{"skill":"vendor-prep","version":"1.0.0","verdict":"pass|hold|reject",
 "score":0-100,"reasons":["..."],
 "evidence":{"talking_points_path":"goals/<campaign>/hidden_files/<run>/screenshots/<app_id>_talking_points.md",
             "jd_path":"...","jd_hash":"<12>","resume_path":"...","resume_hash":"<12>",
             "requirements_mapped":7,"gaps":2,"attach":"ok|pending"},
 "tokens":1234}
```

- `pass` → document written; `attach` is `ok`, or `pending` with the missing
  action named in `reasons`.
- `hold` → `application_not_found`, `no_submitted_resume`,
  `missing_run_context`, or `jd_unresolvable` — nothing fabricated, nothing
  written.
- `reject` → `resume_hash_mismatch`: the file at `resume_path` is not the
  submitted resume. Never build talking points on the wrong file.

`score` = share of key JD requirements with genuine resume evidence
(0–100), honest, never inflated. A low score is a signal, not a failure —
it means the call needs the gap deflections.

## Hard limits

- **Anti-fabrication is the top rule.** Every claim in the document must
  trace to the JD text or the submitted resume text. Copy metrics verbatim
  or omit them (same rule as `resume-tailor`). Never invent years,
  employers, titles, dates, degrees, certifications, or technologies.
- **The submitted resume is the only resume.** Use exactly the `resume_path`
  from the application row, hash-verified. Never the base variant, never a
  different run's tailored PDF.
- **"Say it like this" lines are rephrasings, not new claims.** They restate
  resume evidence in conversational form. A line that adds a fact the
  resume lacks is fabrication — cut it.
- **Gaps get honest deflections, never invented experience.** The deflection
  names an adjacent true strength and a willingness to ramp; it never
  claims the missing skill.
- **Screening answers come from the resume or standing profile answers**
  (authorization, relocation, start date — same source as
  `screening-answerer`). Compensation: "negotiable", never a number the
  candidate did not give.
- **The "Do not claim" section is mandatory.** End every document with the
  explicit list of JD-adjacent things the resume does not support.
- **Output path is canonical** —
  `goals/<campaign_id>/hidden_files/<run_id>/screenshots/<app_id>_talking_points.md`,
  no exceptions. Create parent directories as needed.
- Never read or write any database except through the three declared
  actions; all candidate facts come from the two source files.
- Append exactly one `event_log` row on exit. No state transitions — the
  coordinator owns them.
