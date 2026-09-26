---
name: resume-tailor
version: "1.1.0"
description: Tailors one resume variant to a job description with bounded edits, returning the PDF path and its hash. Accepts reviewer_notes to close the review loop.
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
  "reviewer_notes": ["Lead with platform work, not ETL", "Drop the 2016 internship bullet"]
}
```

`reviewer_notes` is empty on the first pass. When `resume-reviewer` returns
`approved-with-notes`, the coordinator re-invokes the tailor with those notes
and the tailor applies them — the review loop closes here instead of dropping
the notes.

Work from the variant source file — it is the only source of candidate facts. Read `jd_text` for keyword and requirement alignment only.

## Actions called

- `event_log` — one row on exit with the verdict and token count. This skill writes nothing else; the PDF goes to the filesystem and the hash travels in the output envelope.

## Output

The verdict envelope:

```json
{"skill":"resume-tailor","version":"1.0.0","verdict":"pass|reject|hold",
 "score":0-100,"reasons":["..."],
 "evidence":{"pdf_path":"goals/<campaign_id>/hidden_files/<run_id>/resumes/<company_norm>-<role_norm>.pdf",
             "resume_hash":"<sha256(PDF bytes)[:12]>"},
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
- **Output path:** `goals/<campaign_id>/hidden_files/<run_id>/resumes/<company_norm>-<role_norm>.pdf`. Sanitize the filename to lowercase alphanumerics and dashes (max 80 chars). Create parent directories as needed.
- **Hash:** compute `resume_hash = sha256(PDF bytes)[:12]` over the final file and return it in `evidence`. The portal-navigator re-verifies this hash before upload.
- Never read or write any database; all facts come from the inputs.
- Append exactly one `event_log` row on exit (`run_id`, verdict, token count), even on failure.
