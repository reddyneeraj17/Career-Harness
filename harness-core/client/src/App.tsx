import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaTopScrim, bytesToBase64 } from "@hatch/space-sdk/client";
import { api } from "./api";

type Tab = "overview" | "applications" | "resumes" | "runs" | "schedules" | "replies" | "datasets" | "profile";
type AnyData = Record<string, any>;

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "pulse" },
  { id: "applications", label: "Applications", icon: "file" },
  { id: "resumes", label: "Resumes", icon: "resume" },
  { id: "runs", label: "Runs", icon: "play" },
  { id: "schedules", label: "Schedules", icon: "schedule" },
  { id: "replies", label: "Replies", icon: "reply" },
  { id: "datasets", label: "Datasets", icon: "vendors" },
  { id: "profile", label: "Profile", icon: "profile" },
];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "file") return <svg {...common}><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 13h5M10 17h5"/></svg>;
  if (name === "resume") return <svg {...common}><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>;
  if (name === "play") return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></svg>;
  if (name === "schedule") return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="m9 15 2 2 4-4"/></svg>;
  if (name === "reply") return <svg {...common}><path d="m9 17-5-5 5-5"/><path d="M4 12h9a6 6 0 0 1 6 6"/></svg>;
  if (name === "vendors") return <svg {...common}><path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 12h18M10 12v2h4v-2"/></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6z"/><path d="m9 12 2 2 4-5"/></svg>;
  if (name === "profile") return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M4 4h2M18 4h2"/></svg>;
  if (name === "refresh") return <svg {...common}><path d="M20 6v5h-5"/><path d="M18.5 15a7 7 0 1 1-.4-6.7L20 11"/></svg>;
  if (name === "search") return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
  if (name === "chevron") return <svg {...common}><path d="m9 18 6-6-6-6"/></svg>;
  if (name === "external") return <svg {...common}><path d="M14 4h6v6M10 14 20 4M20 14v6H4V4h6"/></svg>;
  if (name === "eye") return <svg {...common}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.6"/></svg>;
  if (name === "eye-off") return <svg {...common}><path d="m3 3 18 18"/><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a15.7 15.7 0 0 1-2.1 2.8M6.6 6.6C4 8.2 2.5 12 2.5 12s3.5 6 9.5 6a9.7 9.7 0 0 0 3.2-.5"/><path d="M10 10a2.8 2.8 0 0 0 4 4"/></svg>;
  return <svg {...common}><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>;
}

const fmt = (n: unknown) => Number(n ?? 0).toLocaleString("en-US");
const when = (value: unknown) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(String(value))) : "—";
const chicagoWhen = (value: unknown) => {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(date);
};
const titleCase = (s: string) => s.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());

type DatePreset = "today" | "7d" | "30d" | "all" | "custom";
type DateRange = { preset: DatePreset; start: string; end: string };

const chicagoDateKey = (value: unknown): string => {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : "";
};

const shiftDateKey = (key: string, days: number): string => {
  const [yearText = "", monthText = "", dayText = ""] = key.split("-");
  const year = Number(yearText); const month = Number(monthText); const day = Number(dayText);
  if (![year, month, day].every(Number.isFinite)) return key;
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

const dateBounds = (range: DateRange): { start: string; end: string } => {
  if (range.preset === "all") return { start: "", end: "" };
  if (range.preset === "custom") return { start: range.start, end: range.end };
  const today = chicagoDateKey(new Date());
  return { start: range.preset === "today" ? today : shiftDateKey(today, range.preset === "7d" ? -6 : -29), end: today };
};

const fallsInDateRange = (value: unknown, range: DateRange): boolean => {
  if (range.preset === "all") return true;
  const key = chicagoDateKey(value); const bounds = dateBounds(range);
  if (!key) return false;
  return (!bounds.start || key >= bounds.start) && (!bounds.end || key <= bounds.end);
};

function DateRangeControl({ value, onChange, label }: { value: DateRange; onChange: (next: DateRange) => void; label: string }) {
  const presets: { id: Exclude<DatePreset, "custom">; label: string }[] = [
    { id: "today", label: "Today" }, { id: "7d", label: "Last 7 days" }, { id: "30d", label: "Last 30 days" }, { id: "all", label: "All" },
  ];
  return <fieldset className="date-range" aria-label={label}>
    <legend>Date range <span>America/Chicago</span></legend>
    <div className="date-presets">{presets.map((preset) => <button key={preset.id} type="button" className={value.preset === preset.id ? "active" : ""} aria-pressed={value.preset === preset.id} onClick={() => onChange({ ...value, preset: preset.id })}>{preset.label}</button>)}</div>
    <div className="date-inputs">
      <label><span>Start</span><input type="date" aria-label={`${label} start date`} value={value.start} onChange={(event) => onChange({ ...value, preset: "custom", start: event.target.value })} /></label>
      <label><span>End</span><input type="date" aria-label={`${label} end date`} value={value.end} onChange={(event) => onChange({ ...value, preset: "custom", end: event.target.value })} /></label>
    </div>
  </fieldset>;
}

function Status({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone = /submitted|confirmed|completed|healthy|sent|auto_sent|in_sync|enabled|passed|approved/.test(normalized)
    ? "good"
    : /rejected|failed|blocked|error|cancelled/.test(normalized)
      ? "danger"
      : /attention|drift|needs_me|held|pending|unknown|disabled/.test(normalized)
        ? "warn"
        : "neutral";
  return <span className={`status status-${tone}`}>{titleCase(value)}</span>;
}

function Kpi({ label, value, hero = false, note }: { label: string; value: unknown; hero?: boolean; note?: string }) {
  const display = typeof value === "number" ? fmt(value) : String(value ?? 0);
  return <div className={hero ? "kpi kpi-hero" : "kpi"}><span>{label}</span><strong>{display}</strong>{note && <small>{note}</small>}</div>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="empty"><div className="empty-mark"><span /><span /><span /></div><h3>{title}</h3><p>{body}</p></div>;
}

const fileName = (path: string) => path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
type WorkspaceFileRef = { app_id: string; kind: "resume" | "screenshot" | "confirmation" | "prep" } | { variant_id: string };

function WorkspaceFileButton({ fileRef, label, displayName }: { fileRef: WorkspaceFileRef; label: string; displayName: string }) {
  const [preview, setPreview] = useState<{ filename: string; url: string; contentType: string; pages: { page: number; url: string }[]; truncated: boolean } | null>(null);
  const open = useMutation({
    mutationFn: () => api.file_open(fileRef),
    onSuccess: (result) => setPreview({
      filename: result.filename,
      url: new URL(result.file_url, window.location.href).href,
      contentType: result.content_type,
      pages: result.preview_pages.map((page) => ({ page: page.page, url: new URL(page.file_url, window.location.href).href })),
      truncated: result.preview_truncated,
    }),
  });
  useEffect(() => {
    if (!preview) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [preview]);
  return <>
    <span className="workspace-file-control"><button type="button" className="file-button" onClick={() => open.mutate()} disabled={open.isPending} aria-label={`${label}: ${displayName}`}>{open.isPending ? "Opening…" : label} <Icon name="eye" size={14} /></button>{open.isError && <small>File unavailable</small>}</span>
    {preview && <div className="dialog-backdrop pdf-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
      <div className="pdf-preview" role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title">
        <div className="pdf-preview-head"><div><span>{preview.contentType === "application/pdf" ? "PDF preview" : "Text preview"}</span><h2 id="pdf-preview-title">{preview.filename}</h2></div><button type="button" className="pdf-close" onClick={() => setPreview(null)} aria-label={`Close ${preview.filename}`}>Close</button></div>
        {preview.contentType === "text/plain" ? <div className="text-file-preview"><iframe src={preview.url} title={preview.filename} /></div> : <div className="pdf-preview-pages" aria-label={`${preview.filename} preview pages`}>
          {preview.pages.length > 0 ? preview.pages.map((page) => <figure key={page.page}><img src={page.url} alt={`Page ${page.page} of ${preview.filename}`} /><figcaption>Page {page.page}</figcaption></figure>) : <div className="pdf-preview-empty"><b>Preview unavailable</b><span>Download the original PDF below.</span></div>}
          {preview.truncated && <p className="pdf-preview-note">Preview shows the first {preview.pages.length} pages. Download the PDF to see the rest.</p>}
        </div>}
        <div className="pdf-preview-actions"><a href={preview.url} download={preview.filename}>Download {preview.contentType === "application/pdf" ? "PDF" : "file"}</a><span>The original file is unchanged.</span></div>
      </div>
    </div>}
  </>;
}

function ScreenshotEvidence({ appId, path }: { appId: string; path: string }) {
  const asset = useQuery({ queryKey: ["workspace-file", appId, "screenshot", path], queryFn: () => api.file_open({ app_id: appId, kind: "screenshot" }), staleTime: 10 * 60_000 });
  if (asset.isPending) return <span className="evidence-status">Loading capture…</span>;
  if (asset.isError) return <span className="evidence-status evidence-missing">not captured</span>;
  return <a className="screenshot-link" href={asset.data.file_url} target="_blank" rel="noreferrer" download={asset.data.filename} aria-label={`Open submission screenshot ${asset.data.filename}`}><img src={asset.data.file_url} alt="Submission evidence screenshot" /><span>Open capture</span></a>;
}

function Section({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`section ${className}`}><div className="section-head"><h2>{title}</h2>{aside}</div>{children}</section>;
}

function ApprovalCard({ approval, judgedBy, onResolved }: { approval: AnyData; judgedBy: string; onResolved: () => void }) {
  const isLinkedIn = approval.kind === "linkedin_section";
  const original = String(approval.proposed_text ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(original);
  const [message, setMessage] = useState("");
  const resolve = useMutation({
    mutationFn: ({ answer, editedText }: { answer: string; editedText?: string }) => api.approval_resolve({ approval_id: String(approval.approval_id), answer, judged_by: judgedBy, ...(editedText ? { edited_text: editedText } : {}) }),
    onSuccess: (result) => {
      if (!result.ok) { setMessage(result.message ?? "This decision could not be saved."); return; }
      onResolved();
    },
    onError: () => setMessage("This decision could not be saved. Nothing changed."),
  });
  if (!isLinkedIn) return <article className="approval"><div><Status value={String(approval.kind)} /><h3>{approval.question}</h3><p>{when(approval.created_at)}{approval.app_id ? ` · ${approval.app_id}` : ""}</p></div><div className="approval-actions">{(Array.isArray(approval.options) ? approval.options : []).map((option: string) => <button type="button" key={option} disabled={resolve.isPending} onClick={() => resolve.mutate({ answer: option })}>{option}</button>)}</div>{message && <p className="inline-error" role="alert">{message}</p>}</article>;
  const section = titleCase(String(approval.section ?? "LinkedIn section"));
  const approve = () => {
    const next = draft.trim();
    if (!next) { setMessage("Proposed text cannot be empty."); return; }
    resolve.mutate({ answer: "Approve", ...(next !== original.trim() ? { editedText: next } : {}) });
  };
  return <article className="approval linkedin-approval">
    <div className="linkedin-approval-head"><div><Status value="linkedin_section" /><h3>{section}</h3></div><span>{when(approval.created_at)}</span></div>
    <p className="linkedin-question">{approval.question}</p>
    <div className="linkedin-diff">
      <section><span>Current</span><div className="linkedin-copy">{String(approval.current_text ?? "").trim() || "Not set"}</div></section>
      <section><span>{editing ? "Edit proposal" : "Proposed"}</span>{editing ? <textarea aria-label={`Edit proposed ${section}`} value={draft} onChange={(event) => setDraft(event.target.value)} /> : <div className="linkedin-copy proposed">{original}</div>}</section>
    </div>
    {approval.run_id && <code className="linkedin-run-id">{approval.run_id}</code>}
    {message && <p className="inline-error" role="alert">{message}</p>}
    <div className="approval-actions linkedin-approval-actions">
      {editing ? <><button type="button" className="approve-section" disabled={resolve.isPending || !draft.trim()} onClick={approve}>{resolve.isPending ? "Starting apply…" : "Approve edited text"}</button><button type="button" disabled={resolve.isPending} onClick={() => { setDraft(original); setEditing(false); setMessage(""); }}>Cancel edit</button></> : <><button type="button" className="approve-section" disabled={resolve.isPending} onClick={approve}>{resolve.isPending ? "Starting apply…" : "Approve"}</button><button type="button" disabled={resolve.isPending} onClick={() => setEditing(true)}>Edit</button></>}
      <button type="button" className="discard-section" disabled={resolve.isPending} onClick={() => resolve.mutate({ answer: "Discard" })}>Discard</button>
    </div>
  </article>;
}

function Overview({ data, onRefresh, refreshing }: { data: AnyData; onRefresh: () => void; refreshing: boolean }) {
  const c = data.counts ?? { by_state: {} }; const approvals = Array.isArray(data.approvals) ? data.approvals : [];
  const [question, setQuestion] = useState(""); const [answer, setAnswer] = useState<AnyData | null>(null);
  const [optimizeNotice, setOptimizeNotice] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  const ask = useMutation({ mutationFn: (query: string) => api.snapshot({ view: "ask", query }), onSuccess: (r) => setAnswer((r.data ?? {}) as AnyData) });
  const optimize = useMutation({
    mutationFn: () => api.linkedin_optimize_start({}),
    onSuccess: (result) => {
      if (!result.ok) { setOptimizeNotice({ tone: "error", text: result.message }); return; }
      setOptimizeNotice({ tone: "good", text: `LinkedIn audit started · ${result.run_id}` });
      onRefresh();
    },
    onError: () => setOptimizeNotice({ tone: "error", text: "The LinkedIn optimizer run could not be started." }),
  });
  const submitAsk = (e: FormEvent) => { e.preventDefault(); const q = question.trim(); if (q) ask.mutate(q); };
  return <>
    <div className="page-lead"><div><p className="eyebrow">Live control plane</p><h1>What needs attention now?</h1><p>Throughput, fleet signal, and decisions from one store.</p></div><div className="page-lead-actions"><button type="button" className="optimize-linkedin" onClick={() => { setOptimizeNotice(null); optimize.mutate(); }} disabled={optimize.isPending}><Icon name="profile" size={17} />{optimize.isPending ? "Starting…" : "Optimize LinkedIn"}</button><RefreshButton onClick={onRefresh} active={refreshing} /></div></div>
    {optimizeNotice && <div className={`save-notice ${optimizeNotice.tone}`} role={optimizeNotice.tone === "error" ? "alert" : "status"}>{optimizeNotice.text}</div>}
    <div className="kpi-band"><Kpi hero label="Total applications" value={c.total} note="All recorded states" /><Kpi label="Submitted" value={c.by_state?.submitted} /><Kpi label="Blocked" value={c.by_state?.blocked} /><Kpi label="Runs · 24h" value={data.runs_24h} /><Kpi label="Events · 24h" value={data.events_24h} /></div>
    <div className="overview-grid">
      <Section title="Fleet health · 24 hours" aside={<span className="live-dot">Live</span>}>
        <div className="signal"><div className="signal-ring"><strong>{fmt(data.healthy_runs_24h)}</strong><span>healthy</span></div><div><p><b>{fmt(data.runs_24h)}</b> runs observed</p><p><b>{fmt(data.events_24h)}</b> ledger events</p><p className="muted">Health is derived from runs and events.</p></div></div>
      </Section>
      <div id="approval-queue">
        <Section title="Approval batch" aside={<span className="count-label">{fmt(approvals.length)} open</span>}>
          {approvals.length === 0 ? <Empty title="Queue clear" body="New approval requests will appear here." /> : <div className="stack">{approvals.map((approval: AnyData) => <ApprovalCard key={approval.approval_id} approval={approval} judgedBy="dashboard" onResolved={onRefresh} />)}</div>}
        </Section>
      </div>
    </div>
    <Section title="Ask the ledger" aside={<span className="source-note">Deterministic routing</span>} className="ask-section">
      <form className="ask-form" onSubmit={submitAsk}><Icon name="search" /><input aria-label="Ask the ledger" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. How many applications are blocked?" /><button type="submit" disabled={ask.isPending}>{ask.isPending ? "Checking…" : "Ask"}</button></form>
      {ask.isError && <p className="inline-error">Ledger unavailable. Try again.</p>}
      {answer && <div className="answer"><p>{String(answer.answer ?? "No answer returned.")}</p><small>Sources: {(answer.sources ?? []).join(", ") || "routing dictionary"}</small></div>}
      {!answer && <div className="query-hints"><button onClick={() => { setQuestion("Show application totals"); ask.mutate("Show application totals"); }}>Applications</button><button onClick={() => { setQuestion("Any blockers?"); ask.mutate("Any blockers?"); }}>Blockers</button><button onClick={() => { setQuestion("Token usage"); ask.mutate("Token usage"); }}>Tokens</button><button onClick={() => { setQuestion("System health"); ask.mutate("System health"); }}>Health</button></div>}
    </Section>
  </>;
}

type BreakdownItem = { key: string; label: string };

function ProvenanceBreakdown({ title, counts, items }: { title: string; counts: AnyData; items: BreakdownItem[] }) {
  const extra = Object.keys(counts ?? {}).filter((key) => !items.some((item) => item.key === key)).sort().map((key) => ({ key, label: titleCase(key) }));
  return <div className="provenance-dimension"><h3>{title}</h3><div>{[...items, ...extra].map((item) => <span key={item.key}><b>{fmt(counts?.[item.key])}</b>{item.label}</span>)}</div></div>;
}

function ApplicationDetailDialog({ appId, onClose }: { appId: string; onClose: () => void }) {
  const timeline = useQuery({ queryKey: ["app-timeline", appId], queryFn: () => api.app_timeline({ app_id: appId }), staleTime: 30_000 });
  const data = timeline.data as AnyData | undefined;
  const app = data?.app as AnyData | undefined;
  const events = Array.isArray(data?.timeline) ? data.timeline : [];
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="confirm-dialog detail-dialog" role="dialog" aria-modal="true" aria-label="Application details">
      <div className="detail-head">
        <div><h2>{app ? `${String(app.role)}` : "Application"}</h2><p>{app ? `${String(app.company)} · ${titleCase(String(app.state ?? ""))}` : appId}</p></div>
        <button type="button" className="dialog-close" onClick={onClose} aria-label="Close details">✕</button>
      </div>
      {timeline.isPending && <p className="muted">Loading timeline…</p>}
      {timeline.isError && <p className="inline-error" role="alert">Could not load the timeline. Nothing changed.</p>}
      {data && !data.found && <p className="inline-error" role="alert">Application not found.</p>}
      {app && <>
        <div className="detail-grid">
          <div><span>Application</span><code>{String(app.app_id)}</code></div>
          <div><span>Campaign</span><b>{String(app.campaign_id ?? "—")}</b></div>
          <div><span>Run</span><code>{app.run_id ? String(app.run_id).slice(0, 13) + "…" : "—"}</code></div>
          <div><span>Source</span><b>{String(app.source ?? "—")}</b></div>
          <div><span>Updated</span><b>{chicagoWhen(app.updated_at)}</b></div>
          <div><span>Submitted</span><b>{app.submitted_at ? chicagoWhen(app.submitted_at) : "—"}</b></div>
        </div>
        {app.reason && <div className="detail-reason"><span>Reason</span><p>{String(app.reason)}</p></div>}
        {app.blocker && <p className="blocker">{String(app.blocker)}</p>}
        {app.outcome && <p className="muted">Outcome: {String(app.outcome)}</p>}
        {app.confirmation && <blockquote className="confirmation">“{String(app.confirmation)}”</blockquote>}
        <div className="detail-evidence">
          <span>Evidence</span>
          <div>
            {app.resume_path ? <WorkspaceFileButton fileRef={{ app_id: String(app.app_id), kind: "resume" }} label={fileName(String(app.resume_path))} displayName={fileName(String(app.resume_path))} /> : <b className="evidence-missing">no resume</b>}
            {app.screenshot_path ? <ScreenshotEvidence appId={String(app.app_id)} path={String(app.screenshot_path)} /> : <b className="evidence-missing">no screenshot</b>}
            {app.talking_points_path ? <WorkspaceFileButton fileRef={{ app_id: String(app.app_id), kind: "prep" }} label="Talking points" displayName={fileName(String(app.talking_points_path))} /> : null}
          </div>
        </div>
        <div className="detail-timeline">
          <span>Timeline · {events.length} event{events.length === 1 ? "" : "s"}</span>
          {events.length === 0 ? <p className="muted">No events recorded for this application.</p> : <ol>
            {events.map((e: AnyData, i: number) => <li key={i} className="timeline-event">
              <div className="timeline-event-head"><b>{e.type === "state_transition" && e.from && e.to ? `${titleCase(String(e.from))} → ${titleCase(String(e.to))}` : titleCase(String(e.type ?? "event")).replaceAll("_", " ")}</b><time>{chicagoWhen(e.at)}</time></div>
              {e.reason && <p className="timeline-reason">{String(e.reason)}</p>}
              {e.evidence && <details className="timeline-evidence"><summary>Evidence</summary><pre>{String(e.evidence)}</pre></details>}
            </li>)}
          </ol>}
        </div>
      </>}
      <div className="detail-actions"><button type="button" onClick={onClose}>Close</button></div>
    </div>
  </div>;
}

function Applications({ data, onRefresh, refreshing, onOpenOverview }: { data: AnyData; onRefresh: () => void; refreshing: boolean; onOpenOverview: () => void }) {
  const ledger = Array.isArray(data.ledger) ? data.ledger : [];
  const provenance = data.provenance_summary ?? {};
  const [filter, setFilter] = useState("all"); const [search, setSearch] = useState("");
  const [provenanceOpen, setProvenanceOpen] = useState(false);
  const [detailAppId, setDetailAppId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ preset: "all", start: "", end: "" });
  const [resumeTarget, setResumeTarget] = useState<{ appId: string; label: string } | null>(null);
  const [resumeNote, setResumeNote] = useState("");
  const [resumeNotice, setResumeNotice] = useState<{ tone: "good" | "error"; text: string; needsApproval?: boolean } | null>(null);
  const resume = useMutation({
    mutationFn: () => api.app_resume({ app_id: resumeTarget?.appId ?? "", ...(resumeNote.trim() ? { note: resumeNote.trim() } : {}) }),
    onSuccess: (result) => {
      if (!result.ok) { setResumeNotice({ tone: "error", text: result.message ?? "This application could not be resumed.", needsApproval: /approval/i.test(result.message ?? "") }); return; }
      setResumeNotice({ tone: "good", text: `${resumeTarget?.label ?? "Application"} returned to Reviewed.` });
      setResumeTarget(null); setResumeNote(""); onRefresh();
    },
    onError: () => setResumeNotice({ tone: "error", text: "The application could not be resumed. Nothing changed." }),
  });
  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ledger.filter((application: AnyData) => {
      const state = String(application.state ?? "");
      const haystack = [application.company, application.role, application.app_id, application.campaign_id, application.status_reason].map((value) => String(value ?? "").toLowerCase()).join(" ");
      return fallsInDateRange(application.updated_at, dateRange) && (filter === "all" || state === filter) && (!query || haystack.includes(query));
    });
  }, [ledger, dateRange, filter, search]);
  const counts = useMemo(() => shown.reduce((summary: Record<string, number>, application: AnyData) => {
    const state = String(application.state ?? "unknown"); summary[state] = (summary[state] ?? 0) + 1; return summary;
  }, {}), [shown]);
  const states = ["all", ...Array.from(new Set(ledger.map((a: AnyData) => String(a.state))))];
  const bounds = dateBounds(dateRange);
  const rangeNote = dateRange.preset === "all" ? "All recorded dates" : dateRange.preset === "today" ? "Today · America/Chicago" : dateRange.preset === "custom" ? [bounds.start, bounds.end].filter(Boolean).join(" — ") || "Choose start or end" : dateRange.preset === "7d" ? "Last 7 Chicago days" : "Last 30 Chicago days";
  return <>
    <div className="page-lead"><div><p className="eyebrow">Application ledger</p><h1>Applications, fully traceable</h1><p>Filter the ledger without losing its evidence trail.</p></div><RefreshButton onClick={onRefresh} active={refreshing} /></div>
    {resumeNotice && <div className={`save-notice ${resumeNotice.tone}`} role={resumeNotice.tone === "error" ? "alert" : "status"}><span>{resumeNotice.text}</span>{resumeNotice.needsApproval && <button type="button" className="notice-link" onClick={onOpenOverview}>Open approval on Overview</button>}</div>}
    <div className="kpi-band applications-kpis"><Kpi hero label="Matching applications" value={shown.length} note={rangeNote} /><Kpi label="Submitted" value={counts.submitted} /><Kpi label="Held" value={(counts.held ?? 0) + (counts.needs_me ?? 0)} /><Kpi label="Blocked" value={counts.blocked} /><Kpi label="Rejected" value={counts.rejected} /><Kpi label="Parked" value={counts.parked} /></div>
    <section className={`section provenance-section${provenanceOpen ? " is-open" : " is-collapsed"}`} aria-labelledby="submission-sources-heading">
      <div className="section-head">
        <button type="button" className="provenance-toggle" aria-expanded={provenanceOpen} aria-controls="submission-sources-breakdown" onClick={() => setProvenanceOpen((open) => !open)}>
          <span id="submission-sources-heading" className="provenance-toggle-title" role="heading" aria-level={2}>Submission sources</span>
          <span className="provenance-toggle-meta"><span className="count-label">{fmt(provenance.submitted_total)} submitted</span><Icon name="chevron" size={16} /></span>
        </button>
      </div>
      <div id="submission-sources-breakdown" hidden={!provenanceOpen}>
        <div className="provenance-board">
          <ProvenanceBreakdown title="Source" counts={provenance.by_source} items={[{ key: "company_portal", label: "Companies" }, { key: "vendor_portal", label: "Vendors" }, { key: "job_board", label: "Job boards" }, { key: "linkedin", label: "LinkedIn" }, { key: "open_web", label: "Open web" }, { key: "not_recorded", label: "Not recorded" }]} />
          <ProvenanceBreakdown title="Tier" counts={provenance.by_tier} items={[{ key: "1", label: "Tier 1" }, { key: "2", label: "Tier 2" }, { key: "3", label: "Tier 3" }, { key: "unknown", label: "Unknown" }, { key: "not_recorded", label: "Not recorded" }]} />
          <ProvenanceBreakdown title="Employment lane" counts={provenance.by_lane} items={[{ key: "full_time", label: "Full time" }, { key: "w2_contract", label: "W2 contract" }, { key: "c2c_contract", label: "C2C contract" }, { key: "part_time", label: "Part time" }, { key: "internship", label: "Internship" }, { key: "not_recorded", label: "Not recorded" }]} />
          <ProvenanceBreakdown title="H-1B result" counts={provenance.by_h1b_result} items={[{ key: "scored", label: "Scored" }, { key: "unknown", label: "Unknown" }, { key: "not_applicable", label: "Bypassed" }, { key: "not_recorded", label: "Not recorded" }]} />
          <ProvenanceBreakdown title="Discovery phase" counts={provenance.by_discovery_phase} items={[{ key: "dataset", label: "Dataset" }, { key: "web_expansion", label: "Web expansion" }, { key: "additional_source", label: "Additional source" }, { key: "not_recorded", label: "Not recorded" }]} />
        </div>
      </div>
    </section>
    <Section title="Application ledger" aside={<span className="count-label">{fmt(shown.length)} of {fmt(ledger.length)}</span>}>
      <div className="filter-console">
        <div className="filters"><label><span>Search</span><input type="search" aria-label="Search applications" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Company, role, reason, or ID" /></label><label><span>State</span><select aria-label="Filter by application state" value={filter} onChange={(e) => setFilter(e.target.value)}>{states.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select></label></div>
        <DateRangeControl value={dateRange} onChange={setDateRange} label="Filter applications by updated date" />
      </div>
      {shown.length === 0 ? <Empty title={ledger.length ? "No applications match" : "No applications yet"} body={ledger.length ? "Change a date, state, or search filter to widen the ledger." : "Claimed postings will appear here with state, evidence, and attribution."} /> : <div className="ledger">{shown.map((a: AnyData) => <article className="ledger-row application-row" key={a.app_id}>
        <div className="ledger-main"><div><h3>{a.role}</h3><p>{a.company}</p></div><Status value={a.state} /></div>
        <div className="ledger-meta"><span>{a.campaign_id}</span><code>{a.app_id}</code><span>{chicagoWhen(a.updated_at)}</span></div>
        <div className="provenance-line" aria-label={`Provenance for ${String(a.role)}`}>
          <span><b>Source</b>{a.source_name || a.source || "Not recorded"}{a.source_class ? ` · ${titleCase(String(a.source_class))}` : ""}</span>
          <span><b>Tier</b>{a.source_tier && a.source_tier !== "unknown" ? `Tier ${a.source_tier}` : "Unknown"}</span>
          <span><b>Lane</b>{a.selected_lane ? titleCase(String(a.selected_lane)) : "Not recorded"}</span>
          <span><b>H-1B</b>{a.h1b_result ? titleCase(String(a.h1b_result === "not_applicable" ? "bypassed" : a.h1b_result)) : "Not recorded"}{a.h1b_mode ? ` · ${titleCase(String(a.h1b_mode))}` : ""}</span>
          <span><b>Discovery</b>{a.discovery_phase ? titleCase(String(a.discovery_phase)) : "Not recorded"}</span>
          {Array.isArray(a.employment_types_offered) && a.employment_types_offered.length > 0 && <span><b>Offered</b>{a.employment_types_offered.map((value: string) => titleCase(value)).join(", ")}</span>}
        </div>
        <div className="evidence-grid">
          <div className="evidence-cell"><span>Resume used</span>{a.resume_path ? <><WorkspaceFileButton fileRef={{ app_id: String(a.app_id), kind: "resume" }} label={fileName(String(a.resume_path))} displayName={fileName(String(a.resume_path))} />{a.variant_id && <small>{a.variant_id}</small>}{a.resume_hash && <code title={String(a.resume_hash)}>{String(a.resume_hash).slice(0, 12)}…</code>}</> : <b>Not recorded</b>}</div>
          <div className="evidence-cell"><span>Screenshot</span>{a.screenshot_path && a.screenshot_exists ? <ScreenshotEvidence appId={String(a.app_id)} path={String(a.screenshot_path)} /> : <b className="evidence-missing">not captured</b>}</div>
          <div className="evidence-cell"><span>Reason</span><b className={a.status_reason ? "status-reason" : "evidence-missing"}>{a.status_reason ? String(a.status_reason) : "—"}</b></div>
          {a.talking_points_path && <div className="evidence-cell"><span>Talking points</span><WorkspaceFileButton fileRef={{ app_id: String(a.app_id), kind: "prep" }} label="Open talking points" displayName={fileName(String(a.talking_points_path))} /><small>{fileName(String(a.talking_points_path))}</small></div>}
        </div>
        {a.confirmation && <blockquote className="confirmation">“{a.confirmation}”{a.confirmation_path && <small>{fileName(String(a.confirmation_path))}</small>}</blockquote>}
        {a.blocker && <p className="blocker">{a.blocker}</p>}
        <div className="application-actions">
          <button type="button" className="text-link" onClick={() => setDetailAppId(String(a.app_id))}>Details & timeline</button>
          {a.url && <a className="text-link" href={a.url} target="_blank" rel="noreferrer">Open posting <Icon name="external" size={14} /></a>}
          {(a.state === "parked" || a.state === "needs_me") && <button type="button" className="resume-application" onClick={() => { setResumeTarget({ appId: String(a.app_id), label: `${String(a.role)} at ${String(a.company)}` }); setResumeNote(""); setResumeNotice(null); }}>Resume</button>}
        </div>
      </article>)}</div>}
    </Section>
    {detailAppId && <ApplicationDetailDialog appId={detailAppId} onClose={() => setDetailAppId(null)} />}
    {resumeTarget && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !resume.isPending) setResumeTarget(null); }}>
      <form className="confirm-dialog resume-dialog" role="dialog" aria-modal="true" aria-labelledby="resume-dialog-title" onSubmit={(event) => { event.preventDefault(); resume.mutate(); }}>
        <h2 id="resume-dialog-title">Resume application</h2>
        <p><b>{resumeTarget.label}</b> will return to Reviewed so the next coordinator run can continue it.</p>
        <label><span>Optional note</span><textarea aria-label="Resume note" value={resumeNote} onChange={(event) => setResumeNote(event.target.value)} maxLength={2000} placeholder="What changed or what should the next run know?" /></label>
        {resumeNotice?.tone === "error" && <p className="inline-error" role="alert">{resumeNotice.text}</p>}
        <div>{resumeNotice?.needsApproval && <button type="button" onClick={() => { setResumeTarget(null); onOpenOverview(); }}>Open Overview</button>}<button type="button" onClick={() => setResumeTarget(null)} disabled={resume.isPending}>Cancel</button><button type="submit" className="primary-button" disabled={resume.isPending}>{resume.isPending ? "Resuming…" : "Return to reviewed"}</button></div>
      </form>
    </div>}
  </>;
}

function suggestedVariantId(filename: string): string {
  return filename.replace(/\.pdf$/i, "").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[._-]+|[._-]+$/g, "");
}

function Resumes({ data, onRefresh, refreshing }: { data: AnyData; onRefresh: () => void; refreshing: boolean }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const resumes = Array.isArray(data.resumes) ? data.resumes : [];
  const totalUses = resumes.reduce((sum: number, resume: AnyData) => sum + Number(resume.exact_usage ?? 0), 0);
  const [selected, setSelected] = useState<{ filename: string; bytes_base64: string } | null>(null);
  const [variantId, setVariantId] = useState("");
  const [roleFamily, setRoleFamily] = useState("");
  const [industryTags, setIndustryTags] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [notice, setNotice] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState<AnyData | null>(null);
  const duplicate = variantId.trim() ? resumes.some((resume: AnyData) => String(resume.variant_id).toLowerCase() === variantId.trim().toLowerCase()) : false;
  const refreshLibrary = () => { void queryClient.invalidateQueries({ queryKey: ["snapshot", "resumes"] }); onRefresh(); };
  const upload = useMutation({
    mutationFn: () => api.resume_upload({ filename: selected?.filename ?? "", bytes_base64: selected?.bytes_base64 ?? "", variant_id: variantId.trim(), role_family: roleFamily.trim(), industry_tags: csvList(industryTags) }),
    onSuccess: (result) => {
      if (!result.ok) { setUploadError(result.message); return; }
      setNotice({ tone: "good", text: `Variant '${result.variant_id}' uploaded. SHA-256 ${result.sha256}` });
      setSelected(null); setVariantId(""); setRoleFamily(""); setIndustryTags(""); setUploadError("");
      if (inputRef.current) inputRef.current.value = "";
      refreshLibrary();
    },
    onError: () => setUploadError("The PDF could not be uploaded. No library entry was added."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.resume_delete({ variant_id: id }),
    onSuccess: (result) => {
      if (!result.ok) { setNotice({ tone: "error", text: result.message }); return; }
      setNotice({ tone: "good", text: result.file_moved ? `Variant '${result.variant_id}' removed from the library. PDF moved to ${result.trashed_path}.` : `Variant '${result.variant_id}' removed from the library; the file was already missing. Application history is untouched.` });
      setConfirming(null); refreshLibrary();
    },
    onError: () => setNotice({ tone: "error", text: "The resume could not be removed. The library entry was kept." }),
  });
  const chooseFile = async (file: File | undefined) => {
    setNotice(null); setUploadError(""); setSelected(null);
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { setUploadError("The uploaded PDF is larger than the 15 MB limit."); return; }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length < 5 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46 || bytes[4] !== 0x2d) { setUploadError("The uploaded file is not a PDF."); return; }
    const filename = file.name.split(/[\\/]/).filter(Boolean).at(-1) ?? "";
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/i.test(filename)) { setUploadError("Rename the PDF so its filename starts with a letter or number and uses only letters, numbers, dots, underscores, or hyphens."); return; }
    setSelected({ filename, bytes_base64: bytesToBase64(bytes) });
    setVariantId(suggestedVariantId(filename));
  };
  const submitUpload = (event: FormEvent) => {
    event.preventDefault(); setUploadError("");
    if (!selected) { setUploadError("Choose a PDF first."); return; }
    if (!variantId.trim() || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(variantId.trim())) { setUploadError("Variant id is required and may contain only letters, numbers, dots, underscores, or hyphens."); return; }
    if (duplicate) { setUploadError(`Variant id '${variantId.trim()}' is already registered. Choose a different id.`); return; }
    if (!roleFamily.trim()) { setUploadError("Role family is required."); return; }
    upload.mutate();
  };
  return <>
    <div className="page-lead"><div><p className="eyebrow">Resume library</p><h1>Files that actually ship</h1><p>Upload base PDFs, open the source file, and trace exact application usage.</p></div><RefreshButton onClick={onRefresh} active={refreshing} /></div>
    {notice && <div className={`save-notice ${notice.tone}`} role="status">{notice.text}</div>}
    <div className="kpi-band"><Kpi hero label="Resume variants" value={resumes.length} note="Registered PDFs" /><Kpi label="Exact usage" value={totalUses} /><Kpi label="Used variants" value={resumes.filter((r: AnyData) => Number(r.exact_usage ?? 0) > 0).length} /><Kpi label="Unused variants" value={resumes.filter((r: AnyData) => Number(r.exact_usage ?? 0) === 0).length} /></div>
    <Section title="Resume files" aside={<div className="resume-section-actions"><span className="count-label">{fmt(resumes.length)} files</span><button type="button" className="upload-button" onClick={() => inputRef.current?.click()}>Upload PDF</button><input ref={inputRef} className="visually-hidden" type="file" accept="application/pdf,.pdf" aria-label="Choose resume PDF" onChange={(event) => void chooseFile(event.target.files?.[0])} /></div>}>
      {(selected || uploadError) && <form className="resume-upload" onSubmit={submitUpload} noValidate>
        <div className="resume-upload-file"><b>{selected?.filename ?? "No valid file selected"}</b><span>{selected ? "PDF ready · 15 MB maximum" : "Choose another PDF to continue"}</span></div>
        {selected && <div className="field-grid"><Field label="Variant id" error={duplicate ? `Variant id '${variantId.trim()}' is already registered. Choose a different id.` : undefined}><input value={variantId} onChange={(event) => setVariantId(event.target.value)} autoComplete="off" /></Field><Field label="Role family"><input value={roleFamily} onChange={(event) => setRoleFamily(event.target.value)} placeholder="e.g. Data engineering" /></Field><Field label="Industry tags" hint="Optional, comma separated"><input value={industryTags} onChange={(event) => setIndustryTags(event.target.value)} placeholder="fintech, healthcare" /></Field></div>}
        {uploadError && <p className="inline-error" role="alert">{uploadError}</p>}
        <div className="resume-upload-actions"><button type="button" onClick={() => { setSelected(null); setUploadError(""); if (inputRef.current) inputRef.current.value = ""; }}>Cancel</button>{selected && <button type="submit" className="save-profile" disabled={upload.isPending || duplicate}>{upload.isPending ? "Uploading…" : "Add to library"}</button>}</div>
      </form>}
      {resumes.length === 0 ? <Empty title="No resume variants" body="Upload a base PDF to make it available to the resume picker." /> : <div className="resume-list">{resumes.map((r: AnyData) => <article key={r.variant_id} className="resume-row"><div><h3>{r.variant_id}</h3><p>{r.role_family} · {fmt(r.exact_usage)} uses · {Math.round(Number(r.approval_rate ?? 0) * (Number(r.approval_rate ?? 0) <= 1 ? 100 : 1))}% approval</p><code className="resume-path">{r.path}</code></div><div className="resume-row-actions"><WorkspaceFileButton fileRef={{ variant_id: String(r.variant_id) }} label="Open PDF" displayName={fileName(String(r.path))} /><button type="button" className="delete-resume" onClick={() => setConfirming(r)}>Delete</button></div></article>)}</div>}
    </Section>
    {confirming && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !remove.isPending) setConfirming(null); }}><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-resume-title"><h2 id="delete-resume-title">Remove {String(confirming.variant_id)}?</h2><p><b>Used in {fmt(confirming.exact_usage)} applications.</b></p><p>The PDF moves to recoverable trash. Application history is untouched.</p><div><button type="button" onClick={() => setConfirming(null)} disabled={remove.isPending}>Cancel</button><button type="button" className="danger-button" onClick={() => remove.mutate(String(confirming.variant_id))} disabled={remove.isPending}>{remove.isPending ? "Moving…" : "Move to trash"}</button></div></div></div>}
  </>;
}

const compactTokens = (value: unknown) => {
  const count = Number(value ?? 0);
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K`;
  return Number.isFinite(count) ? count.toLocaleString("en-US") : "0";
};

const stageEntries = (tokens: unknown): [string, number][] => {
  if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) return [];
  const source = "stages" in tokens && tokens.stages && typeof tokens.stages === "object" && !Array.isArray(tokens.stages) ? tokens.stages as Record<string, unknown> : tokens as Record<string, unknown>;
  return Object.entries(source).flatMap(([stage, value]) => {
    if (["input", "output", "total", "stages"].includes(stage)) return [];
    const amount = Number(value);
    return Number.isFinite(amount) ? [[stage, amount] as [string, number]] : [];
  });
};

const eventDetail = (payload: unknown): string => {
  if (payload === null || payload === undefined) return "";
  if (typeof payload === "string") return payload;
  if (typeof payload !== "object" || Array.isArray(payload)) return String(payload);
  const record = payload as Record<string, unknown>;
  const preferred = ["message", "summary", "decision", "reason", "result", "status", "stage", "company", "role", "count"];
  const parts = preferred.flatMap((key) => {
    const value = record[key];
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? [`${titleCase(key)}: ${String(value)}`] : [];
  });
  if (parts.length > 0) return parts.join(" · ");
  try {
    const text = JSON.stringify(payload);
    return text.length > 360 ? `${text.slice(0, 357)}…` : text;
  } catch {
    return "Recorded event payload";
  }
};

const truncateText = (value: unknown, limit = 140): string => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};

const payloadField = (payload: unknown, key: string): string => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "—";
  const value = (payload as Record<string, unknown>)[key];
  return value === null || value === undefined || value === "" ? "—" : truncateText(value);
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

type RunSuggestion = { key: string; label: string; why: string; actionLabel: string; onAction: () => void };

function RunDetail({ runId, onClose, onChanged, onOpenApprovals }: { runId: string; onClose: () => void; onChanged: () => void; onOpenApprovals: () => void }) {
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ["run-detail", runId], queryFn: () => api.run_detail({ run_id: runId }), refetchInterval: 15_000, refetchOnMount: "always", staleTime: 0 });
  const [notice, setNotice] = useState("");
  const [question, setQuestion] = useState("");
  const [askNotice, setAskNotice] = useState("");
  const [watchHighlighted, setWatchHighlighted] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelNotice, setCancelNotice] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  const blockerRef = useRef<HTMLParagraphElement | null>(null);
  const watchRef = useRef<HTMLElement | null>(null);
  const activityRef = useRef<HTMLElement | null>(null);
  const watch = useMutation({
    mutationFn: (next: { watch_chat?: boolean; capture_browser?: boolean }) => api.run_watch_set({ run_id: runId, ...next }),
    onSuccess: (result) => {
      setNotice(result.message);
      void queryClient.invalidateQueries({ queryKey: ["run-detail", runId] });
      onChanged();
    },
  });
  const cancelRun = useMutation({
    mutationFn: () => api.run_cancel({ run_id: runId }),
    onSuccess: (result) => {
      if (!result.ok) {
        setCancelNotice({ tone: "error", text: result.message ?? "This run could not be cancelled." });
        return;
      }
      setCancelConfirmOpen(false);
      setCancelNotice({ tone: "good", text: "Run cancelled. In-flight applications were marked cancelled." });
      void queryClient.invalidateQueries({ queryKey: ["run-detail", runId] });
      onChanged();
    },
    onError: () => setCancelNotice({ tone: "error", text: "This run could not be cancelled. Nothing changed." }),
  });
  const logQuestion = useMutation({
    mutationFn: (asked: string) => api.event_log({ run_id: runId, type: "run_question_asked", payload: { question: asked } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["run-detail", runId] }),
  });
  useEffect(() => {
    if (!watchHighlighted) return;
    const timeout = window.setTimeout(() => setWatchHighlighted(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [watchHighlighted]);
  const approvalChanged = () => { void queryClient.invalidateQueries({ queryKey: ["run-detail", runId] }); onChanged(); };
  const data = (detail.data?.data ?? {}) as AnyData;
  const run = (data.run ?? {}) as AnyData;
  const isActive = detail.data?.found === true && run.ended === null;
  const events = Array.isArray(data.events) ? data.events : [];
  const approvals = Array.isArray(data.approvals) ? data.approvals : [];
  const applications = Array.isArray(data.applications) ? data.applications : [];
  const postingVerdicts = Array.isArray(data.posting_verdicts) ? data.posting_verdicts : [];
  const screenshots = applications.filter((app: AnyData) => Boolean(app.screenshot_path));
  const counts = run.current_state_counts && typeof run.current_state_counts === "object" ? Object.entries(run.current_state_counts as Record<string, unknown>) : [];
  const blocker = String(run.blocker ?? "").trim();
  const hasFetchBlock = /(?:999|bot[- ]block|rate[- ]limit)/i.test(blocker);
  const hasFailureEvent = events.some((event: AnyData) => /fail/i.test(payloadField(event.payload, "verdict")));
  const scrollTo = (ref: { current: HTMLElement | null }) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const highlightWatch = () => {
    setWatchHighlighted(false);
    window.requestAnimationFrame(() => {
      setWatchHighlighted(true);
      scrollTo(watchRef);
    });
  };
  const suggestions: RunSuggestion[] = [];
  if (hasFetchBlock) {
    suggestions.push({
      key: "retry-browser",
      label: "Retry this run via the live browser route",
      why: `The text fetch was bot-blocked; the live browser route is not.${run.campaign_id === "linkedin_optimize" ? " The optimizer skill delegates browser steps to the parent agent." : ""}`,
      actionLabel: "Copy prompt",
      onAction: () => { void copyToClipboard(`Retry run ${runId} via the live browser route`).then((copied) => setAskNotice(copied ? "Retry prompt copied — paste it into the main chat." : "Clipboard access failed. Copy the retry prompt manually.")); },
    });
  } else if (blocker) {
    suggestions.push({ key: "review-blocker", label: "Review the blocker", why: truncateText(blocker), actionLabel: "View blocker", onAction: () => scrollTo(blockerRef) });
  }
  if (approvals.length > 0) suggestions.push({ key: "approvals", label: `Review ${fmt(approvals.length)} pending approvals`, why: `${fmt(approvals.length)} decisions are waiting on you.`, actionLabel: "Open queue", onAction: onOpenApprovals });
  if (["failed", "completed_with_issues"].includes(String(run.status ?? "").toLowerCase()) || hasFailureEvent) suggestions.push({ key: "failures", label: "Open the event log for this run", why: "See what failed and the recorded reason.", actionLabel: "Open log", onAction: () => scrollTo(activityRef) });
  if (run.ended === null || run.ended === undefined) suggestions.push({ key: "watch", label: "Watch in chat", why: "Flip the watch toggle to get screenshots in chat as it works.", actionLabel: "Show controls", onAction: highlightWatch });
  const visibleSuggestions = suggestions.slice(0, 3);
  const submitQuestion = async (event: FormEvent) => {
    event.preventDefault();
    const asked = question.trim();
    if (!asked) return;
    const stateLine = counts.length > 0 ? counts.map(([state, value]) => `${state}=${String(value ?? 0)}`).join(", ") : "none";
    const eventLines = events.slice(0, 8).map((item: AnyData) => `- ${String(item.type ?? "unknown")} | ${String(item.at ?? "—")} | verdict=${payloadField(item.payload, "verdict")} | reason=${payloadField(item.payload, "reason")}`);
    const approvalLines = approvals.map((approval: AnyData) => `- ${String(approval.section ?? approval.kind ?? "unknown")} | current=${truncateText(approval.current_text, 100) || "—"} | proposed=${truncateText(approval.proposed_text, 100) || "—"}`);
    const context = [
      `Ask Muse about run ${runId} (${String(run.campaign_id ?? "unknown")}): ${asked}`,
      "",
      "Run context",
      `run_id: ${runId}`,
      `campaign_id: ${String(run.campaign_id ?? "unknown")}`,
      `mode: ${String(run.mode ?? "unknown")}`,
      `status: ${String(run.status ?? "unknown")}`,
      `current_stage: ${String(run.current_stage ?? "unknown")}`,
      `blocker: ${blocker || "none"}`,
      `state_counts: ${stateLine}`,
      "latest_events:",
      ...(eventLines.length > 0 ? eventLines : ["- none"]),
      "open_approvals:",
      ...(approvalLines.length > 0 ? approvalLines : ["- none"]),
    ].join("\n");
    const copied = await copyToClipboard(context);
    logQuestion.mutate(asked);
    if (copied) {
      setAskNotice("Copied — paste it into the main chat and send; Muse will answer with full run context.");
      setQuestion("");
    } else {
      setAskNotice("Clipboard access failed. Your question was recorded, but the prompt was not copied.");
    }
  };
  return <div className="run-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="run-detail-panel" role="dialog" aria-modal="true" aria-labelledby="run-detail-title">
      <header className="run-detail-head"><div><span>{run.status === "running" ? "Live run" : "Run trace"}</span><h2 id="run-detail-title">{runId}</h2></div><div className="run-detail-head-actions">{isActive && <button type="button" className="cancel-run-button" onClick={() => { setCancelNotice(null); setCancelConfirmOpen(true); }}>Cancel run</button>}<button type="button" onClick={onClose} aria-label={`Close run ${runId}`}>Close</button></div></header>
      {detail.isPending ? <div className="loading run-detail-loading"><span /><p>Reading run trace…</p></div> : detail.isError || detail.data?.found === false ? <div className="run-detail-error"><b>Run trace unavailable</b><p>This run could not be read. Try again.</p><button type="button" onClick={() => void detail.refetch()}>Retry</button></div> : <div className="run-detail-content">
        <div className="run-live-strip"><div><span>Current stage</span><strong>{titleCase(String(run.current_stage ?? run.status ?? "unknown"))}</strong></div><div><span>Status</span><Status value={String(run.status ?? "unknown")} /></div><div><span>Started</span><b>{when(run.started)}</b></div><div><span>Last check</span><b>{when(detail.data?.generated_at)}</b></div></div>
        {cancelNotice && <div className={`save-notice ${cancelNotice.tone}`} role={cancelNotice.tone === "error" ? "alert" : "status"}>{cancelNotice.text}</div>}
        {visibleSuggestions.length > 0 && <section className="run-suggestions" aria-labelledby="run-suggestions-title"><div className="run-suggestions-head"><h3 id="run-suggestions-title">Suggested next steps</h3><span>{fmt(visibleSuggestions.length)}</span></div><div className="run-suggestion-list">{visibleSuggestions.map((suggestion) => <article key={suggestion.key}><div><b>{suggestion.label}</b><p>{suggestion.why}</p></div><button type="button" onClick={suggestion.onAction}>{suggestion.actionLabel}</button></article>)}</div></section>}
        <section className="run-ask" aria-labelledby="run-ask-title"><div><h3 id="run-ask-title">Ask about this run</h3><p>Copies your question with this run’s current context for Muse.</p></div><form onSubmit={(event) => void submitQuestion(event)}><input aria-label="Question about this run" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What caused this blocker?" /><button type="submit" disabled={!question.trim() || logQuestion.isPending}>Send</button></form>{askNotice && <p className={askNotice.startsWith("Copied") || askNotice.startsWith("Retry") ? "run-ask-notice" : "inline-error"} role="status">{askNotice}</p>}{logQuestion.isError && <p className="inline-error" role="alert">The prompt was copied, but the question could not be added to the activity feed.</p>}</section>
        {run.blocker && <p ref={blockerRef} className="run-detail-blocker"><b>Blocker</b>{String(run.blocker)}</p>}
        {counts.length > 0 && <div className="run-counts" aria-label="Current application state counts">{counts.map(([state, value]) => <span key={state}>{titleCase(state)} <b>{fmt(value)}</b></span>)}</div>}
        <section ref={watchRef} className={`watch-controls${watchHighlighted ? " highlighted" : ""}`} aria-labelledby="watch-title"><div className="watch-copy"><h3 id="watch-title">Follow this run</h3><p>Workers receive these preferences with every event they log.</p></div><label className="watch-toggle"><input type="checkbox" checked={run.watch_chat === true} disabled={watch.isPending} onChange={() => watch.mutate({ watch_chat: run.watch_chat !== true })} /><span><b>Main chat updates</b><small>Phase changes and completion</small></span></label><label className="watch-toggle"><input type="checkbox" checked={run.capture_browser === true} disabled={watch.isPending} onChange={() => watch.mutate({ capture_browser: run.capture_browser !== true })} /><span><b>Browser captures</b><small>Ask the worker to retain key portal steps</small></span></label><p className="watch-limit"><b>Live browser video cannot be streamed into main chat.</b> Captured steps appear below when the worker records them.</p>{notice && <p className="watch-notice" role="status">{notice}</p>}{watch.isError && <p className="inline-error" role="alert">Watch settings could not be saved.</p>}</section>
        {approvals.length > 0 && <section className="run-detail-section"><div className="run-detail-section-head"><h3>Needs your decision</h3><span>{fmt(approvals.length)} open</span></div><div className="stack">{approvals.map((approval: AnyData) => <ApprovalCard key={approval.approval_id} approval={approval} judgedBy="run_detail" onResolved={approvalChanged} />)}</div></section>}
        {applications.length > 0 && <section className="run-detail-section"><div className="run-detail-section-head"><h3>Applications</h3><span>{fmt(applications.length)} claimed</span></div><div className="run-record-list">{applications.map((app: AnyData) => <article key={app.app_id}><div className="run-record-top"><code>{app.app_id}</code><Status value={String(app.state)} /></div><p><b>Reason</b>{app.status_reason ? String(app.status_reason) : "—"}</p>{app.talking_points_path && <WorkspaceFileButton fileRef={{ app_id: String(app.app_id), kind: "prep" }} label="Open talking points" displayName={fileName(String(app.talking_points_path))} />}</article>)}</div></section>}
        {postingVerdicts.length > 0 && <section className="run-detail-section"><div className="run-detail-section-head"><h3>Posting verdicts</h3><span>{fmt(postingVerdicts.length)} latest</span></div><div className="run-record-list">{postingVerdicts.map((item: AnyData) => <article key={item.posting_id}><div className="run-record-top"><div><b>{item.role || item.posting_id}</b>{item.company && <span>{item.company}</span>}</div><Status value={String(item.verdict)} /></div><p><b>{titleCase(String(item.stage))}</b>{item.reason ? String(item.reason) : "—"}</p><small>{when(item.at)} · {item.posting_id}</small></article>)}</div></section>}
        <section ref={activityRef} className="run-detail-section"><div className="run-detail-section-head"><h3>Activity feed</h3><span>{run.status === "running" ? "Refreshes every 15 seconds" : `${fmt(events.length)} events`}</span></div>{events.length === 0 ? <Empty title="No events yet" body="The run is open, but no skill has logged an event." /> : <ol className="event-feed">{events.map((event: AnyData, index: number) => <li key={event.id}><div className={`event-node${index === 0 ? " latest" : ""}`} /><div><div className="event-top"><b>{titleCase(String(event.type))}</b><time>{when(event.at)}</time></div>{event.app_id && <code>{event.app_id}</code>}{eventDetail(event.payload) && <p>{eventDetail(event.payload)}</p>}</div></li>)}</ol>}</section>
        <section className="run-detail-section"><div className="run-detail-section-head"><h3>Browser evidence</h3><span>{fmt(screenshots.length)} captures</span></div>{screenshots.length === 0 ? <Empty title="No browser captures" body={run.capture_browser ? "Capture is requested. New evidence will appear here after the worker records it." : "Turn on Browser captures to request evidence at key portal steps."} /> : <div className="browser-captures">{screenshots.map((app: AnyData) => <article key={app.app_id}><div><b>{app.app_id}</b><span>{titleCase(String(app.state))}</span></div><ScreenshotEvidence appId={String(app.app_id)} path={String(app.screenshot_path)} />{app.confirmation && <p>{String(app.confirmation)}</p>}</article>)}</div>}</section>
      </div>}
      {cancelConfirmOpen && isActive && <div className="run-cancel-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !cancelRun.isPending) setCancelConfirmOpen(false); }}><section className="run-cancel-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cancel-run-title" aria-describedby="cancel-run-description"><h3 id="cancel-run-title">Cancel this run?</h3><p id="cancel-run-description">In-flight applications will be marked cancelled.</p>{cancelNotice?.tone === "error" && <p className="inline-error" role="alert">{cancelNotice.text}</p>}<div className="run-cancel-actions"><button type="button" disabled={cancelRun.isPending} onClick={() => setCancelConfirmOpen(false)}>Keep running</button><button type="button" className="confirm-cancel-run" disabled={cancelRun.isPending} onClick={() => cancelRun.mutate()}>{cancelRun.isPending ? "Cancelling…" : "Cancel run"}</button></div></section></div>}
    </section>
  </div>;
}

function Runs({ data, onRefresh, refreshing, onOpenApprovals }: { data: AnyData; onRefresh: () => void; refreshing: boolean; onOpenApprovals: () => void }) {
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const [dateRange, setDateRange] = useState<DateRange>({ preset: "all", start: "", end: "" });
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const visibleRows = useMemo(() => rows.filter((row: AnyData) => fallsInDateRange(row.started, dateRange)), [rows, dateRange]);
  const reported = visibleRows.filter((row: AnyData) => row.tokens_reported === true);
  const totals = reported.reduce((sum: { input: number; output: number; total: number }, row: AnyData) => ({ input: sum.input + Number(row.tokens_input ?? 0), output: sum.output + Number(row.tokens_output ?? 0), total: sum.total + Number(row.tokens_total ?? 0) }), { input: 0, output: 0, total: 0 });
  const totalsTitle = `in ${fmt(totals.input)} · out ${fmt(totals.output)} · total ${fmt(totals.total)}`;
  const hasUnreported = reported.length !== visibleRows.length;
  const daily: Map<string, { label: string; total: number }> = visibleRows.reduce((days: Map<string, { label: string; total: number }>, row: AnyData) => {
    if (row.tokens_reported !== true || !row.started) return days;
    const date = new Date(String(row.started));
    if (Number.isNaN(date.getTime())) return days;
    const key = chicagoDateKey(date);
    const label = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric" }).format(date);
    const current = days.get(key) ?? { label, total: 0 };
    current.total += Number(row.tokens_total ?? 0); days.set(key, current); return days;
  }, new Map<string, { label: string; total: number }>());
  return <><div className="page-lead"><div><p className="eyebrow">Execution ledger</p><h1>Runs and resource flow</h1><p>Status, stage-level tokens, blockers, and configuration drift.</p></div><RefreshButton onClick={onRefresh} active={refreshing} /></div>
    <div className="kpi-band"><Kpi hero label="Run history" value={data.hero} /><Kpi label="Running" value={data.running} /><Kpi label="Blocked" value={data.blocked} /><Kpi label="Needs me" value={data.needs_me} /><Kpi label="Total tokens" value={data.total_tokens} /></div>
    <Section title="Run history" aside={<span className="count-label">{fmt(visibleRows.length)}{visibleRows.length !== rows.length ? ` of ${fmt(rows.length)}` : ""} runs</span>}>
      <DateRangeControl value={dateRange} onChange={setDateRange} label="Filter runs by started date" />
      {rows.length === 0 ? <Empty title="No runs recorded" body="Opened campaign runs will appear here with close status and token usage." /> : visibleRows.length === 0 ? <Empty title="No runs in this range" body="Choose another date range to see run history." /> : <>
        <div className="runs-table" role="table" aria-label="Run history with token usage">
          <div className="runs-head" role="row"><span role="columnheader">Run</span><span role="columnheader">Campaign</span><span role="columnheader">Status</span><span role="columnheader">Token usage</span></div>
          <div className="runs-body" role="rowgroup">{visibleRows.map((r: AnyData) => {
            const stages = stageEntries(r.tokens); const stageTitle = stages.map(([stage, value]) => `${titleCase(stage)} ${fmt(value)}`).join(" · ");
            const usageTitle = r.tokens_reported === true ? `in ${fmt(r.tokens_input)} · out ${fmt(r.tokens_output)}${stageTitle ? `\n${stageTitle}` : ""}` : "Usage not reported — per-run tracking started after this run";
            return <article className="run-table-row" role="row" key={r.run_id}>
              <div className="run-identity" role="cell" data-label="Run"><code>{r.run_id}</code><time>{when(r.started)}</time></div>
              <div className="run-campaign" role="cell" data-label="Campaign"><b>{r.campaign_id}</b>{r.blocker && <span className="run-blocker">{r.blocker}</span>}</div>
              <div className="status-pair" role="cell" data-label="Status"><Status value={r.status} /><Status value={r.drift} />{r.watch_chat && <span className="watching-badge">Watching</span>}</div>
              <div className={`token-usage-cell ${r.tokens_reported === true ? "" : "unreported"}`} role="cell" data-label="Token usage" title={usageTitle}>{r.tokens_reported === true ? <><strong>{compactTokens(r.tokens_total)}</strong><span>in {compactTokens(r.tokens_input)} · out {compactTokens(r.tokens_output)}</span>{stages.length > 0 && <details><summary>Stage breakdown</summary><div>{stages.map(([stage, value]) => <span key={stage}>{titleCase(stage)} <b>{compactTokens(value)}</b></span>)}</div></details>}</> : <strong aria-label="Usage not reported">—</strong>}</div>
              <button type="button" className="run-open-button" onClick={() => setSelectedRun(String(r.run_id))}>Open live view <Icon name="chevron" size={15} /></button>
            </article>;
          })}</div>
          <div className="runs-total-row" role="row" title={totalsTitle}><strong role="cell">Total {hasUnreported && <small>(reported runs only)</small>}</strong><span role="cell">Input <b>{compactTokens(totals.input)}</b></span><span role="cell">Output <b>{compactTokens(totals.output)}</b></span><span role="cell">Total <b>{compactTokens(totals.total)}</b></span></div>
        </div>
        {daily.size > 0 && <div className="daily-token-rollup" aria-label="Token usage by day in America Chicago time">{Array.from(daily.values()).map((day, index) => <span key={`${day.label}-${index}`}>{day.label} <b>{compactTokens(day.total)}</b></span>)}</div>}
      </>}
    </Section>
    {selectedRun && <RunDetail runId={selectedRun} onClose={() => setSelectedRun(null)} onChanged={onRefresh} onOpenApprovals={onOpenApprovals} />}
  </>;
}

const CADENCE_HELP = 'Accepted formats: "daily HH:MM" (e.g. "daily 07:00"), "nightly HH:MM" (e.g. "nightly 23:20"), "hourly", "hourly weekdays", "every Nm" (e.g. "every 15m"), "every Nh" (e.g. "every 2h"), "Nh weekdays" (e.g. "2h weekdays"), "H:MMam/pm CT" (e.g. "9:00am CT"), "Weekday H:MMam/pm CT" (e.g. "Friday 5:00pm CT").';

function ScheduleEditor({ jobId, cadence, enabled, onChanged }: { jobId: string; cadence: string; enabled: boolean; onChanged: () => void }) {
  const [draft, setDraft] = useState(cadence);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  useEffect(() => { setDraft(cadence); }, [cadence]);
  const save = async (args: { cadence?: string; enabled?: boolean }) => {
    setBusy(true); setMessage(null);
    try {
      const result = await api.schedule_update({ job_id: jobId, ...args });
      if (!result.ok) { setMessage({ tone: "error", text: result.error }); return; }
      setMessage({ tone: "good", text: result.note });
      onChanged();
    } catch {
      setMessage({ tone: "error", text: "The schedule could not be updated. No change was saved." });
    } finally {
      setBusy(false);
    }
  };
  const dirty = draft.trim() !== cadence;
  return <div className="schedule-edit">
    <div className="schedule-edit-row">
      <button type="button" role="switch" aria-checked={enabled} className={`schedule-switch${enabled ? " on" : ""}`} disabled={busy} onClick={() => void save({ enabled: !enabled })}>
        <span className="schedule-knob" aria-hidden="true" /><span className="schedule-switch-label">{enabled ? "Enabled" : "Disabled"}</span>
      </button>
      <span className="schedule-edit-hint">Disabling saves the cron job disabled — it is never deleted.</span>
    </div>
    <div className="schedule-edit-row">
      <label className="schedule-cadence-field"><span>Cadence</span><input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy} spellCheck={false} autoComplete="off" placeholder={cadence} aria-label={`Cadence for ${jobId}`} /></label>
      <button type="button" className="schedule-save" disabled={busy || !dirty || !draft.trim()} onClick={() => void save({ cadence: draft.trim() })}>{busy ? "Saving…" : "Save cadence"}</button>
    </div>
    <p className="schedule-help">{CADENCE_HELP}</p>
    {message && <p className={message.tone === "good" ? "schedule-note" : "inline-error"} role="status">{message.text}</p>}
  </div>;
}

function ScheduleTrigger({ jobId }: { jobId: string }) {
  const [notice, setNotice] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  const trigger = useMutation({
    mutationFn: () => api.schedule_trigger({ job_id: jobId }),
    onSuccess: (result) => {
      if (!result.ok) { setNotice({ tone: "error", text: result.reason }); return; }
      setNotice({ tone: "good", text: "Triggered — the run will start within a couple of minutes." });
    },
    onError: () => setNotice({ tone: "error", text: "The trigger could not be queued." }),
  });
  return <div className="schedule-trigger">
    <div className="schedule-trigger-row">
      <button type="button" className="schedule-trigger-button" disabled={trigger.isPending} onClick={() => { setNotice(null); trigger.mutate(); }}>{trigger.isPending ? "Triggering…" : "Trigger now"}</button>
      <span className="schedule-trigger-hint">Fires one ad-hoc run now. Works on disabled schedules too — it does not re-enable them.</span>
    </div>
    {notice && <p className={`save-notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}
  </div>;
}

function Schedules() {
  const status = useQuery({ queryKey: ["schedules-status"], queryFn: () => api.schedules_status({}), refetchOnMount: "always", staleTime: 0 });
  const rows = status.data?.rows ?? [];
  const refresh = () => { void status.refetch(); };
  const shortHash = (value: string | null) => value ? `${value.slice(0, 12)}…` : "—";

  if (status.isPending) return <div className="loading"><span /><p>Reading schedules manifest…</p></div>;
  if (status.isError) return <div className="error-screen"><div className="health-orb"><Icon name="schedule" size={28} /></div><h1>Schedules unavailable</h1><p>The schedules manifest and run ledger could not be read.</p><button onClick={refresh}>Retry</button></div>;

  const inSync = rows.filter((row) => row.drift === "in_sync").length;
  const drift = rows.filter((row) => row.drift === "drift").length;
  const unknown = rows.filter((row) => row.drift === "unknown").length;
  return <>
    <div className="page-lead"><div><p className="eyebrow">Schedule registry</p><h1>Cadence and configuration drift</h1><p>Compiled jobs reconciled against the latest recorded campaign run.</p></div><RefreshButton onClick={refresh} active={status.isFetching} /></div>
    <div className="kpi-band"><Kpi hero label="Scheduled jobs" value={rows.length} note="Live manifest" /><Kpi label="In sync" value={inSync} /><Kpi label="Drift" value={drift} /><Kpi label="Unknown" value={unknown} /></div>
    <Section title="Schedules" aside={<span className="count-label">{fmt(rows.length)} jobs</span>}>
      {status.data.manifest_missing ? <Empty title="No schedules manifest found — run compile-schedules" body="The manifest is missing or unreadable, so no schedule status can be shown." /> : rows.length === 0 ? <Empty title="No schedules in manifest" body="Run compile-schedules after adding campaign jobs." /> : <div className="schedule-list" role="list" aria-label="Schedule drift status">{rows.map((row) => <article className="schedule-row" role="listitem" key={row.job_id}>
        <div className="schedule-primary"><div><h3>{row.title}</h3><code>{row.job_id}</code></div><Status value={row.drift} /></div>
        <div className="schedule-facts">
          <div><span>Campaign</span><b>{row.campaign}</b></div>
          <div><span>Cadence</span><b>{row.cadence}</b><small>{row.schedule}</small></div>
          <div><span>Enabled</span><Status value={row.enabled ? "enabled" : "disabled"} /></div>
          <div><span>Last run · Chicago</span><b>{chicagoWhen(row.last_run_at)}</b>{row.last_run_status && <small>{titleCase(row.last_run_status)}</small>}</div>
        </div>
        <div className="hash-pair">
          <div><span>Saved body hash</span><code title={row.manifest_body_hash}>{shortHash(row.manifest_body_hash)}</code></div>
          <div><span>Live body hash</span><code title={row.live_body_hash ?? "No live body hash recorded"}>{shortHash(row.live_body_hash)}</code></div>
        </div>
        <ScheduleEditor key={row.job_id} jobId={row.job_id} cadence={row.cadence} enabled={row.enabled} onChanged={refresh} />
        <ScheduleTrigger jobId={row.job_id} />
      </article>)}</div>}
    </Section>
    <p className="freshness">Checked {chicagoWhen(status.data.generated_at)}</p>
  </>;
}

function Replies({ data, onRefresh, refreshing }: { data: AnyData; onRefresh: () => void; refreshing: boolean }) {
  const awaiting = Array.isArray(data.awaiting_me) ? data.awaiting_me : []; const funnel = data.funnel ?? {};
  const replies = useMemo(() => {
    const rows = Array.isArray(data.replies) ? [...data.replies] : [];
    return rows.sort((a: AnyData, b: AnyData) => {
      const bTime = new Date(String(b.at ?? "")).getTime(); const aTime = new Date(String(a.at ?? "")).getTime();
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
  }, [data.replies]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [channelFilter, setChannelFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ preset: "all", start: "", end: "" });
  const [replyNotice, setReplyNotice] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  const [draftEditor, setDraftEditor] = useState<{ replyId: string; descriptor: string; filename: string; original: string; text: string; mode: "view" | "approve" } | null>(null);
  const draft = useMutation({
    mutationFn: ({ replyId }: { replyId: string; descriptor: string; mode: "view" | "approve" }) => api.held_reply_draft({ reply_id: replyId }),
    onSuccess: (result, request) => {
      const text = result.draft_text;
      const filename = String(result.draft_path ?? "Reply draft").split("/").pop() || "Reply draft";
      if (!result.ok || text === undefined) { setReplyNotice({ tone: "error", text: result.message ?? "The draft could not be opened." }); return; }
      setReplyNotice(null); setDraftEditor({ replyId: request.replyId, descriptor: request.descriptor, filename, original: text, text, mode: request.mode });
    },
    onError: () => setReplyNotice({ tone: "error", text: "The draft could not be opened." }),
  });
  const resolveReply = useMutation({
    mutationFn: ({ replyId, decision, editedText }: { replyId: string; decision: "approved" | "discarded"; editedText?: string }) => api.held_reply_resolve({ reply_id: replyId, decision, ...(editedText !== undefined ? { edited_text: editedText } : {}) }),
    onSuccess: (result, request) => {
      if (!result.ok) { setReplyNotice({ tone: "error", text: result.message ?? "The held reply could not be resolved." }); return; }
      setReplyNotice({ tone: "good", text: request.decision === "approved" ? "Reply approved. The scheduled replier will send it." : "Reply discarded." });
      setDraftEditor(null); onRefresh();
    },
    onError: () => setReplyNotice({ tone: "error", text: "The held reply could not be resolved. Nothing changed." }),
  });
  const replyChannel = (reply: AnyData) => {
    const threadId = String(reply.threadId ?? reply.thread_id ?? "");
    const prefix = (threadId.split("|")[0] ?? "").trim().toLowerCase();
    return prefix === "linkedin" ? "linkedin" : prefix === "email" ? "email" : "other";
  };
  const visibleReplies = useMemo(() => {
    const query = search.trim().toLowerCase();
    return replies.filter((reply: AnyData) => {
      const channel = replyChannel(reply); const action = String(reply.action ?? "skipped");
      const haystack = [reply.threadId, reply.thread_id, reply.reason, reply.ruleId, reply.rule_id, channel, action].map((value) => String(value ?? "").toLowerCase()).join(" ");
      return fallsInDateRange(reply.at, dateRange) && (channelFilter === "all" || channel === channelFilter) && (actionFilter === "all" || action === actionFilter) && (!query || haystack.includes(query));
    });
  }, [replies, dateRange, channelFilter, actionFilter, search]);
  const toggleReason = (replyId: string) => setExpanded((previous) => {
    const next = new Set(previous); if (next.has(replyId)) next.delete(replyId); else next.add(replyId); return next;
  });
  return <><div className="page-lead"><div><p className="eyebrow">Conversation ledger</p><h1>Replies and outcomes</h1><p>Email and LinkedIn activity in one chronological record.</p></div><RefreshButton onClick={onRefresh} active={refreshing} /></div>
    {replyNotice && <div className={`save-notice ${replyNotice.tone}`} role={replyNotice.tone === "error" ? "alert" : "status"}>{replyNotice.text}</div>}
    <div className="kpi-band"><Kpi hero label="Threads" value={data.hero} /><Kpi label="Sent · 7 days" value={data.sent_7d} /><Kpi label="Held · 7 days" value={data.held_7d} /><Kpi label="Awaiting me" value={awaiting.length} /></div>
    <div className="reply-grid"><Section title="Outcome funnel"><div className="funnel"><div><strong>{fmt(funnel.applied)}</strong><span>Applied</span></div><i /><div><strong>{fmt(funnel.replied)}</strong><span>Reply</span></div><i /><div><strong>{fmt(funnel.interview)}</strong><span>Interview</span></div></div></Section><Section title="Awaiting me" aside={<span className="count-label">{fmt(awaiting.length)}</span>}>{awaiting.length === 0 ? <Empty title="Nothing waiting" body="Held or needs-me threads will collect here." /> : <div className="mini-list">{awaiting.map((t: AnyData) => <div key={t.threadId ?? t.thread_id}><span>{t.channel}</span><b>{t.classification ?? "Unclassified"}</b></div>)}</div>}</Section></div>
    <Section title="Activity ledger" aside={<span className="count-label">{fmt(visibleReplies.length)}{visibleReplies.length !== replies.length ? ` of ${fmt(replies.length)}` : ""} events</span>} className="reply-ledger-section">
      <div className="reply-filter-bar">
        <div className="reply-filter-fields">
          <label><span>Channel</span><select aria-label="Filter replies by channel" value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)}><option value="all">All channels</option><option value="email">Email</option><option value="linkedin">LinkedIn</option><option value="other">Other sources</option></select></label>
          <label><span>Action</span><select aria-label="Filter replies by action" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}><option value="all">All actions</option><option value="sent">Sent</option><option value="held">Held</option><option value="skipped">Skipped</option><option value="auto_sent">Auto-sent</option></select></label>
          <label className="reply-search"><span>Search</span><input type="search" aria-label="Search reply activity" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Person, topic, rule, or reason" /></label>
        </div>
        <DateRangeControl value={dateRange} onChange={setDateRange} label="Filter replies by date" />
      </div>
      {replies.length === 0 ? <Empty title="No reply activity yet" body="Sent, held, skipped, and auto-sent activity will appear here in time order." /> : visibleReplies.length === 0 ? <Empty title="No matching activity" body="Change or clear a filter to see more events." /> : <div className="reply-table-wrap"><table className="reply-table">
        <thead><tr><th>Date</th><th>Channel</th><th>Person / topic</th><th>Action</th><th>Rule</th><th>Reason / source</th><th>Decision</th></tr></thead>
        <tbody>{visibleReplies.map((reply: AnyData, index: number) => {
          const replyId = String(reply.replyId ?? reply.reply_id ?? `reply-${index}`); const threadId = String(reply.threadId ?? reply.thread_id ?? "");
          const prefix = (threadId.split("|")[0] ?? "").trim().toLowerCase(); const channel = prefix === "linkedin" ? "LinkedIn" : prefix === "email" ? "Email" : titleCase(prefix || "unknown");
          const reason = String(reply.reason ?? "No reason recorded"); const descriptor = ((reason.split(" — ")[0] ?? reason).split(";")[0] ?? reason).trim() || "No descriptor";
          const action = String(reply.action ?? "skipped"); const isExpanded = expanded.has(replyId); const rule = String(reply.ruleId ?? reply.rule_id ?? "—");
          const decision = reply.heldResolution ?? reply.decision ? String(reply.heldResolution ?? reply.decision) : null; const resolvedAt = reply.heldResolvedAt ?? reply.held_resolved_at ?? reply.resolvedAt ?? reply.resolved_at;
          const pendingHeld = action === "held" && !decision;
          return <tr key={replyId}>
            <td data-label="Date" className="reply-date"><time dateTime={String(reply.at ?? "")}>{chicagoWhen(reply.at)}</time></td>
            <td data-label="Channel"><span className={`channel-pill channel-${prefix === "linkedin" ? "linkedin" : prefix === "email" ? "email" : "other"}`}>{channel}</span></td>
            <td data-label="Person / topic"><span className="reply-topic" title={descriptor}>{descriptor}</span></td>
            <td data-label="Action"><span className={`reply-action action-${action}`}>{action === "auto_sent" ? "Auto-sent" : titleCase(action)}</span></td>
            <td data-label="Rule"><span className="rule-pill">{rule}</span></td>
            <td data-label="Reason / source"><button type="button" className={`reason-toggle ${isExpanded ? "expanded" : ""}`} onClick={() => toggleReason(replyId)} aria-expanded={isExpanded} aria-label={`${isExpanded ? "Collapse" : "Expand"} reason for ${descriptor}`}><span>{reason}</span><small>{isExpanded ? "Show less" : "Show all"}</small></button></td>
            <td data-label="Decision">
              {decision ? <div className="reply-decision"><Status value={decision} />{resolvedAt && <small>{chicagoWhen(resolvedAt)}</small>}</div> : pendingHeld ? <div className="held-reply-actions">
                <button type="button" onClick={() => draft.mutate({ replyId, descriptor, mode: "view" })} disabled={draft.isPending || resolveReply.isPending}>View draft</button>
                <button type="button" className="approve-reply" onClick={() => draft.mutate({ replyId, descriptor, mode: "approve" })} disabled={draft.isPending || resolveReply.isPending}>Approve &amp; send</button>
                <button type="button" className="discard-reply" onClick={() => resolveReply.mutate({ replyId, decision: "discarded" })} disabled={draft.isPending || resolveReply.isPending}>Discard</button>
              </div> : <span className="muted">—</span>}
            </td>
          </tr>;
        })}</tbody>
      </table></div>}
    </Section>
    {draftEditor && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !resolveReply.isPending) setDraftEditor(null); }}>
      <form className="confirm-dialog reply-draft-dialog" role="dialog" aria-modal="true" aria-labelledby="reply-draft-title" onSubmit={(event) => {
        event.preventDefault();
        if (draftEditor.mode !== "approve") return;
        const changed = draftEditor.text !== draftEditor.original ? draftEditor.text.trim() : undefined;
        if (changed === "") { setReplyNotice({ tone: "error", text: "An approved reply cannot be empty." }); return; }
        resolveReply.mutate({ replyId: draftEditor.replyId, decision: "approved", editedText: changed });
      }}>
        <div className="reply-draft-heading"><div><span>{draftEditor.mode === "approve" ? "Review before approval" : "Held draft"}</span><h2 id="reply-draft-title">{draftEditor.descriptor}</h2></div><code>{draftEditor.filename}</code></div>
        <label><span>Draft text</span><textarea aria-label="Held reply draft text" value={draftEditor.text} readOnly={draftEditor.mode === "view"} onChange={(event) => setDraftEditor({ ...draftEditor, text: event.target.value })} /></label>
        <p>Approval records your decision here. The scheduled replier handles sending.</p>
        {replyNotice?.tone === "error" && <p className="inline-error" role="alert">{replyNotice.text}</p>}
        <div><button type="button" onClick={() => setDraftEditor(null)} disabled={resolveReply.isPending}>{draftEditor.mode === "view" ? "Close" : "Cancel"}</button>{draftEditor.mode === "approve" && <button type="submit" className="primary-button" disabled={resolveReply.isPending}>{resolveReply.isPending ? "Approving…" : "Approve & send"}</button>}</div>
      </form>
    </div>}
  </>;
}

type DatasetName = "companies" | "h1b_sponsors" | "prime_vendors";

const datasetLabels: Record<DatasetName, string> = {
  companies: "Companies",
  h1b_sponsors: "H-1B sponsors",
  prime_vendors: "Vendors",
};

function statsSummary(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "—";
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length ? entries.map(([year, raw]) => {
    const detail = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
    const count = detail ? detail.lcas ?? detail.lca_count ?? detail.count ?? detail.total : raw;
    return `${year}: ${fmt(count)} LCAs`;
  }).join(" · ") : "—";
}

type DatasetUiState = { searchDraft: string; search: string; tier: string; minLca: string; page: number };

const initialDatasetStates: Record<DatasetName, DatasetUiState> = {
  companies: { searchDraft: "", search: "", tier: "", minLca: "", page: 1 },
  h1b_sponsors: { searchDraft: "", search: "", tier: "", minLca: "", page: 1 },
  prime_vendors: { searchDraft: "", search: "", tier: "", minLca: "", page: 1 },
};

function Datasets() {
  const [dataset, setDataset] = useState<DatasetName>("companies");
  const [datasetStates, setDatasetStates] = useState<Record<DatasetName, DatasetUiState>>(initialDatasetStates);
  const view = datasetStates[dataset];
  const pageSize = 100;
  const queryClient = useQueryClient();
  const updateView = (patch: Partial<DatasetUiState>) => setDatasetStates((current) => ({ ...current, [dataset]: { ...current[dataset], ...patch } }));

  useEffect(() => {
    if (view.searchDraft.trim() === view.search) return;
    const timer = window.setTimeout(() => updateView({ search: view.searchDraft.trim(), page: 1 }), 350);
    return () => window.clearTimeout(timer);
  }, [dataset, view.searchDraft, view.search]);

  const result = useQuery({
    queryKey: ["dataset-browse", dataset, view.search, view.tier, view.minLca, view.page, pageSize],
    queryFn: () => api.dataset_browse({
      dataset,
      page: view.page,
      page_size: pageSize,
      ...(view.search ? { search: view.search } : {}),
      ...(dataset !== "h1b_sponsors" && view.tier ? { tier: view.tier } : {}),
      ...(dataset === "h1b_sponsors" && view.minLca ? { min_lca: Number(view.minLca) } : {}),
    }),
    staleTime: 60_000,
    placeholderData: (previous) => previous?.dataset === dataset ? previous : undefined,
  });
  const rows = (result.data?.rows ?? []) as AnyData[];
  const total = Number(result.data?.total ?? 0);
  const currentPage = Number(result.data?.page ?? view.page ?? 1);
  const currentPageSize = Number(result.data?.page_size ?? pageSize ?? 100);
  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
  const start = total === 0 ? 0 : (currentPage - 1) * currentPageSize + 1;
  const end = Math.min(currentPage * currentPageSize, total);

  const clearFilters = () => updateView({ searchDraft: "", search: "", tier: "", minLca: "", page: 1 });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["dataset-browse", dataset] }); void result.refetch(); };
  const datasetEmpty = !view.search && !view.tier && !view.minLca && total === 0;

  return <>
    <div className="dataset-switcher" role="group" aria-label="Choose dataset">
      {(Object.keys(datasetLabels) as DatasetName[]).map((name) => <button type="button" key={name} className={dataset === name ? "active" : ""} aria-pressed={dataset === name} onClick={() => setDataset(name)}>{datasetLabels[name]}</button>)}
    </div>
    <div className="page-lead"><div><p className="eyebrow">Reference datasets</p><h1>{datasetLabels[dataset]}</h1><p>{dataset === "companies" ? "Browse the company targeting catalog and career-source metadata." : dataset === "h1b_sponsors" ? "Inspect imported sponsorship counts and year-level evidence." : "Browse prime vendor portals, specialties, and engagement models."}</p></div><RefreshButton onClick={refresh} active={result.isFetching} /></div>
    <div className="kpi-band dataset-kpis"><Kpi hero label="Matching rows" value={total} note={datasetLabels[dataset]} /><Kpi label="Showing" value={total === 0 ? "0" : `${fmt(start)}–${fmt(end)} of ${fmt(total)}`} /><Kpi label="Page" value={`${currentPage} of ${totalPages}`} /><Kpi label="Rows per page" value={currentPageSize} /></div>
    <Section title={`${datasetLabels[dataset]} directory`} aside={<span className="count-label">{fmt(total)} rows</span>}>
      <div className="dataset-filters">
        <label className="dataset-search"><span>Search</span><input type="search" aria-label={`Search ${datasetLabels[dataset]}`} value={view.searchDraft} onChange={(event) => updateView({ searchDraft: event.target.value })} placeholder={dataset === "companies" ? "Company or industry" : dataset === "h1b_sponsors" ? "Employer name" : "Vendor, category, or specialty"} /></label>
        {dataset === "h1b_sponsors" ? <label><span>Minimum LCAs</span><input type="number" min="0" step="1" aria-label="Minimum LCA count" value={view.minLca} onChange={(event) => updateView({ minLca: event.target.value, page: 1 })} placeholder="Any" /></label> : <label><span>Tier</span><select aria-label={`Filter ${datasetLabels[dataset]} by tier`} value={view.tier} onChange={(event) => updateView({ tier: event.target.value, page: 1 })}><option value="">All tiers</option><option value="1">Tier 1</option><option value="2">Tier 2</option><option value="3">Tier 3</option></select></label>}
        <div className="dataset-filter-actions"><span>{view.searchDraft.trim() !== view.search ? "Searching…" : "Filters update this dataset"}</span><button type="button" onClick={clearFilters}>Clear</button></div>
      </div>
      {result.isPending ? <div className="loading dataset-loading"><span /><p>Reading {datasetLabels[dataset]}…</p></div> : result.isError ? <div className="dataset-error" role="alert"><p>This dataset could not be read.</p><button type="button" onClick={() => result.refetch()}>Retry</button></div> : rows.length === 0 ? <Empty title={datasetEmpty ? `No ${datasetLabels[dataset].toLowerCase()} yet` : "No rows match"} body={datasetEmpty ? "Import this dataset to populate the directory." : "Change or clear a filter to see more rows."} /> : <div className="dataset-list" role="list" aria-label={`${datasetLabels[dataset]} rows`}>
        {dataset === "companies" && rows.map((row: AnyData) => <article className="dataset-row" role="listitem" key={row.company_norm}>
          <div className="dataset-heading"><div><h3>{row.company_norm}</h3><p>{[row.industry, `Tier ${row.tier}`].filter(Boolean).join(" · ")}</p></div>{row.careers_url && <a className="vendor-portal" href={row.careers_url} target="_blank" rel="noreferrer">Careers <Icon name="external" size={14} /></a>}</div>
          <div className="dataset-details"><div><span>Headquarters</span><p>{row.hq_state || "—"}</p></div><div><span>ATS</span><p>{row.ats_type || "—"}</p></div><div><span>Park count</span><p>{fmt(row.park_count)}</p></div><div><span>Skip status</span><p>{row.skip_flag ? row.skip_reason || "Skipped" : "Active"}</p></div></div>
        </article>)}
        {dataset === "h1b_sponsors" && rows.map((row: AnyData) => <article className="dataset-row" role="listitem" key={row.company_norm}>
          <div className="dataset-heading"><div><h3>{row.company_norm}</h3><p>{fmt(row.lca_count)} LCAs</p></div></div>
          <div className="dataset-details h1b-dataset-details"><div><span>Year history</span><p>{statsSummary(row.stats_by_year)}</p></div><div><span>Last refreshed</span><p>{when(row.last_refreshed)}</p></div></div>
        </article>)}
        {dataset === "prime_vendors" && rows.map((vendor: AnyData) => <article className="dataset-row" role="listitem" key={vendor.vendor_norm}>
          <div className="dataset-heading"><div><h3>{vendor.vendor_name}</h3><p>{[vendor.category, vendor.tier ? `Tier ${String(vendor.tier).replace(/^tier\s*/i, "")}` : null].filter(Boolean).join(" · ") || "Uncategorized"}</p></div>{vendor.portal_url && <a className="vendor-portal" href={vendor.portal_url} target="_blank" rel="noreferrer">Open portal <Icon name="external" size={14} /></a>}</div>
          <div className="dataset-details"><div><span>Specialties</span><p>{vendor.specialties || "—"}</p></div><div><span>Engagement types</span><p>{vendor.engagement_types || "—"}</p></div><div className="vendor-h1b"><span>Unverified sponsorship note</span><p>{vendor.h1b_note_unverified || "No note supplied"}</p></div><div><span>Last refreshed</span><p>{when(vendor.last_refreshed)}</p></div></div>
        </article>)}
      </div>}
      {!result.isPending && !result.isError && <nav className="pagination" aria-label={`${datasetLabels[dataset]} pages`}><button type="button" onClick={() => updateView({ page: 1 })} disabled={currentPage <= 1}>First</button><button type="button" onClick={() => updateView({ page: Math.max(1, currentPage - 1) })} disabled={currentPage <= 1}>Previous</button><span>Page <b>{currentPage}</b> of <b>{totalPages}</b></span><button type="button" onClick={() => updateView({ page: Math.min(totalPages, currentPage + 1) })} disabled={currentPage >= totalPages}>Next</button><button type="button" onClick={() => updateView({ page: totalPages })} disabled={currentPage >= totalPages}>Last</button></nav>}
    </Section>
  </>;
}

const objectValue = (value: unknown): AnyData => value && typeof value === "object" && !Array.isArray(value) ? value as AnyData : {};
const stringList = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : [];
const csvList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const EMPLOYMENT_TYPES = ["full_time", "part_time", "w2_contract", "c2c_contract", "internship"] as const;

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return <label className={`profile-field ${error ? "field-error" : ""}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}{error && <small className="input-error">{error}</small>}</label>;
}

function EditableStringList({ label, values, hint, error, onChange }: { label: string; values: string[]; hint: string; error?: string; onChange: (values: string[]) => void }) {
  const updateAt = (index: number, value: string) => onChange(values.map((item, itemIndex) => itemIndex === index ? value : item));
  const removeAt = (index: number) => onChange(values.filter((_, itemIndex) => itemIndex !== index));
  return <div className={`profile-field editable-list-field ${error ? "field-error" : ""}`}>
    <div className="editable-list-heading"><span>{label}</span><button type="button" onClick={() => onChange([...values, ""])}>Add title</button></div>
    <div className="editable-list" aria-label={label}>
      {values.length === 0 ? <p>No job titles added.</p> : values.map((value, index) => <div className="editable-list-row" key={index}>
        <input aria-label={`Job title ${index + 1}`} value={value} onChange={(event) => updateAt(index, event.target.value)} placeholder="e.g. Senior Data Engineer" />
        <button type="button" aria-label={`Remove job title ${value || index + 1}`} onClick={() => removeAt(index)}>Remove</button>
      </div>)}
    </div>
    <small>{hint}</small>
    {error && <small className="input-error">{error}</small>}
  </div>;
}

const PROFILE_SAMPLES: Record<string, unknown> = {
  identity: {
    name: "Jordan Lee", email: "jordan.lee@example.com", phone: "+1 512 555 0142", location: "Austin, TX",
    linkedin: "https://www.linkedin.com/in/jordan-lee-data", timezone: "America/Chicago",
    _allowed_values: { location: "City, ST", timezone: "IANA timezone, e.g. America/Chicago" },
  },
  work_auth: {
    status: "H-1B", sponsor_required: true, h1b_gate: "soft",
    _allowed_values: { status: ["H-1B", "H1B", "US citizen", "Green card", "OPT", "STEM OPT", "TN", "EAD"], sponsor_required: [true, false], h1b_gate: ["soft", "hard"] },
  },
  caps: {
    per_run: 10, per_day: 50, appliers: 2, linkedin_actions_per_hour: 12,
    _allowed_values: { per_run: "integer >= 1", per_day: "integer >= 1", appliers: "integer >= 1", linkedin_actions_per_hour: "integer >= 1" },
  },
  targeting: {
    industries: ["fintech", "healthcare", "enterprise software"], seniority: ["senior", "staff", "architect", "principal", "lead"], tiers: [1, 2, 3], titles: ["Senior Data Engineer", "Staff Data Engineer"],
    _allowed_values: { seniority: ["junior", "mid", "senior", "staff", "architect", "principal", "lead", "director"], tiers: [1, 2, 3], industries: "one or more industry labels", titles: "free-form strings; at least one is required; scouts build search queries from titles × seniority × industries" },
  },
  locations: {
    priority: ["Austin, TX", "Remote US", "US-wide onsite"], relocation: "Yes — anywhere in the US",
    _allowed_values: { priority: ["City, ST", "Remote US", "US-wide onsite"], relocation: ["Yes", "No", "Conditional — describe conditions"] },
  },
  compensation: {
    floor: 175000, note: "Negotiable based on level and total compensation", zero_ok: true, start_date: "2026-10-15",
    _allowed_values: { floor: "non-negative number, text, or null", note: "required text", zero_ok: [true, false], start_date: "YYYY-MM-DD" },
  },
  resumes: {
    _about: "Read-only in the dashboard: the resume-file config lives in profile.yaml and the server carries it verbatim on save. The resume library (Resumes tab) registers variants from this directory.",
    dir: "workspace/user/files", filename_rule: "Firstname_Lastname_Data_AI_Resume.pdf",
    _allowed_values: { dir: "workspace-relative path", filename_rule: "exact filename every tailored PDF must use" },
    _downstream_effect: "resume-picker and portal-navigator resolve every upload against this directory and filename rule.",
  },
  answers: {
    relocate: "Yes", covenants: "Yes", drivers_license: "Yes", degree_dates: "Decline", home_zip: "78701", work_authorized_us: "Yes — H-1B transfer required", travel: "Up to 25%",
    _allowed_values: { yes_no_fields: ["Yes", "No"], degree_dates: ["Yes", "No", "Decline"], custom_answers: "string, number, boolean, or null" },
  },
  reply_tiers: {
    auto_send: ["R1", "R2"], draft_for_review: ["R3", "R4", "R5"], never: ["R6", "R7", "R8"],
    _allowed_values: { rule_codes: ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"] },
  },
  role_types: {
    _about: "Employment types only. Job titles live under Targeting.",
    role_types: ["full_time", "w2_contract", "c2c_contract"],
    _allowed_values: ["full_time", "part_time", "w2_contract", "c2c_contract", "internship"],
    _downstream_effect: "The eligibility judge rejects any posting whose employment type is not selected.",
  },
  years_matrix: {
    _about: "The skills matrix (years of hands-on experience per skill). Used by fit-judge and resume-tailor; surfaced from the onboarding Excel import.",
    years_matrix: [
      { skill: "Python", category: "Languages", years: 9, where_used: "Data platforms at fintech" },
      { skill: "Apache Spark", category: "Data engineering", years: 7, where_used: "Batch pipelines, Delta Lake" },
      { skill: "LLM systems", category: "AI", years: 3, where_used: "RAG assistants, evals" },
    ],
    _allowed_values: { skill: "required text", category: "optional text", years: "integer >= 0", where_used: "optional text" },
  },
  schedules: {
    job_id: "harness-morning-run", title: "Morning application run", campaign: "morning_run", cadence: "daily 07:00", enabled: true,
    _about: "Jobs are edited from the Schedules tab, not here: each row has an enable/disable toggle and an editable cadence. Edits write to profile.yaml campaigns.<campaign>; profile_watch recompiles within ~15 min.",
    _allowed_values: { enabled: [true, false], campaign: "compiled campaign ID", cadence: 'one of: "daily HH:MM", "nightly HH:MM", "hourly", "hourly weekdays", "every Nm", "every Nh", "Nh weekdays", "H:MMam/pm CT", "Weekday H:MMam/pm CT"' },
    _downstream_effect: "enabled: false saves the cron job DISABLED — the job is never deleted. Re-enabling is a recompile. The Schedules tab shows the accepted cadence formats as help text.",
  },
};

function ProfileSection({ title, description, sample, children, className = "", action }: { title: string; description: string; sample: unknown; children: ReactNode; className?: string; action?: ReactNode }) {
  const [showSample, setShowSample] = useState(false);
  return <Section title={title} className={`profile-section ${className}`} aside={<div className="profile-section-actions">{action}<button type="button" className="sample-toggle" onClick={() => setShowSample((open) => !open)} aria-expanded={showSample} aria-label={`${showSample ? "Hide" : "Show"} sample JSON for ${title}`}><Icon name={showSample ? "eye-off" : "eye"} size={16} /><span>{showSample ? "Hide sample" : "Sample JSON"}</span></button></div>}>
    <p className="profile-section-description">{description}</p>
    {children}
    {showSample && <div className="sample-json" aria-label={`Sample JSON for ${title}`}><div><span className="sample-badge">SAMPLE</span><b>Example only — not your profile</b></div><pre>{JSON.stringify(sample, null, 2)}</pre></div>}
  </Section>;
}

function ProfileSchedules({ onOpenSchedules }: { onOpenSchedules: () => void }) {
  const status = useQuery({ queryKey: ["schedules-status"], queryFn: () => api.schedules_status({}), refetchOnMount: "always", staleTime: 0 });
  const rows = status.data?.rows ?? [];
  return <ProfileSection title="Schedules" description="Compiled jobs that use this profile, with their current cadence and enabled state." sample={PROFILE_SAMPLES.schedules} className="profile-wide profile-schedules" action={<button type="button" className="schedule-link" onClick={onOpenSchedules}>Open drift details <Icon name="chevron" size={15} /></button>}>
    <div className="profile-schedule-intro"><div><span className="section-index">12</span><p>Profile changes are validated and reconciled by the profile watcher.</p></div><button type="button" className="inline-refresh" onClick={() => void status.refetch()} disabled={status.isFetching}><Icon name="refresh" size={15} />{status.isFetching ? "Refreshing" : "Refresh"}</button></div>
    {status.isPending ? <div className="compact-loading">Reading schedules…</div> : status.isError ? <div className="compact-error"><b>Schedules unavailable</b><span>Retry here or open the full Schedules tab.</span></div> : status.data.manifest_missing ? <Empty title="No schedules manifest" body="Run compile-schedules to populate the registry." /> : rows.length === 0 ? <Empty title="No scheduled jobs" body="Compiled jobs will appear here." /> : <div className="profile-schedule-list" role="list" aria-label="Profile schedules">{rows.map((row) => <article key={row.job_id} role="listitem"><div><b>{row.title}</b><code>{row.job_id}</code></div><div className="profile-schedule-meta"><span>{row.campaign}</span><span>{row.cadence}</span></div><Status value={row.enabled ? "enabled" : "disabled"} /></article>)}</div>}
  </ProfileSection>;
}

function normalizeMatrixEntry(raw: AnyData): { skill: string; category: string; years: number; where_used: string } {
  const entry = objectValue(raw);
  const years = Number(entry.years);
  return { skill: String(entry.skill ?? ""), category: String(entry.category ?? ""), years: Number.isFinite(years) && years >= 0 ? Math.floor(years) : 0, where_used: String(entry.where_used ?? "") };
}
const normalizeMatrix = (raw: unknown): Array<{ skill: string; category: string; years: number; where_used: string }> => Array.isArray(raw) ? raw.map(normalizeMatrixEntry) : [];

function normalizeProfile(raw: AnyData): AnyData {
  const identity = objectValue(raw.identity); const answers = objectValue(raw.answers); const locations = objectValue(raw.locations);
  const metros = stringList(locations.metros); const remote = String(locations.remote ?? "");
  const priority = stringList(locations.priority);
  if (priority.length === 0) { priority.push(...metros); if (remote === "ok" || remote === "only") priority.push("Remote US"); }
  // The draft may carry the legacy `restrictive_covenants` key alongside
  // `covenants` (loaded from an older YAML); `covenants` already falls back
  // to it below, so drop the legacy key — otherwise the server renders two
  // `restrictive_covenants:` lines in profile.yaml.
  const restAnswers = { ...answers }; delete restAnswers.restrictive_covenants;
  return {
    ...raw,
    identity: { ...identity, name: String(identity.name ?? ""), email: String(identity.email ?? ""), phone: String(identity.phone ?? ""), location: String(identity.location ?? [identity.city, identity.state].filter(Boolean).join(", ")), linkedin: String(identity.linkedin ?? identity.linkedin_url ?? ""), timezone: String(identity.timezone ?? "") },
    work_auth: { ...objectValue(raw.work_auth), status: String(objectValue(raw.work_auth).status ?? ""), sponsor_required: typeof objectValue(raw.work_auth).sponsor_required === "boolean" ? objectValue(raw.work_auth).sponsor_required : null, h1b_gate: String(objectValue(raw.work_auth).h1b_gate ?? "") },
    role_types: stringList(raw.role_types),
    locations: { ...locations, priority, relocation: String(locations.relocation ?? answers.relocate ?? "") },
    targeting: { ...objectValue(raw.targeting), industries: stringList(objectValue(raw.targeting).industries), seniority: stringList(objectValue(raw.targeting).seniority), tiers: Array.isArray(objectValue(raw.targeting).tiers) ? objectValue(raw.targeting).tiers.map(Number) : [], titles: stringList(objectValue(raw.targeting).titles) },
    comp: { ...objectValue(raw.comp), floor: objectValue(raw.comp).floor ?? null, note: String(objectValue(raw.comp).note ?? objectValue(raw.comp).negotiable_answer ?? ""), zero_ok: typeof objectValue(raw.comp).zero_ok === "boolean" ? objectValue(raw.comp).zero_ok : true },
    start_date: String(raw.start_date ?? ""),
    answers: { ...restAnswers, relocate: String(answers.relocate ?? ""), covenants: String(answers.covenants ?? answers.restrictive_covenants ?? ""), drivers_license: String(answers.drivers_license ?? ""), degree_dates: String(answers.degree_dates ?? ""), home_zip: String(answers.home_zip ?? ""), work_authorized_us: String(answers.work_authorized_us ?? "") },
    caps: { ...objectValue(raw.caps), per_run: Number(objectValue(raw.caps).per_run ?? 0), per_day: Number(objectValue(raw.caps).per_day ?? 0), appliers: Number(objectValue(raw.caps).appliers ?? 0), linkedin_actions_per_hour: Number(objectValue(raw.caps).linkedin_actions_per_hour ?? 20) },
    reply_tiers: { ...objectValue(raw.reply_tiers), auto_send: stringList(objectValue(raw.reply_tiers).auto_send), draft_for_review: stringList(objectValue(raw.reply_tiers).draft_for_review), never: stringList(objectValue(raw.reply_tiers).never) },
    years_matrix: normalizeMatrix(raw.years_matrix),
  };
}

const baseAnswers = new Set(["relocate", "covenants", "restrictive_covenants", "drivers_license", "degree_dates", "home_zip", "work_authorized_us"]);

// Mirrors the server's deriveYamlLocations so the Location preferences section
// can show exactly what the priority list + relocation will save as in YAML.
function previewYamlLocations(priority: string[], relocation: string): string {
  const values = priority.map((entry) => entry.trim()).filter(Boolean);
  if (values.length === 0) return "Nothing to save yet — add at least one priority.";
  const isRemote = (entry: string) => /(^|[\s_-])remote([\s_-]|$)/i.test(entry);
  const isGeneric = (entry: string) => /^(u\.?s\.?|united states|us[- ]wide(?: onsite)?|nationwide|anywhere in (?:the )?us)$/i.test(entry);
  const isMetro = (entry: string) => !isRemote(entry) && !isGeneric(entry) && /^[A-Za-z .'-]+(?:,\s*[A-Z]{2})?$/.test(entry);
  const remote = values.filter(isRemote); const generic = values.filter(isGeneric); const metro = values.filter(isMetro);
  if (remote.length + generic.length + metro.length !== values.length) return "One or more entries can't be mapped — the previous YAML block will be kept.";
  const onlyRemote = remote.length > 0 && remote.length === values.length;
  const remoteValue = onlyRemote ? "only" : remote.length > 0 ? "ok" : "no";
  const outsideUs = /international|outside (?:the )?us|worldwide|global/i.test(relocation);
  const metros = metro.map((entry) => entry.replace(/,\s*[A-Z]{2}$/, ""));
  return `Saves as → us_only: ${outsideUs ? "false" : "true"} · remote: ${remoteValue} · metros: [${metros.join(", ") || "—"}]`;
}

function validateProfile(profile: AnyData): Record<string, string> {
  const errors: Record<string, string> = {};
  const placeholder = (value: unknown) => /\[FILL IN\]/i.test(String(value ?? "").trim()) || /^\[.*\]$/.test(String(value ?? "").trim());
  const required = (path: string, value: unknown) => {
    if (!String(value ?? "").trim()) errors[path] = "Required";
    else if (placeholder(value)) errors[path] = "Replace the placeholder with the real value.";
  };
  const requiredList = (path: string, value: unknown, emptyMessage: string) => {
    const values = stringList(value);
    if (values.length === 0 || values.some((item) => !item.trim())) errors[path] = emptyMessage;
    else if (values.some(placeholder)) errors[path] = "Replace placeholders with real values.";
  };
  const identity = objectValue(profile.identity); ["name", "email", "phone", "location", "linkedin", "timezone"].forEach((key) => required(`identity.${key}`, identity[key]));
  if (!errors["identity.email"] && identity.email && !/^\S+@\S+\.\S+$/.test(String(identity.email))) errors["identity.email"] = "Enter a valid email address";
  if (!errors["identity.location"] && identity.location && !/^.+,\s*[A-Za-z]{2}$/.test(String(identity.location))) errors["identity.location"] = "Use City, ST so it can sync to YAML";
  try { const url = new URL(String(identity.linkedin)); if (!/^https?:$/.test(url.protocol)) throw new Error(); } catch { if (!errors["identity.linkedin"] && identity.linkedin) errors["identity.linkedin"] = "Enter a full http(s) URL"; }
  const work = objectValue(profile.work_auth); if (!["H-1B", "H1B", "US citizen", "Green card", "OPT", "STEM OPT", "TN", "EAD"].includes(String(work.status))) errors["work_auth.status"] = placeholder(work.status) ? "Replace the placeholder with the real value." : "Choose a supported status"; if (typeof work.sponsor_required !== "boolean") errors["work_auth.sponsor_required"] = "Choose yes or no"; if (!["hard", "soft"].includes(String(work.h1b_gate))) errors["work_auth.h1b_gate"] = placeholder(work.h1b_gate) ? "Replace the placeholder with the real value." : "Choose hard or soft";
  const locations = objectValue(profile.locations); requiredList("locations.priority", locations.priority, "Add at least one priority"); required("locations.relocation", locations.relocation);
  const targeting = objectValue(profile.targeting); requiredList("targeting.industries", targeting.industries, "Add at least one industry"); if (stringList(targeting.seniority).length === 0) errors["targeting.seniority"] = "Add at least one level"; if (!Array.isArray(targeting.tiers) || targeting.tiers.length === 0 || targeting.tiers.some((tier: unknown) => ![1, 2, 3].includes(Number(tier)))) errors["targeting.tiers"] = "Use tiers 1, 2, or 3"; requiredList("targeting.titles", targeting.titles, "Add at least one job title");
  const caps = objectValue(profile.caps); ["per_run", "per_day", "appliers"].forEach((key) => { if (!Number.isInteger(Number(caps[key])) || Number(caps[key]) < 1) errors[`caps.${key}`] = "Enter an integer of 1 or more"; }); if (!Number.isInteger(Number(caps.linkedin_actions_per_hour)) || Number(caps.linkedin_actions_per_hour) < 1) errors["caps.linkedin_actions_per_hour"] = "Enter an integer of 1 or more";
  const answers = objectValue(profile.answers); ["relocate", "covenants", "drivers_license", "degree_dates", "home_zip", "work_authorized_us"].forEach((key) => required(`answers.${key}`, answers[key]));
  required("comp.note", objectValue(profile.comp).note); if (typeof objectValue(profile.comp).zero_ok !== "boolean") errors["comp.zero_ok"] = "Choose yes or no"; const floor = objectValue(profile.comp).floor; if (placeholder(floor)) errors["comp.floor"] = "Replace the placeholder with the real value."; else if (floor !== null && floor !== "" && (!Number.isFinite(Number(floor)) || Number(floor) < 0)) errors["comp.floor"] = "Use a positive number or leave blank";
  if (placeholder(profile.start_date)) errors.start_date = "Replace the placeholder with the real value."; else if (!/^\d{4}-\d{2}-\d{2}$/.test(String(profile.start_date ?? "")) || Number.isNaN(new Date(`${String(profile.start_date)}T00:00:00`).getTime())) errors.start_date = "Enter a valid date";
  if (stringList(profile.role_types).length === 0) errors.role_types = "Select at least one employment type.";
  const reply = objectValue(profile.reply_tiers); if (stringList(reply.auto_send).length === 0 || stringList(reply.auto_send).some((code) => !/^R[1-8]$/.test(code))) errors["reply_tiers.auto_send"] = stringList(reply.auto_send).some(placeholder) ? "Replace placeholders with real values." : "Use one or more codes R1–R8"; requiredList("reply_tiers.draft_for_review", reply.draft_for_review, "Add at least one tier"); requiredList("reply_tiers.never", reply.never, "Add at least one tier");
  const matrix = normalizeMatrix(profile.years_matrix);
  matrix.forEach((entry, index) => {
    if (!entry.skill.trim()) errors[`years_matrix.${index}.skill`] = "Skill name is required";
    if (!Number.isInteger(entry.years) || entry.years < 0) errors[`years_matrix.${index}.years`] = "Use a whole number of 0 or more";
  });
  return errors;
}

const ONBOARDING_STEPS: Array<{ title: string; prefixes: string[] }> = [
  { title: "Identity", prefixes: ["identity."] },
  { title: "Work authorization", prefixes: ["work_auth."] },
  { title: "Employment types", prefixes: ["role_types"] },
  { title: "Targeting & location", prefixes: ["targeting.", "locations."] },
  { title: "Screening answers", prefixes: ["answers."] },
  { title: "Caps, compensation & replies", prefixes: ["caps.", "comp.", "start_date", "reply_tiers."] },
];

const emptyProfileDraft = () => normalizeProfile({
  identity: { name: "", email: "", phone: "", location: "", linkedin: "", timezone: "" },
  work_auth: { status: "", sponsor_required: null, h1b_gate: "" },
  role_types: [],
  locations: { priority: [], relocation: "" },
  targeting: { titles: [], industries: [], seniority: [], tiers: [] },
  comp: { floor: null, note: "" },
  start_date: "",
  answers: { relocate: "", covenants: "", drivers_license: "", degree_dates: "", home_zip: "", work_authorized_us: "" },
  caps: { per_run: 0, per_day: 0, appliers: 0 },
  reply_tiers: { auto_send: [], draft_for_review: [], never: [] },
});

function Onboarding({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<AnyData>(() => emptyProfileDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [complete, setComplete] = useState(false);
  const currentStep = ONBOARDING_STEPS[step] ?? ONBOARDING_STEPS[0];
  const identity = objectValue(draft.identity); const work = objectValue(draft.work_auth); const locations = objectValue(draft.locations); const targeting = objectValue(draft.targeting); const answers = objectValue(draft.answers); const caps = objectValue(draft.caps); const comp = objectValue(draft.comp); const reply = objectValue(draft.reply_tiers);
  const update = (section: string, key: string, value: unknown) => setDraft((previous) => ({ ...previous, [section]: { ...objectValue(previous[section]), [key]: value } }));
  const updateRoot = (key: string, value: unknown) => setDraft((previous) => ({ ...previous, [key]: value }));
  const toggleEmploymentType = (value: typeof EMPLOYMENT_TYPES[number]) => {
    const selected = stringList(draft.role_types);
    updateRoot("role_types", selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };
  const stepErrors = () => {
    const all = validateProfile(draft);
    const prefixes = currentStep?.prefixes ?? [];
    return Object.fromEntries(Object.entries(all).filter(([key]) => prefixes.some((prefix) => key === prefix || key.startsWith(prefix))));
  };
  const save = useMutation({
    mutationFn: (profile: AnyData) => api.profile_save(profile as Parameters<typeof api.profile_save>[0]),
    onSuccess: (result) => {
      if (!result.ok) { setErrors(result.field ? { [result.field]: result.message } : {}); setNotice(`${titleCase(result.step)} failed: ${result.message}`); return; }
      setComplete(true); setNotice("");
    },
    onError: () => setNotice("The profile could not be saved. Nothing was added to the live profile."),
  });
  const next = () => {
    const found = stepErrors(); setErrors(found);
    if (Object.keys(found).length) { setNotice("Complete the highlighted fields before continuing."); return; }
    setNotice(""); setStep((value) => Math.min(5, value + 1)); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const finish = (event: FormEvent) => {
    event.preventDefault(); const found = validateProfile(draft); setErrors(found);
    if (Object.keys(found).length) { setNotice("Complete every highlighted field before finishing setup."); return; }
    const payload = { ...draft, comp: { ...comp, floor: comp.floor === "" || comp.floor === null ? null : Number(comp.floor) } };
    save.mutate(payload);
  };
  if (complete) return <div className="onboarding-shell"><SafeAreaTopScrim backgroundColor="var(--bg)" /><main className="onboarding-workspace"><div className="onboarding-success"><div className="health-orb healthy"><Icon name="shield" size={28} /></div><p className="eyebrow">Setup complete</p><h1>Your profile is ready</h1><p>Schedules compile automatically within about 15 minutes through the <code>profile_watch</code> job. You do not need to do anything else.</p><button type="button" className="save-profile" onClick={onOpenDashboard}>Open dashboard</button></div></main></div>;
  return <div className="onboarding-shell"><SafeAreaTopScrim backgroundColor="var(--bg)" /><main className="onboarding-workspace"><div className="onboarding-lead"><div><p className="eyebrow">First-run setup</p><h1>Set up your profile</h1><p>The harness uses these answers for eligibility, search, limits, and replies.</p></div><div className="step-count">Step {step + 1} of 6</div></div><div className="step-track" aria-label={`Step ${step + 1} of 6`}>{ONBOARDING_STEPS.map((item, index) => <span key={item.title} className={index <= step ? "active" : ""} />)}</div>{notice && <div className="save-notice error" role="alert">{notice}</div>}<form onSubmit={finish} noValidate>
    {step === 0 && <ProfileSection title="Identity" description="Contact details and the timezone used for run dates." sample={PROFILE_SAMPLES.identity}><div className="field-grid"><Field label="Name" error={errors["identity.name"]}><input autoComplete="name" value={identity.name} onChange={(event) => update("identity", "name", event.target.value)} /></Field><Field label="Email" error={errors["identity.email"]}><input type="email" autoComplete="email" value={identity.email} onChange={(event) => update("identity", "email", event.target.value)} /></Field><Field label="Phone" error={errors["identity.phone"]}><input type="tel" autoComplete="tel" value={identity.phone} onChange={(event) => update("identity", "phone", event.target.value)} /></Field><Field label="Location" hint="Use City, ST" error={errors["identity.location"]}><input autoComplete="address-level2" value={identity.location} onChange={(event) => update("identity", "location", event.target.value)} /></Field><Field label="LinkedIn URL" error={errors["identity.linkedin"]}><input type="url" value={identity.linkedin} onChange={(event) => update("identity", "linkedin", event.target.value)} /></Field><Field label="Timezone" hint="IANA timezone, e.g. America/Chicago" error={errors["identity.timezone"]}><input value={identity.timezone} onChange={(event) => update("identity", "timezone", event.target.value)} /></Field></div></ProfileSection>}
    {step === 1 && <ProfileSection title="Work authorization" description="Choose the authorization and sponsorship rules used before a role can advance." sample={PROFILE_SAMPLES.work_auth}><div className="field-grid"><Field label="Status" error={errors["work_auth.status"]}><select value={work.status} onChange={(event) => update("work_auth", "status", event.target.value)}><option value="" disabled>Choose status</option>{["H-1B", "H1B", "US citizen", "Green card", "OPT", "STEM OPT", "TN", "EAD"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Sponsor required" error={errors["work_auth.sponsor_required"]}><select value={typeof work.sponsor_required === "boolean" ? String(work.sponsor_required) : ""} onChange={(event) => update("work_auth", "sponsor_required", event.target.value === "true")}><option value="" disabled>Choose yes or no</option><option value="true">Yes</option><option value="false">No</option></select></Field><Field label="H-1B gate" hint="Soft holds unknowns; hard rejects them" error={errors["work_auth.h1b_gate"]}><select value={work.h1b_gate} onChange={(event) => update("work_auth", "h1b_gate", event.target.value)}><option value="" disabled>Choose gate</option><option value="soft">Soft</option><option value="hard">Hard</option></select></Field></div></ProfileSection>}
    {step === 2 && <ProfileSection title="Employment types" description="Choose every employment category the harness may consider." sample={PROFILE_SAMPLES.role_types}><fieldset className={`employment-types ${errors.role_types ? "field-error" : ""}`}><legend>Allowed employment types</legend><div className="employment-type-options">{EMPLOYMENT_TYPES.map((value) => <label key={value} className={stringList(draft.role_types).includes(value) ? "selected" : ""}><input type="checkbox" checked={stringList(draft.role_types).includes(value)} onChange={() => toggleEmploymentType(value)} /><span>{value}</span></label>)}</div>{errors.role_types && <p className="inline-error" role="alert">{errors.role_types}</p>}</fieldset></ProfileSection>}
    {step === 3 && <><ProfileSection title="Targeting" description="Titles, industries, seniority, and company tiers shape discovery and ranking." sample={PROFILE_SAMPLES.targeting}><div className="field-grid"><EditableStringList label="Job titles" values={stringList(targeting.titles)} hint="These titles drive the scouts’ search queries." error={errors["targeting.titles"]} onChange={(values) => update("targeting", "titles", values)} /><Field label="Industries" hint="Comma separated" error={errors["targeting.industries"]}><input value={stringList(targeting.industries).join(", ")} onChange={(event) => update("targeting", "industries", csvList(event.target.value))} /></Field><Field label="Seniority" hint="senior, staff, architect, principal, lead" error={errors["targeting.seniority"]}><input value={stringList(targeting.seniority).join(", ")} onChange={(event) => update("targeting", "seniority", csvList(event.target.value))} /></Field><Field label="Company tiers" hint="1, 2, or 3" error={errors["targeting.tiers"]}><input value={(Array.isArray(targeting.tiers) ? targeting.tiers : []).join(", ")} onChange={(event) => update("targeting", "tiers", csvList(event.target.value).map(Number))} /></Field><Field label="Preferred lane" hint="Default employment lane when a JD leaves the type unstated (e.g. w2_contract)" error={errors["targeting.preferred_lane"]}><input value={typeof targeting.preferred_lane === "string" ? targeting.preferred_lane : ""} onChange={(event) => update("targeting", "preferred_lane", event.target.value.trim())} /></Field></div></ProfileSection><ProfileSection title="Location preferences" description="Set search geography in priority order and your relocation position." sample={PROFILE_SAMPLES.locations}><div className="field-grid"><Field label="Priority list" hint="Comma separated: City, ST · Remote US · US-wide onsite" error={errors["locations.priority"]}><input value={stringList(locations.priority).join(", ")} onChange={(event) => update("locations", "priority", csvList(event.target.value))} /></Field><Field label="Relocation" error={errors["locations.relocation"]}><input value={locations.relocation} onChange={(event) => update("locations", "relocation", event.target.value)} /></Field></div></ProfileSection></>}
    {step === 4 && <ProfileSection title="Screening answers" description="Enter settled answers the harness may reuse during applications." sample={PROFILE_SAMPLES.answers}><div className="field-grid">{[["relocate", "Relocate"], ["covenants", "Restrictive covenants"], ["drivers_license", "Driver’s license"], ["degree_dates", "Degree dates"], ["home_zip", "Home ZIP"], ["work_authorized_us", "Work authorized in US"]].map(([key = "", label = ""]) => <Field key={key} label={label} error={errors[`answers.${key}`]}><input value={String(answers[key] ?? "")} onChange={(event) => update("answers", key, event.target.value)} /></Field>)}</div></ProfileSection>}
    {step === 5 && <><ProfileSection title="Run caps" description="Set ceilings for each run, each day, and concurrent application work." sample={PROFILE_SAMPLES.caps}><div className="field-grid"><Field label="Per run" error={errors["caps.per_run"]}><input type="number" min="1" value={caps.per_run || ""} onChange={(event) => update("caps", "per_run", Number(event.target.value))} /></Field><Field label="Per day" error={errors["caps.per_day"]}><input type="number" min="1" value={caps.per_day || ""} onChange={(event) => update("caps", "per_day", Number(event.target.value))} /></Field><Field label="Appliers" error={errors["caps.appliers"]}><input type="number" min="1" value={caps.appliers || ""} onChange={(event) => update("caps", "appliers", Number(event.target.value))} /></Field><Field label="LinkedIn actions / hour" hint="Rate limit for LinkedIn automation" error={errors["caps.linkedin_actions_per_hour"]}><input type="number" min="1" value={caps.linkedin_actions_per_hour || ""} onChange={(event) => update("caps", "linkedin_actions_per_hour", Number(event.target.value))} /></Field></div></ProfileSection><ProfileSection title="Compensation & start" description="Set availability and the compensation language used in screening." sample={PROFILE_SAMPLES.compensation}><div className="field-grid"><Field label="Comp floor" hint="Leave blank for no floor" error={errors["comp.floor"]}><input inputMode="numeric" value={comp.floor ?? ""} onChange={(event) => update("comp", "floor", event.target.value)} /></Field><Field label="Comp note" error={errors["comp.note"]}><input value={comp.note} onChange={(event) => update("comp", "note", event.target.value)} /></Field><Field label="Zero-comp roles OK" hint="Unpaid / equity-only roles" error={errors["comp.zero_ok"]}><select value={comp.zero_ok ? "true" : "false"} onChange={(event) => update("comp", "zero_ok", event.target.value === "true")}><option value="true">Yes</option><option value="false">No</option></select></Field><Field label="Start date" error={errors.start_date}><input type="date" value={draft.start_date} onChange={(event) => updateRoot("start_date", event.target.value)} /></Field></div></ProfileSection><ProfileSection title="Reply tiers" description="Choose which reply rules can send, require review, or must never act." sample={PROFILE_SAMPLES.reply_tiers}><div className="field-grid"><Field label="Auto-send" hint="R1–R8, comma separated" error={errors["reply_tiers.auto_send"]}><input value={stringList(reply.auto_send).join(", ")} onChange={(event) => update("reply_tiers", "auto_send", csvList(event.target.value))} /></Field><Field label="Draft for review" error={errors["reply_tiers.draft_for_review"]}><input value={stringList(reply.draft_for_review).join(", ")} onChange={(event) => update("reply_tiers", "draft_for_review", csvList(event.target.value))} /></Field><Field label="Never" error={errors["reply_tiers.never"]}><input value={stringList(reply.never).join(", ")} onChange={(event) => update("reply_tiers", "never", csvList(event.target.value))} /></Field></div></ProfileSection></>}
    <div className="onboarding-actions">{step > 0 ? <button type="button" onClick={() => { setStep((value) => value - 1); setNotice(""); setErrors({}); }}>Back</button> : <span />}{step < 5 ? <button type="button" className="save-profile" onClick={next}>Continue</button> : <button type="submit" className="save-profile" disabled={save.isPending}>{save.isPending ? "Completing…" : "Complete setup"}</button>}</div>
  </form></main></div>;
}

function MatrixEditor({ rows, errors, onChange }: { rows: Array<{ skill: string; category: string; years: number; where_used: string }>; errors: Record<string, string>; onChange: (rows: Array<{ skill: string; category: string; years: number; where_used: string }>) => void }) {
  const updateRow = (index: number, key: string, value: unknown) => onChange(rows.map((row, i) => i === index ? { ...row, [key]: value } : row));
  const addRow = () => onChange([...rows, { skill: "", category: "", years: 0, where_used: "" }]);
  const removeRow = (index: number) => onChange(rows.filter((_, i) => i !== index));
  return <div className="matrix-editor">
    {rows.length === 0 && <p className="matrix-empty">No skills recorded yet. Add rows below, or import from a persona YAML.</p>}
    {rows.map((row, index) => <div key={index} className="matrix-row">
      <Field label="Skill" error={errors[`years_matrix.${index}.skill`]}><input value={row.skill} onChange={(e) => updateRow(index, "skill", e.target.value)} placeholder="e.g. Apache Spark" /></Field>
      <Field label="Category"><input value={row.category} onChange={(e) => updateRow(index, "category", e.target.value)} placeholder="e.g. Data engineering" /></Field>
      <Field label="Years" error={errors[`years_matrix.${index}.years`]}><input type="number" min={0} step={1} value={row.years} onChange={(e) => updateRow(index, "years", e.target.value === "" ? 0 : Number(e.target.value))} /></Field>
      <Field label="Where used"><input value={row.where_used} onChange={(e) => updateRow(index, "where_used", e.target.value)} placeholder="e.g. Batch pipelines" /></Field>
      <button type="button" className="matrix-remove" aria-label={`Remove ${row.skill || `row ${index + 1}`}`} onClick={() => removeRow(index)}>Remove</button>
    </div>)}
    <button type="button" className="matrix-add" onClick={addRow}>Add skill</button>
  </div>;
}

function Profile({ onOpenSchedules }: { onOpenSchedules: () => void }) {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: () => api.profile_get({}), refetchOnMount: "always", staleTime: 0 });
  const [draft, setDraft] = useState<AnyData | null>(null); const [errors, setErrors] = useState<Record<string, string>>({}); const [notice, setNotice] = useState<{ tone: "good" | "warn" | "error"; text: string } | null>(null);
  const current = draft ?? (profileQuery.data?.profile ? normalizeProfile(profileQuery.data.profile as AnyData) : null);
  const save = useMutation({
    mutationFn: (profile: AnyData) => api.profile_save(profile as Parameters<typeof api.profile_save>[0]),
    onSuccess: async (result, submitted) => {
      if (!result.ok) { setErrors(result.field ? { [result.field]: result.message } : {}); setNotice({ tone: "error", text: `${titleCase(result.step)} failed: ${result.message}` }); return; }
      // DB-verify (§8): re-read the live profile and confirm the submitted
      // caps actually landed before claiming success.
      try {
        const reread = await api.profile_get({});
        const liveCaps = objectValue((reread.profile as AnyData | null)?.caps);
        const wantCaps = objectValue((submitted as AnyData).caps);
        const keys = ["per_run", "per_day", "appliers", "linkedin_actions_per_hour"];
        const mismatch = keys.filter((key) => Number(liveCaps[key]) !== Number(wantCaps[key]));
        if (mismatch.length) { setNotice({ tone: "error", text: `Saved, but the live profile shows different caps (${mismatch.join(", ")}). The database write did not take — try saving again.` }); return; }
      } catch { setNotice({ tone: "warn", text: "Saved, but the live profile could not be re-read to verify the caps. Check the values below." }); void queryClient.invalidateQueries({ queryKey: ["profile"] }); return; }
      setDraft(null);
      setNotice({ tone: result.warnings.length ? "warn" : "good", text: result.warnings.length ? `Saved to the live profile and YAML. ${result.warnings.map((warning) => warning.message).join(" ")}` : "Saved to the live profile and profile.yaml. New runs will use these values." });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => setNotice({ tone: "error", text: "The profile could not be saved. No success was recorded." }),
  });
  const update = (section: string, key: string, value: unknown) => setDraft((previous) => { const base = previous ?? current; if (!base) return previous; return { ...base, [section]: { ...objectValue(base[section]), [key]: value } }; });
  const updateRoot = (key: string, value: unknown) => setDraft((previous) => ({ ...(previous ?? current ?? {}), [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); if (!current) return; const found = validateProfile(current); setErrors(found); setNotice(null); if (Object.keys(found).length) { setNotice({ tone: "error", text: "Fix the highlighted fields before saving." }); return; } const payload = { ...current, comp: { ...objectValue(current.comp), floor: objectValue(current.comp).floor === "" ? null : objectValue(current.comp).floor === null ? null : Number(objectValue(current.comp).floor) } }; save.mutate(payload); };
  if (profileQuery.isPending) return <div className="loading"><span /><p>Reading profile…</p></div>;
  if (profileQuery.isError) return <div className="error-screen"><div className="health-orb"><Icon name="profile" size={28} /></div><h1>Profile unavailable</h1><p>The current profile could not be read.</p><button onClick={() => profileQuery.refetch()}>Retry</button></div>;
  if (!current) return <div className="error-screen"><div className="health-orb"><Icon name="profile" size={28} /></div><h1>No profile loaded</h1><p>Run first-time YAML setup before editing the profile here.</p><button onClick={() => profileQuery.refetch()}>Check again</button></div>;
  const identity = objectValue(current.identity); const work = objectValue(current.work_auth); const locations = objectValue(current.locations); const targeting = objectValue(current.targeting); const caps = objectValue(current.caps); const answers = objectValue(current.answers); const comp = objectValue(current.comp); const reply = objectValue(current.reply_tiers);
  const extras = Object.entries(answers).filter(([key]) => !baseAnswers.has(key));
  const addAnswer = () => { let index = 1; while (`new_answer_${index}` in answers) index += 1; update("answers", `new_answer_${index}`, ""); };
  const renameAnswer = (oldKey: string, newKey: string) => { const cleaned = newKey.trim().replace(/\s+/g, "_"); if (!cleaned || cleaned === oldKey || cleaned in answers) return; const next = { ...answers, [cleaned]: answers[oldKey] }; delete next[oldKey]; setDraft({ ...current, answers: next }); };
  const toggleEmploymentType = (value: typeof EMPLOYMENT_TYPES[number]) => {
    const selected = stringList(current.role_types);
    const next = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
    updateRoot("role_types", next);
    if (next.length > 0 && errors.role_types) setErrors((previous) => { const remaining = { ...previous }; delete remaining.role_types; return remaining; });
  };
  const matrixImport = useMutation({
    mutationFn: (yaml_text: string) => api.years_matrix_import({ yaml_text }),
    onSuccess: (result) => {
      if (!result.ok) { setNotice({ tone: "error", text: `Skills-matrix import failed: ${result.message}` }); return; }
      setDraft(null);
      setNotice({ tone: "good", text: `Imported ${result.imported} skills into the matrix (database and profile.yaml).` });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => setNotice({ tone: "error", text: "The skills-matrix import could not be completed. No changes were recorded." }),
  });
  const matrixFileRef = useRef<HTMLInputElement | null>(null);
  const chooseMatrixFile = (file: File | undefined | null) => {
    if (!file) return;
    file.text().then((text) => matrixImport.mutate(text)).catch(() => setNotice({ tone: "error", text: "The selected file could not be read." }));
  };
  const dirty = draft !== null;
  return <form className="profile-page" onSubmit={submit} noValidate>
    <div className="page-lead profile-lead"><div><p className="eyebrow">Run configuration</p><h1>Profile settings</h1><p>One source of truth for eligibility, targeting, run limits, and replies.</p></div><button className="save-profile top-save" type="submit" disabled={save.isPending || !dirty}>{save.isPending ? "Saving…" : dirty ? "Save changes" : "Saved"}</button></div>
    {notice && <div className={`save-notice ${notice.tone}`} role="status">{notice.text}</div>}
    <div className="profile-summary" aria-label="Current profile summary">
      <div><span>Work authorization</span><b>{String(work.status || "Not set")}</b><small>{work.sponsor_required ? "Sponsor required" : "No sponsorship required"}</small></div>
      <div><span>Target levels</span><b>{stringList(targeting.seniority).map(titleCase).join(" · ") || "Not set"}</b><small>Tiers {(Array.isArray(targeting.tiers) ? targeting.tiers : []).join(", ") || "—"}</small></div>
      <div><span>Daily capacity</span><b>{fmt(caps.per_day)} applications</b><small>{fmt(caps.appliers)} concurrent appliers</small></div>
    </div>
    <div className="profile-guide"><Icon name="eye" size={17} /><p><b>Need the exact shape?</b> Use the eye on any section to see clearly labeled sample JSON, including valid values. Your live fields never use the sample.</p></div>
    <div className="profile-grid">
      <ProfileSection title="Identity" description="Contact details and the timezone used for run dates." sample={PROFILE_SAMPLES.identity}>
        <span className="section-index">01</span><div className="field-grid"><Field label="Name" error={errors["identity.name"]}><input autoComplete="name" value={identity.name} onChange={(e) => update("identity", "name", e.target.value)} /></Field><Field label="Email" error={errors["identity.email"]}><input type="email" autoComplete="email" value={identity.email} onChange={(e) => update("identity", "email", e.target.value)} /></Field><Field label="Phone" error={errors["identity.phone"]}><input type="tel" autoComplete="tel" value={identity.phone} onChange={(e) => update("identity", "phone", e.target.value)} /></Field><Field label="Location" hint="Use City, ST" error={errors["identity.location"]}><input autoComplete="address-level2" value={identity.location} onChange={(e) => update("identity", "location", e.target.value)} /></Field><Field label="LinkedIn" error={errors["identity.linkedin"]}><input type="url" value={identity.linkedin} onChange={(e) => update("identity", "linkedin", e.target.value)} /></Field><Field label="Timezone" hint="IANA timezone" error={errors["identity.timezone"]}><input value={identity.timezone} onChange={(e) => update("identity", "timezone", e.target.value)} /></Field></div>
      </ProfileSection>
      <ProfileSection title="Work authorization" description="The eligibility gate applied before a role can advance." sample={PROFILE_SAMPLES.work_auth}>
        <span className="section-index">02</span><div className="field-grid"><Field label="Status" error={errors["work_auth.status"]}><select value={work.status} onChange={(e) => update("work_auth", "status", e.target.value)}>{["H-1B", "H1B", "US citizen", "Green card", "OPT", "STEM OPT", "TN", "EAD"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Sponsor required"><select value={work.sponsor_required ? "true" : "false"} onChange={(e) => update("work_auth", "sponsor_required", e.target.value === "true")}><option value="true">Yes</option><option value="false">No</option></select></Field><Field label="H-1B gate" hint="Soft holds unknowns; hard rejects them" error={errors["work_auth.h1b_gate"]}><select value={work.h1b_gate} onChange={(e) => update("work_auth", "h1b_gate", e.target.value)}><option value="soft">Soft</option><option value="hard">Hard</option></select></Field></div>
      </ProfileSection>
      <ProfileSection title="Targeting" description="Job titles, industries, seniority, and company tiers used to find and rank opportunities." sample={PROFILE_SAMPLES.targeting}>
        <span className="section-index">03</span><div className="field-grid"><EditableStringList label="Job titles" values={stringList(targeting.titles)} hint="These titles drive the scouts’ search queries." error={errors["targeting.titles"]} onChange={(values) => update("targeting", "titles", values)} /><Field label="Industries" hint="Comma separated" error={errors["targeting.industries"]}><input value={stringList(targeting.industries).join(", ")} onChange={(e) => update("targeting", "industries", csvList(e.target.value))} /></Field><Field label="Seniority" hint="senior, staff, architect, principal, lead" error={errors["targeting.seniority"]}><input value={stringList(targeting.seniority).join(", ")} onChange={(e) => update("targeting", "seniority", csvList(e.target.value))} /></Field><Field label="Company tiers" hint="1, 2, or 3" error={errors["targeting.tiers"]}><input value={(Array.isArray(targeting.tiers) ? targeting.tiers : []).join(", ")} onChange={(e) => update("targeting", "tiers", csvList(e.target.value).map(Number))} /></Field></div>
      </ProfileSection>
      <ProfileSection title="Location preferences" description="Ordered search geography and relocation flexibility." sample={PROFILE_SAMPLES.locations}>
        <span className="section-index">04</span><div className="field-grid"><Field label="Priority list" hint="City, ST · Remote US · US-wide onsite" error={errors["locations.priority"]}><input value={stringList(locations.priority).join(", ")} onChange={(e) => update("locations", "priority", csvList(e.target.value))} /></Field><Field label="Relocation" error={errors["locations.relocation"]}><input value={locations.relocation} onChange={(e) => update("locations", "relocation", e.target.value)} /></Field></div>
        <p className="locations-preview" aria-live="polite">{previewYamlLocations(stringList(locations.priority), String(locations.relocation ?? ""))}</p>
      </ProfileSection>
      <ProfileSection title="Compensation & start" description="Availability and the compensation language used in screening." sample={PROFILE_SAMPLES.compensation}>
        <span className="section-index">05</span><div className="field-grid"><Field label="Comp floor" hint="Leave blank for no floor" error={errors["comp.floor"]}><input inputMode="numeric" value={comp.floor ?? ""} onChange={(e) => update("comp", "floor", e.target.value)} /></Field><Field label="Comp note" error={errors["comp.note"]}><input value={comp.note} onChange={(e) => update("comp", "note", e.target.value)} /></Field><Field label="Zero-comp roles OK" hint="Unpaid / equity-only roles" error={errors["comp.zero_ok"]}><select value={comp.zero_ok ? "true" : "false"} onChange={(e) => update("comp", "zero_ok", e.target.value === "true")}><option value="true">Yes</option><option value="false">No</option></select></Field><Field label="Start date" error={errors.start_date}><input type="date" value={current.start_date} onChange={(e) => updateRoot("start_date", e.target.value)} /></Field></div>
      </ProfileSection>
      <ProfileSection title="Run caps" description="Hard ceilings for each run, each day, and concurrent application work." sample={PROFILE_SAMPLES.caps}>
        <span className="section-index">06</span><div className="field-grid"><Field label="Per run" error={errors["caps.per_run"]}><input type="number" min="1" value={caps.per_run} onChange={(e) => update("caps", "per_run", Number(e.target.value))} /></Field><Field label="Per day" error={errors["caps.per_day"]}><input type="number" min="1" value={caps.per_day} onChange={(e) => update("caps", "per_day", Number(e.target.value))} /></Field><Field label="Appliers" error={errors["caps.appliers"]}><input type="number" min="1" value={caps.appliers} onChange={(e) => update("caps", "appliers", Number(e.target.value))} /></Field><Field label="LinkedIn actions / hour" hint="Rate limit for LinkedIn automation" error={errors["caps.linkedin_actions_per_hour"]}><input type="number" min="1" value={caps.linkedin_actions_per_hour} onChange={(e) => update("caps", "linkedin_actions_per_hour", Number(e.target.value))} /></Field></div>
      </ProfileSection>
      <ProfileSection title="Screening answers" description="Deterministic answers only. Add a key when a new recurring question is settled." sample={PROFILE_SAMPLES.answers} className="profile-wide" action={<button type="button" className="add-answer" onClick={addAnswer}>Add answer</button>}>
        <span className="section-index">07</span><div className="field-grid">{[["relocate", "Relocate"], ["covenants", "Restrictive covenants"], ["drivers_license", "Driver’s license"], ["degree_dates", "Degree dates"], ["home_zip", "Home ZIP"], ["work_authorized_us", "Work authorized in US"]].map(([key = "", label = ""]) => <Field key={key} label={label} error={errors[`answers.${key}`]}><input value={String(answers[key] ?? "")} onChange={(e) => update("answers", key, e.target.value)} /></Field>)}{extras.map(([key, value]) => <div className="extra-answer" key={key}><Field label="Answer key"><input defaultValue={key} onBlur={(e) => renameAnswer(key, e.target.value)} /></Field><Field label="Value"><input value={String(value ?? "")} onChange={(e) => update("answers", key, e.target.value)} /></Field><button type="button" aria-label={`Remove ${key}`} onClick={() => { const next = { ...answers }; delete next[key]; setDraft({ ...current, answers: next }); }}>Remove</button></div>)}</div>
      </ProfileSection>
      <ProfileSection title="Reply tiers" description="Which reply rules can send, require review, or must never act." sample={PROFILE_SAMPLES.reply_tiers}>
        <span className="section-index">08</span><div className="field-grid"><Field label="Auto-send" hint="R1–R8, comma separated" error={errors["reply_tiers.auto_send"]}><input value={stringList(reply.auto_send).join(", ")} onChange={(e) => update("reply_tiers", "auto_send", csvList(e.target.value))} /></Field><Field label="Draft for review" error={errors["reply_tiers.draft_for_review"]}><input value={stringList(reply.draft_for_review).join(", ")} onChange={(e) => update("reply_tiers", "draft_for_review", csvList(e.target.value))} /></Field><Field label="Never" error={errors["reply_tiers.never"]}><input value={stringList(reply.never).join(", ")} onChange={(e) => update("reply_tiers", "never", csvList(e.target.value))} /></Field></div>
      </ProfileSection>
      <ProfileSection title="Employment type" description="Choose every employment category the harness may consider. Job titles are configured under Targeting." sample={PROFILE_SAMPLES.role_types}>
        <span className="section-index">09</span>
        <fieldset className={`employment-types ${errors.role_types ? "field-error" : ""}`} aria-describedby={errors.role_types ? "employment-type-error" : "employment-type-hint"}>
          <legend>Allowed employment types</legend>
          <div className="employment-type-options">
            {EMPLOYMENT_TYPES.map((value) => <label key={value} className={stringList(current.role_types).includes(value) ? "selected" : ""}>
              <input type="checkbox" checked={stringList(current.role_types).includes(value)} onChange={() => toggleEmploymentType(value)} />
              <span>{value}</span>
            </label>)}
          </div>
          <small id="employment-type-hint">Select one or more. The eligibility judge rejects postings whose employment type is not selected.</small>
          {errors.role_types && <p id="employment-type-error" className="inline-error" role="alert">{errors.role_types}</p>}
        </fieldset>
      </ProfileSection>
      <ProfileSection title="Skills matrix" description="Years of hands-on experience per skill. Feeds fit-judge and the resume tailor; imported once from the onboarding Excel converter and editable here." sample={PROFILE_SAMPLES.years_matrix} className="profile-wide" action={<><input ref={matrixFileRef} type="file" accept=".yaml,.yml" className="visually-hidden" aria-label="Choose persona YAML" onChange={(e) => void chooseMatrixFile(e.target.files?.[0])} /><button type="button" className="matrix-import" onClick={() => matrixFileRef.current?.click()} disabled={matrixImport.isPending}>{matrixImport.isPending ? "Importing…" : "Import from persona"}</button></>}>
        <span className="section-index">10</span>
        <MatrixEditor rows={normalizeMatrix(current.years_matrix)} errors={errors} onChange={(rows) => updateRoot("years_matrix", rows)} />
      </ProfileSection>
      <ProfileSection title="Resume files" description="Where the harness reads and writes resume PDFs, and the exact filename every submission uses. Managed in profile.yaml — shown here so every captured field is visible in one place." sample={PROFILE_SAMPLES.resumes} className="profile-wide">
        <span className="section-index">11</span><div className="field-grid"><Field label="Resume directory"><input value={String(objectValue(current.resumes).dir ?? "Not set")} readOnly aria-readonly="true" /></Field><Field label="Filename rule"><input value={String(objectValue(current.resumes).filename_rule ?? "Not set")} readOnly aria-readonly="true" /></Field></div>
        <p className="resumes-note">The resume library (Resumes tab) registers variants from this directory. The filename rule is enforced on every tailored PDF before upload.</p>
      </ProfileSection>
      <ProfileSchedules onOpenSchedules={onOpenSchedules} />
    </div>
    <div className="save-bar"><div><b>{dirty ? "Unsaved profile changes" : "Profile is current"}</b><span>{profileQuery.data?.updated_at ? `Last saved ${when(profileQuery.data.updated_at)}` : "Not saved yet"}</span></div><button className="save-profile" type="submit" disabled={save.isPending || !dirty}>{save.isPending ? "Saving…" : dirty ? "Save changes" : "Saved"}</button></div>
  </form>;
}

function RefreshButton({ onClick, active }: { onClick: () => void; active: boolean }) { return <button className="refresh" onClick={onClick} disabled={active} aria-label="Refresh current dashboard"><Icon name="refresh" /><span>{active ? "Refreshing" : "Refresh"}</span></button>; }

export function App() {
  const [active, setActive] = useState<Tab>("overview"); const queryClient = useQueryClient();
  const [onboardingLock, setOnboardingLock] = useState(false);
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: () => api.profile_get({}), refetchOnMount: "always", staleTime: 0 });
  useEffect(() => { if (profileQuery.isSuccess && profileQuery.data.profile === null) setOnboardingLock(true); }, [profileQuery.isSuccess, profileQuery.data?.profile]);
  const needsOnboarding = onboardingLock || (profileQuery.isSuccess && profileQuery.data.profile === null);
  const snapshotView = active === "profile" || active === "schedules" || active === "datasets" ? "overview" : active;
  const snapshot = useQuery({ queryKey: ["snapshot", active], queryFn: () => api.snapshot({ view: snapshotView }), refetchOnMount: "always", staleTime: 0, enabled: profileQuery.isSuccess && profileQuery.data.profile !== null && !needsOnboarding && active !== "profile" && active !== "schedules" && active !== "datasets" });
  const data = (snapshot.data?.data ?? {}) as AnyData;
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["snapshot", active] }); void snapshot.refetch(); };
  const openApprovals = () => {
    setActive("overview");
    window.setTimeout(() => document.getElementById("approval-queue")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };
  if (profileQuery.isPending) return <div className="app-shell"><SafeAreaTopScrim backgroundColor="var(--bg)" /><main className="workspace"><div className="loading"><span /><p>Reading profile…</p></div></main></div>;
  if (profileQuery.isError) return <div className="app-shell"><SafeAreaTopScrim backgroundColor="var(--bg)" /><main className="workspace"><div className="error-screen"><div className="health-orb"><Icon name="profile" size={28} /></div><h1>Profile unavailable</h1><p>The current profile could not be read.</p><button onClick={() => profileQuery.refetch()}>Retry</button></div></main></div>;
  if (needsOnboarding) return <Onboarding onOpenDashboard={() => { void profileQuery.refetch().then((result) => { if (result.data?.profile) setOnboardingLock(false); }); }} />;
  return <div className="app-shell"><SafeAreaTopScrim backgroundColor="var(--bg)" /><aside className="rail" aria-label="Dashboard navigation"><div className="rail-mark"><span /><span /></div><nav>{tabs.map((tab) => <button key={tab.id} className={active === tab.id ? "active" : ""} onClick={() => setActive(tab.id)} aria-current={active === tab.id ? "page" : undefined}><Icon name={tab.icon} /><span>{tab.label}</span></button>)}</nav><div className="rail-foot"><span className="live-dot">Private</span></div></aside>
    <main className="workspace">
      {active === "profile" ? <Profile onOpenSchedules={() => setActive("schedules")} /> : active === "schedules" ? <Schedules /> : active === "datasets" ? <Datasets /> : snapshot.isPending ? <div className="loading"><span /><p>Reading {active} ledger…</p></div> : snapshot.isError ? <div className="error-screen"><div className="health-orb"><Icon name="shield" size={28} /></div><h1>Source unavailable</h1><p>The {active} snapshot could not be read.</p><button onClick={() => snapshot.refetch()}>Retry</button></div> : <>{active === "overview" && <Overview data={data} onRefresh={refresh} refreshing={snapshot.isFetching} />}{active === "applications" && <Applications data={data} onRefresh={refresh} refreshing={snapshot.isFetching} onOpenOverview={() => setActive("overview")} />}{active === "resumes" && <Resumes data={data} onRefresh={refresh} refreshing={snapshot.isFetching} />}{active === "runs" && <Runs data={data} onRefresh={refresh} refreshing={snapshot.isFetching} onOpenApprovals={openApprovals} />}{active === "replies" && <Replies data={data} onRefresh={refresh} refreshing={snapshot.isFetching} />}</>}
      {active !== "profile" && active !== "schedules" && active !== "datasets" && snapshot.data && <p className="freshness">Snapshot {when(snapshot.data.generated_at)}</p>}
    </main>
    <nav className="bottom-nav" aria-label="Dashboard navigation">{tabs.map((tab) => <button key={tab.id} className={active === tab.id ? "active" : ""} onClick={() => setActive(tab.id)} aria-current={active === tab.id ? "page" : undefined}><Icon name={tab.icon} /><span>{tab.label}</span></button>)}</nav>
  </div>;
}
