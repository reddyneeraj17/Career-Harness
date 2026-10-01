---
name: "interview-prep-pack"
description: "Build a styled Interview Prep Pack PDF for an upcoming interview: 10-page A4 packet in the exact house style of the Databricks Sr. Solutions Architect pack (Sep 30, 2026), with cover sheet, call sheet, role brief, exact-resume page, answer bank, story bank, logistics and questions, day-of checklist, and verbatim JD appendix. Trigger on: interview prep, prep pack, interview packet, interview briefing, downloadable PDF for an interview."
---

# Interview Prep Pack

## Purpose

Produce a print-ready, downloadable A4 interview prep PDF with the exact packet styling of the reference build: dark cover with red rule and 5mm red spine, numbered sections 01-07, accent and dark cards, Q&A and story banks, day-of checklist with blank notes page, and a verbatim job-description appendix. The output must look like it came from the same press as the Databricks pack.

## Workflow

1. **Gather verified facts. Never invent.**
   - Interview invite: role, interviewer name/title/email, date/time/timezone, format, call mechanics (who calls whom, phone number).
   - JD text: prefer the saved verbatim JD from the application run folder; fall back to the live posting. The JD appendix is mandatory.
   - Application record: company+role, apply URL, confirmation evidence, resume variant, first 12 chars of sha256 of the exact uploaded PDF (verify with `sha256sum`), reviewer verdict and notes, screening answers submitted (sponsorship, work authorization, location), Tier-1 poster if any.
   - Candidate facts: confirmed title/employer/dates, confirmed years matrix, confirmed metrics only. Stories and answer angles may use only grounded facts.

2. **Build the HTML.**
   - Start from `assets/template.html`. Copy it, do not restyle.
   - Apply `assets/prep-pack.css` verbatim. Do not edit the CSS.
   - Class vocabulary (all defined in the CSS): `page cover`, `brand`, `page-title`, `page-kicker`, `topline`, `cover-grid`, `cover-item`, `rule`, `alert`, `grid-2`, `grid-3`, `card` (+`dark`, +`accent`), `stat`, `stat-label`, `callout`, `tag`, `qa` / `q` / `a`, `table`, `story` / `story-grid` / `story-key` / `story-text`, `check` / `box`, `verbatim`, `footer`, `compact`, `small`, `micro`, `tight`, `avoid`, `muted`.
   - Page model (10 pages, A4 210x297mm, exact order):
     1. Cover (dark): brand, H1 company + role, subtitle, red rule, cover-grid (Interview / Interviewer / Format / Requisition / Location-or-Territory / Compensation), red alert with primary objective.
     2. 01 / Call sheet: three stats, call-mechanics callout, likely topics + core message + "Do not overclaim" dark card, suggested time-flow table.
     3. 02 / Role brief: mission + operating model cards, success list, competencies table, key callout (territory, travel, or similar).
     4. 03 / Resume: uploaded-file dark card + review-status accent card, positioning paragraph + callout, job-need to resume-evidence table, three honest gap cards.
     5. 04 / Answer bank: six `.qa` blocks. Answers sized for 45-90 seconds spoken.
     6. 05 / Story bank: four `.story` blocks (Situation / Action / Result / Use-for), grounded in the resume only.
     7. 06 / Logistics and questions: logistics Q&As (location, sponsorship, comp), numbered questions for the interviewer, two-column watch-outs.
     8. 07 / Day-of checklist: ten-minutes-before checklist, numbers-to-remember dark card, one-line-close callout, blank notes table.
     9-10. Appendix: verbatim JD in two parts + application-record table. If the invite and the applied requisition disagree (req ID, territory, comp), flag it in the cover alert and an appendix callout; never silently pick one.

3. **Render and validate.**
   - Render HTML to PDF at A4 (Chromium headless print-to-pdf or equivalent).
   - Validate: render every page to PNG, confirm no text overflows its `.page` box, confirm fonts (Liberation Sans, Noto Serif) render, confirm page count and A4 size. Tighten copy or use `.compact` on overflow; never shrink fonts below the CSS scale.
   - Confirm the final PDF opens and every section is populated. No placeholder text may survive.

4. **Deliver.**
   - Hand over the PDF as a downloadable file (file artifact, kind `pdf`, or direct attachment).
   - When the pack is for a specific application, also attach the exact uploaded resume PDF (sha256-verified) alongside.

## Output Contract

- 10-page A4 PDF, byte-identical styling to `assets/prep-pack.css`.
- Every claim traceable to the invite, JD, application confirmation, or confirmed candidate facts. No invented metrics, titles, years, or screening answers.
- Copy rules: natural, direct, conversational; NEVER use em dashes.
- Do-not-overclaim card must name the specific things he must not claim for this role (unheld certifications, languages, account sizes, titles).

## Operating Rules

- Never restyle: palette `#172126` dark, `#ff4f36` red, `#b93220` deep red, `#fffdf9` paper; Liberation Sans body, Noto Serif display.
- Adjust cover-grid fields and section emphasis per interview type (recruiter screen, technical round, panel), but keep the styling and page model identical.
- Keep answer scripts to 45-90 seconds spoken; stories to Situation/Action/Result/Use-for.
- The canonical example is the Databricks Sr. Solutions Architect pack (Sep 30, 2026): `~/workspace/your_files/databricks-interview-prep-pack/databricks-interview-prep-pack.pdf` and its source `.../.src/index.html`.
- Do not generate public-facing or shareable versions of private prep packs; these are the candidate's confidential preparation material.
