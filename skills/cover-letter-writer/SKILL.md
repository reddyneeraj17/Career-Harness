<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: cover-letter-writer
version: "1.1.0"
description: Writes one bounded cover letter per application from the tailored resume and profile facts only — no invented claims — for ATS portals that demand one.
---

# cover-letter-writer

## Why this exists

Cover letters are mandatory on plenty of Greenhouse/Lever/Ashby postings —
exactly the ATSs with playbooks. Without a writer, every one of those parks
for a human and throughput collapses on the best-supported portals. This
skill writes the letter; `resume-reviewer` gates it; `portal-navigator`
attaches it.

> Changelog 1.1.0 (2026-09-27): five-hook opening menu, `[Their Need] +
> [Your Exact Experience] + [Specific Result]` body formula, honest gap
> pattern, `evidence.alternate_openings`, 10-point write-side checklist,
> optional `mode: "cold_outreach"` (human-triggered only).

## Inputs

```json
{
  "app_id": "app-9f2c…",
  "posting_id": "p-abc123",
  "company": "Acme Health",
  "role": "Senior Data Engineer",
  "mode": "application",
  "jd_text": "<full normalized job description text>",
  "jd_hash": "a1b2c3d4e5f6",
  "resume_path": "goals/<campaign>/hidden_files/<run>/resumes/<slug>/<Name>_Data_AI_Resume.pdf",
  "resume_text": "<text extracted from the tailored resume PDF>",
  "profile_facts": {"full_name": "…", "email": "…", "phone": "…", "city": "…",
                    "work_auth_sentence": "…", "years_matrix": {"Python": 9},
                    "connections": []},
  "campaign_id": "career_portal",
  "run_id": "run-2026-09-26-1420"
}
```

`resume_text` + `profile_facts` are the ONLY sources of candidate facts. The
persona/profile supplies identity, work-auth sentence, and contact details.
`mode` defaults to `"application"`. `mode: "cold_outreach"` is for direct
human-to-human outreach (see below) — it is human-triggered only, never
invoked autonomously by a campaign.

## Procedure

1. Read `jd_text` for the role's top 2–3 stated requirements and the
   company's domain.
2. **Choose an opening hook** from this menu (pick the strongest one the
   facts support):
   - **Company knowledge** — one specific, true thing about the company
     (a product decision, a public technical choice, a recent launch) and
     why it pulled you in.
   - **Problem-solver** — the JD's hardest stated problem, named directly,
     and the resume fact that answers it.
   - **Achievement** — one resume result (metric verbatim) that mirrors
     what the role needs.
   - **Industry insight** — a domain observation grounded in the JD or
     `company-read` terms, never in model knowledge.
   - **Mutual connection** — ONLY when `profile_facts.connections` names a
     real connection to the company. Never invent one; skip this hook
     otherwise.
3. **Build the body** with the formula `[Their Need] + [Your Exact
   Experience] + [Specific Result]` per paragraph: the JD's stated need
   (their words), the resume fact that meets it, the verbatim metric or
   outcome. Every element must trace to `jd_text`, `resume_text`, or
   `profile_facts`.
4. **Address visible gaps honestly** when the JD asks for something the
   resume lacks: "While my X is developing, I bring [adjacent strength +
   verbatim evidence]." Never silent-omission when the gap is obvious,
   never a claim of the missing skill.
5. Draft the letter (3–4 paragraphs, under 300 words): the hook opening,
   two body paragraphs, work authorization stated exactly as the profile's
   sentence, and a one-line close. Plain professional tone — no purple
   prose, no superlatives about the company.
6. Draft **two alternate openings** (different hooks from step 2) and emit
   them in `evidence.alternate_openings` so the reviewer has options.
7. Run the write-side checklist (below) before writing the file.
8. Write it to
   `goals/<campaign_id>/hidden_files/<run_id>/letters/<app_id>_cover_letter.txt`
   (UTF-8 plain text; the portal takes text or file depending on the ATS
   playbook).
9. Compute `letter_hash` = first 12 hex chars of sha256 over the file bytes.

### Write-side quality checklist (all must pass before the file is written)

1. Every employer, title, date, metric, and skill appears in
   `resume_text` or `profile_facts`.
2. Opening is a specific hook, not "I am writing to apply…".
3. Each body paragraph follows Need + Experience + Result.
4. No generic trait claims ("hard worker", "fast learner", "passionate").
5. Work-auth sentence is the profile's verbatim sentence.
6. Under 300 words.
7. No banned phrases and no unverified claims.
8. Visible gaps addressed with the honest pattern or deliberately noted.
9. Company name, role title, and JD terms spelled exactly as the posting.
10. The letter could only have been written for this posting — swap the
    company name and it should read wrong.

## Cold-outreach mode (`mode: "cold_outreach"`)

For direct email to a hiring manager or founder about a specific team or
role — **human-triggered only** (a campaign worker must never set this
mode). Shape: hook → background → connection → close.

- **Hook-first:** open with one specific company observation (a product
  decision, a technical choice, a public metric) — never generic praise.
- **Background as context, not an achievement list:** 2–3 sentences of
  who you are, anchored to resume facts.
- **Confidence calibration:** "I feel like I'd be a strong fit" — belief,
  not certainty. Acknowledge gaps directly without apologizing: "The role
  mentions X years — I'm at Y, but the systems I've shipped are
  production-facing" (years from `years_matrix` only).
- **Early disclosure:** location and work authorization stated up front,
  not buried ("Flagging upfront: I'm in Houston, open to relocation, and
  need H-1B sponsorship" — using the profile's own words).
- **One connection bridge** and a low-pressure close (one line, one ask).
- Still gated by `resume-reviewer` before anything is sent; still under
  300 words; still facts-only.

## Actions called

- `event_log` — one row on exit with the verdict envelope and token count.
  Nothing else; the file goes to the filesystem and the hash travels in the
  output envelope.

## Output

```json
{"skill":"cover-letter-writer","version":"1.1.0","verdict":"pass|hold|reject",
 "score":0-100,"reasons":["..."],
 "evidence":{"letter_path":"goals/<campaign>/hidden_files/<run>/letters/<app_id>_cover_letter.txt",
             "letter_hash":"9f8e7d6c5b4a",
             "alternate_openings":["<opening variant 1>","<opening variant 2>"]},
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
