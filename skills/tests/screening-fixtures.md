# Screening soft-defaults — test fixtures (§1)

Each fixture gives the judge skill input and the expected verdict under the
post-1.2.0/1.4.0 rules. Fixtures E1–E4 target `eligibility-judge`,
F1–F4 target `fit-judge`, R1–R3 target `resume-reviewer`. A fixture passes
when the live skill run returns the expected verdict (and, where noted, the
expected reason strings).

Shared profile fragment for E-fixtures:

```json
{"role_types": ["w2_contract", "full_time"], "targeting": {"preferred_lane": "w2_contract"}}
```

## E1 — type unstated → default, advance

JD (excerpt): "Senior Data Engineer — build streaming pipelines on Spark and
Kafka. 5+ years experience. Remote US." No employment-type wording anywhere.
Expected: `verdict: pass` (other checks pass), `selected_lane:
"w2_contract"`, `employment_types_offered: ["unknown"]`, `reasons[0]` exactly
`defaulted to w2_contract; type unstated in JD`.

## E2 — "contract" ambiguous W2 vs C2C → default, not hold

JD (excerpt): "Contract Data Engineer, 12 months, Houston hybrid." No W2/C2C
wording. Expected: `verdict: pass`, `selected_lane: "w2_contract"`,
`reasons[0]` exactly `defaulted to w2_contract; type unstated in JD`. Must
NOT be `hold`.

## E3 — explicit type not enabled → still reject (regression)

JD (excerpt): "Part-time Data Analyst, 20 hrs/week, remote." Profile
`role_types` has no `part_time`. Expected: `verdict: reject`, reason names
`part_time not in profile.role_types`. The default must NOT rescue an
explicit mismatch.

## E4 — preferred_lane absent → role_types[0] fallback

Same JD as E1, but profile has no `targeting.preferred_lane` and
`role_types: ["full_time", "w2_contract"]`. Expected: `verdict: pass`,
`selected_lane: "full_time"`, `reasons[0]` exactly
`defaulted to full_time; type unstated in JD`.

## F1 — at threshold, no flag → pass

`score: 60`, `threshold: 60`, `evidence.red_flags: []`, no other concern.
Expected: `verdict: pass`. Must NOT be `hold`.

## F2 — at threshold with red flag → hold with retry path

`score: 62`, `threshold: 60`, `evidence.red_flags: [{"phrase": "wear many
hats", "category": "workload"}]`. Expected: `verdict: hold`, `reasons` names
the flag and contains `retry_path:`.

## F3 — below threshold, no flag → reject

`score: 45`, `threshold: 60`, no flags. Expected: `verdict: reject`,
`reasons` names the failing dimensions.

## F4 — below threshold with flag → hold with retry path

`score: 45`, `threshold: 60`, `evidence.red_flags: [{"phrase": "rockstar",
"category": "culture"}]`. Expected: `verdict: hold` (not a silent reject),
`reasons` contains `retry_path:`.

## R1 — verbatim passthrough → pass (the Firstup case)

Tailored PDF names Terraform, Docker, Kubernetes, Stonebranch. The JD names
all four verbatim; the variant names all four verbatim; the bullets use them
as-is ("Deployed services with Docker and Kubernetes"). `years_matrix` has
none of the four as keys. Expected: `verdict: pass`. A mechanical mismatch
is at most a note — never a rejection.

## R2 — inflated claim on a verbatim term → reject (fabrication)

Variant bullet: "Used Kubernetes for one internal migration project."
Tailored bullet: "Kubernetes expert with 10 years production experience."
Expected: `verdict: reject`, notes quote both phrasings (lexicon drift /
inflated claim).

## R3 — tool in no source → reject naming sources checked

Tailored PDF names "Snowflake"; Snowflake appears in neither the variant,
nor the JD, nor `years_matrix`, nor `company_terms`. Expected: `verdict:
reject`, notes quote "Snowflake" and name the sources checked.
