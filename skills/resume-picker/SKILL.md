---
name: resume-picker
version: "1.0.0"
description: Ranks resume variants against a job description and recommends the top 3 with scores.
---

# Resume Picker

Selects the best resume variant for a job description using the deterministic scoring formula, via the `resume_pick` action. Returns the top 3 with scores and reasons; the coordinator uses the top 1.

## Inputs

```json
{
  "jd_text": "full normalized job description text",
  "role_family": "data-engineering"
}
```

`role_family` is optional; when present it biases the keyword vector used for overlap scoring.

## Actions called

- `resume_pick` — with `{jd_text, role_family?}`; returns ranked variants with component scores. The scoring formula lives in the action: `0.45·keyword overlap + 0.25·tag match + 0.20·historical approval rate + 0.10·variant recency`.
- `event_log` — one row on exit with the verdict, the picked `variant_id`, and token count. Nothing else.

## Output

Return ONLY the verdict envelope JSON:

```json
{"skill":"resume-picker","version":"1.0.0","verdict":"pass|hold",
 "score":0-100,"reasons":["..."],
 "evidence":{"top3":[
   {"variant_id":"v-de-03","score":87,"components":{"keyword":0.91,"tags":0.80,"approval_rate":0.85,"recency":1.0},"reason":"strongest spark/aws overlap"},
   {"variant_id":"v-de-01","score":74,"components":{...},"reason":"..."},
   {"variant_id":"v-gen-02","score":61,"components":{...},"reason":"..."}],
  "recommended":"v-de-03"},"tokens":1234}
```

- `pass` — at least one variant scored; `recommended` is the top 1.
- `hold` — no variants exist in the library or `resume_pick` returned none; the coordinator cannot proceed to tailoring.

## Hard limits

- Always report all three (or fewer if the library is smaller) — never only the winner. The coordinator and the tuning loop need the full ranking.
- Do not re-rank or adjust the action's scores in the skill; if the formula needs changing, it changes in the action, not in prose. The skill's job is to call, report, and recommend.
- Never invent a variant: `recommended` must be a `variant_id` returned by `resume_pick`.
- The picked `variant_id` is recorded on the application row by the coordinator — this is what makes resume-usage stats exact instead of estimated.
- No personal data lives in this file; resume content is referenced by `variant_id` only.
- Append exactly one `event_log` row on exit. No state transitions — the coordinator owns them.
