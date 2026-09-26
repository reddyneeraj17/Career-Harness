<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: cover-letter-writer
version: "1.0.0"
description: Writes one bounded cover letter per application from the tailored resume and profile facts only — no invented claims — for ATS portals that demand one.
---

# cover-letter-writer

## Why this exists

Cover letters are mandatory on plenty of Greenhouse/Lever/Ashby postings —
exactly the ATSs with playbooks. Without a writer, every one of those parks
for a human and throughput collapses on the best-supported portals. This
skill writes the letter; `resume-reviewer` gates it; `portal-navigator`
attaches it.

## Inputs

```json
{
  "app_id": "app-9f2c…",
  "posting_id": "p-abc123",
  "company": "Acme Health",
  "role": "Senior Data Engineer",
  "jd_text": "<full normalized job description text>",
  "jd_hash": "a1b2c3d4e5f6",
  "resume_path": "goals/<campaign>/hidden_files/<run>/resumes/<slug>/<Name>_Data_AI_Resume.pdf",
  "resume_text": "<text extracted from the tailored resume PDF>",
  "profile_facts": {"full_name": "…", "email": "…", "phone": "…", "city": "…",
                    "work_auth_sentence": "…", "years_matrix": {"Python": 9}},
  "campaign_id": "career_portal",
  "run_id": "run-2026-09-26-1420"
}
```

`resume_text` + `profile_facts` are the ONLY sources of candidate facts. The
persona/profile supplies identity, work-auth sentence, and contact details.

## Procedure

1. Read `jd_text` for the role's top 2–3 stated requirements and the
   company's domain.
2. Draft a short letter (3–4 paragraphs, under 300 words): why this role,
   the 2–3 matching facts from the resume, work authorization stated exactly
   as the profile's sentence, and a one-line close. Plain professional tone —
   no purple prose, no superlatives about the company.
3. Write it to
   `goals/<campaign_id>/hidden_files/<run_id>/letters/<app_id>_cover_letter.txt`
   (UTF-8 plain text; the portal takes text or file depending on the ATS
   playbook).
4. Compute `letter_hash` = first 12 hex chars of sha256 over the file bytes.

## Actions called

- `event_log` — one row on exit with the verdict envelope and token count.
  Nothing else; the file goes to the filesystem and the hash travels in the
  output envelope.

## Output

```json
{"skill":"cover-letter-writer","version":"1.0.0","verdict":"pass|hold|reject",
 "score":0-100,"reasons":["..."],
 "evidence":{"letter_path":"goals/<campaign>/hidden_files/<run>/letters/<app_id>_cover_letter.txt",
             "letter_hash":"9f8e7d6c5b4a"},
 "tokens":1234}
```

- `pass` → letter written and hashed.
- `hold` → `resume_text` or `profile_facts` missing/empty — nothing written.
- `reject` → the letter cannot be written without inventing facts (the JD's
  core demand has no basis in the resume) — the coordinator parks the row.

The letter is **not** submittable on `pass` alone: the coordinator routes it
through `resume-reviewer` (cover-letter mode) before `portal-navigator` may
attach it.

## Hard limits

- **Facts only from the resume + profile.** Every employer, title, date,
  metric, and skill in the letter must appear in `resume_text` or
  `profile_facts`. No invented experience, no inflated years, no credentials
  not held.
- **No banned phrases, no unverified claims.** Same bar as the resume
  reviewer; a violation fails the letter at the gate.
- **Work auth stated verbatim** from `profile_facts.work_auth_sentence` —
  never paraphrased into something stronger.
- **Under 300 words.** If it needs more, it's saying too much.
- Never read or write any database; all facts come from the inputs.
