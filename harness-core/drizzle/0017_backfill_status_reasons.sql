-- Backfill applications.status_reason from terminal state_transition events (v1.3.0).
-- Historical transitions often recorded the explanation only in the event
-- payload's evidence; app_transition now derives the row reason server-side,
-- and this migration recovers it for rows that are still blank.
-- Only fills blank reasons on terminal/attention states; never overwrites
-- an explicitly recorded reason.
UPDATE applications SET status_reason = (
  SELECT substr(
    CASE
      WHEN json_extract(e.payload, '$.reason') IS NOT NULL
       AND json_extract(e.payload, '$.reason') != ''
        THEN json_extract(e.payload, '$.reason')
      WHEN json_extract(e.payload, '$.evidence') LIKE '{%' THEN
        CASE
          WHEN json_extract(json_extract(e.payload, '$.evidence'), '$.reason') IS NOT NULL
           AND json_extract(json_extract(e.payload, '$.evidence'), '$.reason') != ''
          THEN json_extract(json_extract(e.payload, '$.evidence'), '$.reason') ||
               CASE WHEN json_extract(json_extract(e.payload, '$.evidence'), '$.detail') IS NOT NULL
                     AND json_extract(json_extract(e.payload, '$.evidence'), '$.detail') != ''
                    THEN ' — ' || json_extract(json_extract(e.payload, '$.evidence'), '$.detail')
                    ELSE '' END
          -- Evidence without a reason field still carries a human explanation
          -- in "checkpoint" (portal-navigator) or "error" — use it as the reason.
          WHEN json_extract(json_extract(e.payload, '$.evidence'), '$.checkpoint') IS NOT NULL
           AND json_extract(json_extract(e.payload, '$.evidence'), '$.checkpoint') != ''
          THEN json_extract(json_extract(e.payload, '$.evidence'), '$.checkpoint')
          WHEN json_extract(json_extract(e.payload, '$.evidence'), '$.error') IS NOT NULL
           AND json_extract(json_extract(e.payload, '$.evidence'), '$.error') != ''
          THEN json_extract(json_extract(e.payload, '$.evidence'), '$.error')
          ELSE NULL
        END
      ELSE json_extract(e.payload, '$.evidence')
    END, 1, 280)
  FROM events e
  WHERE e.app_id = applications.app_id
    AND e.type = 'state_transition'
    AND json_extract(e.payload, '$.to') IN ('blocked','rejected','parked','needs_me','submitted','confirmed')
  ORDER BY e.at DESC, e.id DESC
  LIMIT 1
)
WHERE (status_reason IS NULL OR status_reason = '')
  AND state IN ('blocked','rejected','parked','needs_me','submitted','confirmed')
  AND EXISTS (
    SELECT 1 FROM events e2
    WHERE e2.app_id = applications.app_id
      AND e2.type = 'state_transition'
      AND json_extract(e2.payload, '$.to') IN ('blocked','rejected','parked','needs_me','submitted','confirmed')
  );
