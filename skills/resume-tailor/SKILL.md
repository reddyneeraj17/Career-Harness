---
name: resume-tailor
version: "1.3.0"
description: Tailors one resume variant to a job description with bounded edits, speaking the company's own vocabulary from company-read terms. Accepts reviewer_notes to close the review loop.
---

# resume-tailor

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
  "required_stack": ["spark", "delta lake", "python"]
}
```

`company_terms` comes from the `company-read` skill (empty array when the read
held or found no vocabulary — tailor normally, with no company terms).
`required_stack` comes from `fit-judge` v1.2.0 (empty array when the judge
held). Both are alignment signals only: they tell the tailor which true
capabilities to surface and which JD requirements to mirror. Neither ever
authorizes naming a tool the candidate lacks.
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
  the company's pages describe.
- **May NOT** name a company tool or product the candidate lacks. A tool in
  their vocabulary but not in the candidate's experience is omitted entirely —
  not "familiar with", not "exposure to".
- **May NOT** imply employment at, contract with, or use of the company's
  product unless the variant source supports it.
- **May NOT** convert a capability into a materially different one (having used
  Spark is not having authored a Unity Catalog governance model).

## Actions called

- `event_log` — one row on exit with the verdict and token count. This skill writes nothing else; the PDF goes to the filesystem and the hash travels in the output envelope.

## Output

The verdict envelope:

```json
{"skill":"resume-tailor","version":"1.3.0","verdict":"pass|reject|hold",
 "score":0-100,"reasons":["..."],
 "evidence":{"pdf_path":"goals/<campaign_id>/hidden_files/<run_id>/resumes/<company_norm>-<role_norm>.pdf",
             "resume_hash":"<sha256(PDF bytes)[:12]>",
             "lexicon_applied":["medallion architecture"]},
 "tokens":1234}
```

- `pass`: tailored PDF written, hash computed.
- `hold`: variant file missing/unreadable, or `jd_text` empty — nothing fabricated, nothing written.
- `reject`: tailoring is impossible without inventing facts (e.g., the role demands a credential the variant lacks and any alignment would mean fabrication).

`score` = keyword/requirement alignment confidence (0–100), honest, never inflated.

## Hard limits

- **Bounded edits only:** reorder bullets, tighten phrasing, align keywords and skill labels to the JD. Cosmetic and structural changes only.
- **Never add** employers, roles, dates, degrees, certifications, or metrics that are not in the variant source. Never invent experience. If the JD asks for something the variant lacks, omit it — do not fabricate it.
- **Page count:** one page, unless the variant source is two pages — then at most two. Never exceed the variant's page count.
- **Bullet shape.** Rewritten bullets follow `[action verb] + [task/context] +
  [measurable metric]` — the metric is carried over verbatim from the variant
  source when one exists, and omitted when the source has none. Never invent a
  metric to satisfy the shape. Weak verbs ("helped", "worked on", "involved in")
  are upgraded only where the variant source supports a stronger verb.
- **Output path:** `goals/<campaign_id>/hidden_files/<run_id>/resumes/<company_norm>-<role_norm>.pdf`. Sanitize the filename to lowercase alphanumerics and dashes (max 80 chars). Create parent directories as needed.
- **Hash:** compute `resume_hash = sha256(PDF bytes)[:12]` over the final file and return it in `evidence`. The portal-navigator re-verifies this hash before upload.
- Never read or write any database; all facts come from the inputs.
- Append exactly one `event_log` row on exit (`run_id`, verdict, token count), even on failure.
