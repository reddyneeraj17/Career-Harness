<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: resume-tailor
version: "1.5.0"
description: Tailors one resume variant to a job description with bounded edits, speaking the company's own vocabulary from company-read terms. Accepts reviewer_notes to close the review loop.
---

# resume-tailor

> Changelog 1.5.0 (2026-09-30): Real-story crafting — every bullet built
> as industry → problem → tools → story from variant facts, never invented;
> company-stack injection from company-read sources (documented patterns
> may frame real work, never claim their product); two-page substance
> target; weak-resume protocol emitting `evidence.resume_gaps` for the
> customer instead of padding; domain-based experience selection;
> story provenance in evidence for the reviewer.
> Changelog 1.4.0 (2026-09-27): ATS keyword placement priority + density
> (consumes fit-judge `keyword_frequency`), prefer-JD-exact-phrasing rule,
> technical bullet formula with technology slot, metrics taxonomy, DE
> bullet patterns, ATS format-preservation hard limit, summary-line
> formula + don'ts, bullet quantity discipline, before/after keyword
> report in evidence.

## Inputs

```json
{
  "variant_path": "user/files/<Name>_Data_AI_Resume.pdf",
  "variant_id": "v3-ontology",
  "jd_text": "<full job description text>",
  "posting_id": "a1b2c3d4e5f6",
  "company_norm": "stripe",
  "role_norm": "senior-data-engineer",
  "campaign_id": "career_portal",
  "run_id": "run-2026-09-26-1420",
  "reviewer_notes": ["Lead with platform work, not ETL", "Drop the 2016 internship bullet"],
  "company_terms": [
    {"term": "medallion architecture", "generic_equivalent": "bronze/silver/gold layered pipeline", "source_url": "https://www.databricks.com/blog/..."}
  ],
  "required_stack": ["spark", "delta lake", "python"],
  "keyword_frequency": {"sql": 5, "spark": 3, "dbt": 1}
}
```

`company_terms` comes from the `company-read` skill (empty array when the read
held or found no vocabulary — tailor normally, with no company terms).
`required_stack` comes from `fit-judge` v1.2.0 (empty array when the judge
held). Both are alignment signals only: they tell the tailor which true
capabilities to surface and which JD requirements to mirror. Neither ever
authorizes naming a tool the candidate lacks.
`keyword_frequency` comes from `fit-judge` v1.3.0 (empty object when
absent) — it drives placement priority for true capabilities already on
the variant.
`reviewer_notes` is empty on the first pass. When `resume-reviewer` returns
`approved-with-notes`, the coordinator re-invokes the tailor with those notes
and the tailor applies them — the review loop closes here instead of dropping
the notes.

Work from the variant source file — it is the only source of candidate facts. Read `jd_text` for keyword and requirement alignment only.

## Company vocabulary

When `company_terms` is non-empty, the tailor may speak the company's language:

- **May** rename a true capability into the company's term where a
  `company_terms` row gives a sourced equivalence: *"built layered
  bronze/silver/gold pipelines"* → *"built medallion-architecture pipelines"*.
  Same fact, their words. Record every applied term in
  `evidence.lexicon_applied` so the reviewer can check provenance.
- **May** reorder and select which true bullets surface, favouring those nearest
  the company's terms.
- **May** write at most **one** tailored summary line naming the problem domain
  the company's pages describe. The summary line follows the formula
  `[Title] + [Years] + [Key Skills] + [Value Prop]` (e.g. "Senior Data
  Engineer with 9 years building streaming platforms on Spark and AWS,
  shipping pipelines that serve 40M+ events/day" — every element true to
  the variant). Summary don'ts: no objectives ("Seeking a challenging
  position…"), no generic traits ("Hard-working team player…",
  "Results-oriented professional…"), no third person, no soft-skill
  filler.
- **May NOT** name a company tool or product the candidate lacks. A tool in
  their vocabulary but not in the candidate's experience is omitted entirely —
  not "familiar with", not "exposure to".
- **May NOT** imply employment at, contract with, or use of the company's
  product unless the variant source supports it.
- **May NOT** convert a capability into a materially different one (having used
  Spark is not having authored a Unity Catalog governance model).

## Story crafting (real use cases)

Every bullet is built as **industry → problem → tools → story** — and every
element must trace to a variant/persona fact:

1. **Industry.** Name the domain the work lived in (fintech, healthcare,
   retail, logistics…) from the variant's employer/project context.
2. **Problem.** State the real business or engineering problem the work
   solved — found in the variant, never invented. If the variant gives
   duties but no problem ("maintained ETL pipelines"), the honest problem
   is the duty's purpose at its most concrete ("kept daily risk-reporting
   pipelines reliable") — not a grander problem the source doesn't
   support. If no honest problem exists, flag it (see weak-resume
   protocol) — do not invent one.
3. **Tools.** The actual stack from the variant/years_matrix. Never a tool
   the candidate lacks.
4. **Story.** Compose as `[strong verb] + [problem solved] + [technical
   action] + [scale/impact] + [technology]`. The impact is verbatim from
   the variant when present; when absent, state scope honestly ("across
   12 pipelines", "serving the risk team") only from variant facts —
   never a fabricated number.

**Provenance.** Record per-bullet provenance in
`evidence.story_provenance`: which variant fact each of industry,
problem, tools, impact traces to. The reviewer checks this — a story
element with no source is fabrication, however plausible it reads.

## Company-stack injection

`company_terms` (from company-read, with source URLs) lets the tailor
speak the company's language — extended in 1.5.0:

- **Documented patterns may frame real work.** When a company-read source
  documents an integration or architecture pattern (their blog on CDC
  ingestion, their docs on a connector), and the candidate did equivalent
  real work, the bullet may reference the pattern honestly: *"Built CDC
  ingestion mirroring the Debezium→warehouse pattern in <company>'s
  engineering blog"* — the work is real, the pattern reference shows
  fluency. Record the source URL in `evidence.lexicon_applied`.
- **Equivalent-tool honesty.** If the JD requires integration with tool X
  and the candidate integrated with equivalent tool Y: name Y, state the
  transferable pattern explicitly — *"Built real-time integrations on Y;
  same event-driven pattern the role requires on X."* Never rename Y to X.
- All 1.4.0 prohibitions stand: never name a company tool/product the
  candidate lacks, never imply use of the company's product, never convert
  a capability into a materially different one.

## Domain-based selection

Foreground the experience matching the JD's domain: for a fintech posting,
the fintech roles and bullets lead; retail history leads for a retail
posting. Reorder roles' bullets and the skills-section grouping by the
JD's domain — selection and ordering, never rewriting history. A role's
facts don't change; its prominence does.

## Recruiter scan structure (eye-catching, still ATS-safe)

- **6-second scan:** bold role titles; a one-line scope under each —
  `[Title] — [domain/platform], [scale]` (e.g. "Staff Data Engineer —
  real-time payments platform, 40 engineers"); bullets lead with strong
  verbs and front-loaded numbers.
- **Summary:** the 1.4.0 formula stands (`[Title] + [Years] + [Key Skills]
  + [Value Prop]`), now domain-tuned to the posting.
- **Skills section:** grouped and ordered by the JD's stack, not
  alphabetical — the hiring manager sees their stack first.
- All within the 1.4.0 ATS format-preservation rule: single column,
  standard headers, no tables/columns/text boxes.

## Page target: two pages of substance

- **Target two full pages** — ~650–900 words, 4–6 bullets per recent role,
  2–3 for older roles. Most variants under-sell: two vague bullets often
  hide five real stories. Story-crafting (§ above) extracts the full
  honest value before anything is called complete.
- **Never exceed two pages. Never pad.** If full honest extraction still
  leaves under two pages, ship what is real and emit
  `evidence.resume_gaps` (weak-resume protocol) — a thin page with gaps
  flagged beats a fat page of fiction.

## Weak-resume protocol

When the variant is thin (few bullets, no metrics, vague duties):

1. Elevate what's real: scope, scale, tools, domain, tenure — the honest
   material, fully extracted via story-crafting.
2. Do **not** invent problems, numbers, or tools to fill the page.
3. Emit `evidence.resume_gaps`: a concrete list ("Role 2 (2021–2023):
   no quantified impact — ask customer for pipeline volume or team
   size", "No stated business problem for the ETL role — ask what broke
   without it"). The coordinator takes these to the customer; real
   answers come back as variant updates, and the next tailor run uses
   them. The loop improves the resume instead of fabricating it.

- **Placement priority** for true capabilities already on the variant:
  professional summary line first, skills-section labels second, experience
  bullets third. A JD keyword that is genuinely in the candidate's
  experience gets surfaced in that order.
- **Density, never stuffing.** A critical JD keyword (must-have per
  fit-judge, or high `keyword_frequency`) may appear 2–4× across the
  document; an important keyword 1–2×. More than that is stuffing — cut
  it. Density targets never override the anti-fabrication bar.
- **Prefer the JD's exact phrasing** over near-synonyms when renaming a
  true capability: if the JD says "risk management", use "risk
  management", not "risk mitigation". Same fact, their words (extends the
  company-vocabulary rule from company terms to JD terms). Never let
  phrasing preference invent a capability the variant lacks.
- **Before/after report.** Emit `evidence.keywords_added` (JD keywords
  newly surfaced, each tracing to a variant fact) and
  `evidence.match_delta` (estimated JD-keyword coverage before → after,
  honest, never inflated) so the run trace shows what changed and why.

## Bullet shape

Rewritten bullets follow `[action verb] + [technical what] + [scale/impact]
+ [technology used]` — the technology slot is what ATS scans and hiring
managers scan for. The metric is carried over **verbatim** from the variant
source when one exists, and omitted when the source has none. Never invent
a metric to satisfy the shape. Weak verbs ("helped", "worked on",
"involved in") are upgraded only where the variant source supports a
stronger verb.

**Metrics taxonomy** (which true metrics to prefer when choosing among
variant bullets for a JD): scale (users, requests/sec, data volume,
uptime), performance (latency, throughput), efficiency (cost saved, time
saved, automation), business (revenue influenced, conversion, risk
reduced). Prefer the metric type the JD emphasizes.

**Data-engineer bullet patterns** (non-normative examples of the shape —
facts must come from the variant):
- "Built streaming ingestion pipeline processing 40M+ events/day with
  exactly-once semantics (Kafka, Spark Structured Streaming)"
- "Redesigned warehouse into medallion layers, cutting dashboard query
  latency 60% (Databricks, Delta Lake)"
- "Implemented data-quality monitoring across 200+ tables, reducing
  incident detection time from hours to minutes (Great Expectations,
  Airflow)"

**Bullet quantity discipline:** 3–6 bullets per recent role; fewer for
older roles. Keyword alignment never bloats old roles.

## Actions called

- `event_log` — one row on exit with the verdict and token count. This skill writes nothing else; the PDF goes to the filesystem and the hash travels in the output envelope.

## Output

The verdict envelope:

```json
{"skill":"resume-tailor","version":"1.4.0","verdict":"pass|reject|hold",
 "score":0-100,"reasons":["..."],
 "evidence":{"pdf_path":"goals/<campaign_id>/hidden_files/<run_id>/resumes/<company_norm>-<role_norm>.pdf",
             "resume_hash":"<sha256(PDF bytes)[:12]>",
             "lexicon_applied":["medallion architecture"],
             "keywords_added":["exactly-once semantics","data contracts"],
             "match_delta":{"before":58,"after":74},
             "story_provenance":[{"bullet":"Built CDC ingestion…","industry":"variant: employer fintech","problem":"variant: 'kept risk reports reliable'","tools":"years_matrix: Debezium 3y","impact":"variant: '40M events/day'"}],
             "resume_gaps":["Role 2 (2021–2023): no quantified impact — ask customer for volume or team size"]},
 "tokens":1234}
```

- `pass`: tailored PDF written, hash computed.
- `hold`: variant file missing/unreadable, or `jd_text` empty — nothing fabricated, nothing written.
- `reject`: tailoring is impossible without inventing facts (e.g., the role demands a credential the variant lacks and any alignment would mean fabrication).

`score` = keyword/requirement alignment confidence (0–100), honest, never inflated.

## Hard limits

- **Bounded edits only:** reorder bullets, tighten phrasing, align keywords and skill labels to the JD. Cosmetic and structural changes only.
- **ATS format preservation:** tailoring must never break the variant's
  ATS-safe formatting — keep the single-column layout, standard section
  headers, contact info in the body (never headers/footers), no tables, no
  text boxes, no columns. If an edit would break parseability, drop the
  edit.
- **Never add** employers, roles, dates, degrees, certifications, metrics,
  business problems, or tools that are not in the variant source. Never
  invent experience — or a grander problem than the source supports. If
  the JD asks for something the variant lacks, omit it and flag it in
  `resume_gaps` — do not fabricate it.
- **Page count:** target two full pages of substance (§ above); never
  exceed two pages; never pad a thin history — emit `resume_gaps`
  instead.
- **Bullet shape** — see "Bullet shape" above: `[action verb] + [technical
  what] + [scale/impact] + [technology used]`, metric verbatim from the
  variant or omitted, never invented.
- **Output path:** `goals/<campaign_id>/hidden_files/<run_id>/resumes/<company_norm>-<role_norm>.pdf`. Sanitize the filename to lowercase alphanumerics and dashes (max 80 chars). Create parent directories as needed.
- **Hash:** compute `resume_hash = sha256(PDF bytes)[:12]` over the final file and return it in `evidence`. The portal-navigator re-verifies this hash before upload.
- Never read or write any database; all facts come from the inputs.
- Append exactly one `event_log` row on exit (`run_id`, verdict, token count), even on failure.
