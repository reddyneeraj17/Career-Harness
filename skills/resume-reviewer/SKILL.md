---
name: resume-reviewer
version: "1.1.0"
description: Gates tailored resumes and cover letters — cached verdicts, banned-phrase and truthfulness checks — before anything ships.
---

# Resume Reviewer

The review gate: judges a tailored resume PDF (or a cover letter) against the job description before it may be submitted. Verdicts are cached on `(jd_hash, artifact_hash)` so identical work is never reviewed twice. This is a verdict-only skill: it judges, the coordinator transitions.

## Inputs

```json
{
  "pdf_path": "goals/<campaign>/hidden_files/<run>/resumes/<slug>/<Name>_Data_AI_Resume.pdf",
  "resume_hash": "sha256 of the PDF bytes, first 12 hex chars",
  "jd_text": "full normalized job description text",
  "jd_hash": "sha256 of normalized JD text, first 12 hex chars",
  "cover_text": "<optional: full cover letter text>",
  "cover_hash": "<optional: sha256 of the letter bytes, first 12 hex chars>"
}
```

**Cover-letter mode:** when `cover_text` + `cover_hash` are present, the skill
judges the letter instead of the PDF. The cache key becomes
`(jd_hash, cover_hash)` and `evidence.artifact` reads `"cover_letter"`.
Everything else — banned phrases, truthfulness, no-editing — applies
unchanged. Resume mode (no cover inputs) behaves exactly as before.

## Actions called

- `review_get` — with `{jd_hash, resume_hash}` in resume mode or
  `{jd_hash, cover_hash}` in cover-letter mode; returns a cached verdict when
  this exact pair was reviewed before. **Check the cache first, always.**
- `review_put` — same key shape; caches a fresh verdict. Called only on a
  cache miss.
- `event_log` — one row on exit with the verdict, notes summary, and token count. Nothing else.

## Output

Return ONLY the verdict envelope JSON, with `verdict` mapped to the review outcome:

```json
{"skill":"resume-reviewer","version":"1.1.0","verdict":"pass|reject|hold",
 "score":0-100,"reasons":["..."],
 "evidence":{"review":"approved|approved-with-notes|rejected","notes":["..."],"cache_hit":true,"jd_hash":"...","artifact":"resume|cover_letter","artifact_hash":"..."},"tokens":1234}
```

- `approved` → `verdict: pass`.
- `approved-with-notes` → `verdict: pass`, notes recorded for the tailoring loop.
- `rejected` → `verdict: reject`; the coordinator parks the row — rejected work never goes downstream.

## Hard limits

- Check `review_get` before doing any review work. On a cache hit, return the cached verdict unchanged — do not re-judge.
- Banned-phrase check: any unverified claim or banned phrase in the tailored PDF → `rejected` with the phrase quoted in `notes`.
- Truthfulness check: the years matrix and every factual claim in the PDF must match the profile; any invented experience → `rejected`.
- The reviewer **never edits the PDF**. It judges only. Fixes go back to the tailor as notes; a re-tailored PDF has a new `resume_hash` and gets a fresh review.
- The reviewed file is the uploaded file: the coordinator must verify `resume_hash` matches at submit time (hash-verified upload).
- No personal data lives in this file; facts arrive via Inputs.
- Append exactly one `event_log` row on exit. No state transitions — the coordinator owns them.
