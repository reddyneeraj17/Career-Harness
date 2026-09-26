import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaTopScrim } from "@hatch/space-sdk/client";
import { api } from "./api";

type Tab = "overview" | "applications" | "resumes" | "runs" | "replies" | "profile";
type AnyData = Record<string, any>;

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "pulse" },
  { id: "applications", label: "Applications", icon: "file" },
  { id: "resumes", label: "Resumes", icon: "resume" },
  { id: "runs", label: "Runs", icon: "play" },
  { id: "replies", label: "Replies", icon: "reply" },
  { id: "profile", label: "Profile", icon: "profile" },
];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "file") return <svg {...common}><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 13h5M10 17h5"/></svg>;
  if (name === "resume") return <svg {...common}><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>;
  if (name === "play") return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></svg>;
  if (name === "reply") return <svg {...common}><path d="m9 17-5-5 5-5"/><path d="M4 12h9a6 6 0 0 1 6 6"/></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6z"/><path d="m9 12 2 2 4-5"/></svg>;
  if (name === "profile") return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M4 4h2M18 4h2"/></svg>;
  if (name === "refresh") return <svg {...common}><path d="M20 6v5h-5"/><path d="M18.5 15a7 7 0 1 1-.4-6.7L20 11"/></svg>;
  if (name === "search") return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
  if (name === "chevron") return <svg {...common}><path d="m9 18 6-6-6-6"/></svg>;
  if (name === "external") return <svg {...common}><path d="M14 4h6v6M10 14 20 4M20 14v6H4V4h6"/></svg>;
  return <svg {...common}><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>;
}

const fmt = (n: unknown) => Number(n ?? 0).toLocaleString("en-US");
const when = (value: unknown) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(String(value))) : "—";
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
  const tone = /submitted|confirmed|completed|healthy|sent|auto_sent|in_sync/.test(value) ? "good" : /blocked|failed|attention|drift|needs_me|held/.test(value) ? "warn" : "neutral";
  return <span className={`status status-${tone}`}>{titleCase(value)}</span>;
}

function Kpi({ label, value, hero = false, note }: { label: string; value: unknown; hero?: boolean; note?: string }) {
  return <div className={hero ? "kpi kpi-hero" : "kpi"}><span>{label}</span><strong>{fmt(value)}</strong>{note && <small>{note}</small>}</div>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="empty"><div className="empty-mark"><span /><span /><span /></div><h3>{title}</h3><p>{body}</p></div>;
}

const fileName = (path: string) => path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
type WorkspaceFileRef = { app_id: string; kind: "resume" | "screenshot" | "confirmation" } | { variant_id: string };

function WorkspaceFileButton({ fileRef, label, displayName }: { fileRef: WorkspaceFileRef; label: string; displayName: string }) {
  const open = useMutation({ mutationFn: () => api.file_open(fileRef) });
  const openFile = () => {
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    open.mutate(undefined, {
      onSuccess: (result) => {
        const url = new URL(result.file_url, window.location.href).href;
        if (popup) popup.location.replace(url);
        else {
          const anchor = document.createElement("a");
          anchor.href = url; anchor.download = result.filename; anchor.target = "_blank"; anchor.rel = "noreferrer";
          document.body.appendChild(anchor); anchor.click(); anchor.remove();
        }
      },
      onError: () => popup?.close(),
    });
  };
  return <span className="workspace-file-control"><button type="button" className="file-button" onClick={openFile} disabled={open.isPending} aria-label={`${label}: ${displayName}`}>{open.isPending ? "Opening…" : label} <Icon name="external" size={14} /></button>{open.isError && <small>File unavailable</small>}</span>;
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

function Overview({ data, onRefresh, refreshing }: { data: AnyData; onRefresh: () => void; refreshing: boolean }) {
  const c = data.counts ?? { by_state: {} }; const approvals = Array.isArray(data.approvals) ? data.approvals : [];
  const [question, setQuestion] = useState(""); const [answer, setAnswer] = useState<AnyData | null>(null);
  const ask = useMutation({ mutationFn: (query: string) => api.snapshot({ view: "ask", query }), onSuccess: (r) => setAnswer((r.data ?? {}) as AnyData) });
  const resolve = useMutation({ mutationFn: ({ id, answer }: { id: string; answer: string }) => api.approval_resolve({ approval_id: id, answer, judged_by: "dashboard" }), onSuccess: onRefresh });
  const submitAsk = (e: FormEvent) => { e.preventDefault(); const q = question.trim(); if (q) ask.mutate(q); };
  return <>
    <div className="page-lead"><div><p className="eyebrow">Live control plane</p><h1>What needs attention now?</h1><p>Throughput, fleet signal, and decisions from one store.</p></div><RefreshButton onClick={onRefresh} active={refreshing} /></div>
    <div className="kpi-band"><Kpi hero label="Total applications" value={c.total} note="All recorded states" /><Kpi label="Submitted" value={c.by_state?.submitted} /><Kpi label="Blocked" value={c.by_state?.blocked} /><Kpi label="Runs · 24h" value={data.runs_24h} /><Kpi label="Events · 24h" value={data.events_24h} /></div>
    <div className="overview-grid">
      <Section title="Fleet health · 24 hours" aside={<span className="live-dot">Live</span>}>
        <div className="signal"><div className="signal-ring"><strong>{fmt(data.healthy_runs_24h)}</strong><span>healthy</span></div><div><p><b>{fmt(data.runs_24h)}</b> runs observed</p><p><b>{fmt(data.events_24h)}</b> ledger events</p><p className="muted">Health is derived from runs and events.</p></div></div>
      </Section>
      <Section title="Approval batch" aside={<span className="count-label">{fmt(approvals.length)} open</span>}>
        {approvals.length === 0 ? <Empty title="Queue clear" body="New approval requests will appear here." /> : <div className="stack">{approvals.map((a: AnyData) => <article className="approval" key={a.approval_id}><div><Status value={a.kind} /><h3>{a.question}</h3><p>{when(a.created_at)}</p></div><div className="approval-actions">{(Array.isArray(a.options) ? a.options : []).map((option: string) => <button key={option} onClick={() => resolve.mutate({ id: a.approval_id, answer: option })}>{option}</button>)}</div></article>)}</div>}
      </Section>
    </div>
    <Section title="Ask the ledger" aside={<span className="source-note">Deterministic routing</span>} className="ask-section">
      <form className="ask-form" onSubmit={submitAsk}><Icon name="search" /><input aria-label="Ask the ledger" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. How many applications are blocked?" /><button type="submit" disabled={ask.isPending}>{ask.isPending ? "Checking…" : "Ask"}</button></form>
      {ask.isError && <p className="inline-error">Ledger unavailable. Try again.</p>}
      {answer && <div className="answer"><p>{String(answer.answer ?? "No answer returned.")}</p><small>Sources: {(answer.sources ?? []).join(", ") || "routing dictionary"}</small></div>}
      {!answer && <div className="query-hints"><button onClick={() => { setQuestion("Show application totals"); ask.mutate("Show application totals"); }}>Applications</button><button onClick={() => { setQuestion("Any blockers?"); ask.mutate("Any blockers?"); }}>Blockers</button><button onClick={() => { setQuestion("Token usage"); ask.mutate("Token usage"); }}>Tokens</button><button onClick={() => { setQuestion("System health"); ask.mutate("System health"); }}>Health</button></div>}
    </Section>
  </>;
}

function Applications({ data, onRefresh, refreshing }: { data: AnyData; onRefresh: () => void; refreshing: boolean }) {
  const c = data.counts ?? { by_state: {} }; const ledger = Array.isArray(data.ledger) ? data.ledger : [];
  const [filter, setFilter] = useState("all"); const [search, setSearch] = useState("");
  const shown = useMemo(() => ledger.filter((a: AnyData) => (filter === "all" || a.state === filter) && `${a.company} ${a.role} ${a.app_id}`.toLowerCase().includes(search.toLowerCase())), [ledger, filter, search]);
  const states = ["all", ...Array.from(new Set(ledger.map((a: AnyData) => String(a.state))))];
  return <>
    <div className="page-lead"><div><p className="eyebrow">Application ledger</p><h1>Today Applied · Chicago time</h1><p>Exact state, evidence, and resume attribution.</p></div><RefreshButton onClick={onRefresh} active={refreshing} /></div>
    <div className="kpi-band kpi-band-wide"><Kpi hero label="Today applied" value={c.today_applied} note="America/Chicago" /><Kpi label="Total applications" value={c.total} /><Kpi label="Submitted" value={c.by_state?.submitted} /><Kpi label="Blocked" value={c.by_state?.blocked} /><Kpi label="Rejected" value={c.by_state?.rejected} /><Kpi label="Parked" value={c.by_state?.parked} /><Kpi label="Submitted · 7 days" value={c.submitted_7d} /><Kpi label="Submitted · 30 days" value={c.submitted_30d} /></div>
    <Section title="Applications" aside={<span className="count-label">{fmt(shown.length)} rows</span>}>
      <div className="filters"><label><span>Search</span><input aria-label="Search applications" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Company, role, or ID" /></label><label><span>State</span><select aria-label="Filter by application state" value={filter} onChange={(e) => setFilter(e.target.value)}>{states.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select></label></div>
      {shown.length === 0 ? <Empty title={ledger.length ? "No matches" : "No applications yet"} body={ledger.length ? "Adjust the search or state filter." : "Claimed postings will appear here with their state history."} /> : <div className="ledger">{shown.map((a: AnyData) => <article className="ledger-row application-row" key={a.app_id}>
        <div className="ledger-main"><div><h3>{a.role}</h3><p>{a.company}</p></div><Status value={a.state} /></div>
        <div className="ledger-meta"><span>{a.campaign_id}</span><code>{a.app_id}</code><span>{when(a.updated_at)}</span></div>
        <div className="evidence-grid">
          <div className="evidence-cell"><span>Resume used</span>{a.resume_path ? <><WorkspaceFileButton fileRef={{ app_id: String(a.app_id), kind: "resume" }} label={fileName(String(a.resume_path))} displayName={fileName(String(a.resume_path))} />{a.variant_id && <small>{a.variant_id}</small>}{a.resume_hash && <code title={String(a.resume_hash)}>{String(a.resume_hash).slice(0, 12)}…</code>}</> : <b>Not recorded</b>}</div>
          <div className="evidence-cell"><span>Screenshot</span>{a.screenshot_path && a.screenshot_exists ? <ScreenshotEvidence appId={String(a.app_id)} path={String(a.screenshot_path)} /> : <b className="evidence-missing">not captured</b>}</div>
        </div>
        {a.confirmation && <blockquote className="confirmation">“{a.confirmation}”{a.confirmation_path && <small>{fileName(String(a.confirmation_path))}</small>}</blockquote>}
        {a.blocker && <p className="blocker">{a.blocker}</p>}
        {a.url && <a className="text-link" href={a.url} target="_blank" rel="noreferrer">Open posting <Icon name="external" size={14} /></a>}
      </article>)}</div>}
    </Section>
  </>;
}

function Resumes({ data, onRefresh, refreshing }: { data: AnyData; onRefresh: () => void; refreshing: boolean }) {
  const resumes = Array.isArray(data.resumes) ? data.resumes : [];
  const totalUses = resumes.reduce((sum: number, resume: AnyData) => sum + Number(resume.exact_usage ?? 0), 0);
  return <>
    <div className="page-lead"><div><p className="eyebrow">Resume library</p><h1>Files that actually ship</h1><p>Open the source PDF and trace exact application usage.</p></div><RefreshButton onClick={onRefresh} active={refreshing} /></div>
    <div className="kpi-band"><Kpi hero label="Resume variants" value={resumes.length} note="Registered PDFs" /><Kpi label="Exact usage" value={totalUses} /><Kpi label="Used variants" value={resumes.filter((r: AnyData) => Number(r.exact_usage ?? 0) > 0).length} /><Kpi label="Unused variants" value={resumes.filter((r: AnyData) => Number(r.exact_usage ?? 0) === 0).length} /></div>
    <Section title="Resume files" aside={<span className="count-label">{fmt(resumes.length)} files</span>}>
      {resumes.length === 0 ? <Empty title="No resume variants" body="Imported resume variants will appear here with exact usage counts." /> : <div className="resume-list">{resumes.map((r: AnyData) => <article key={r.variant_id} className="resume-row"><div><h3>{r.variant_id}</h3><p>{r.role_family} · {fmt(r.exact_usage)} uses · {Math.round(Number(r.approval_rate ?? 0) * (Number(r.approval_rate ?? 0) <= 1 ? 100 : 1))}% approval</p><code className="resume-path">{r.path}</code></div><WorkspaceFileButton fileRef={{ variant_id: String(r.variant_id) }} label="Open PDF" displayName={fileName(String(r.path))} /></article>)}</div>}
    </Section>
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

function Runs({ data, onRefresh, refreshing }: { data: AnyData; onRefresh: () => void; refreshing: boolean }) {
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const [dateRange, setDateRange] = useState<DateRange>({ preset: "all", start: "", end: "" });
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
              <div className="status-pair" role="cell" data-label="Status"><Status value={r.status} /><Status value={r.drift} /></div>
              <div className={`token-usage-cell ${r.tokens_reported === true ? "" : "unreported"}`} role="cell" data-label="Token usage" title={usageTitle}>{r.tokens_reported === true ? <><strong>{compactTokens(r.tokens_total)}</strong><span>in {compactTokens(r.tokens_input)} · out {compactTokens(r.tokens_output)}</span>{stages.length > 0 && <details><summary>Stage breakdown</summary><div>{stages.map(([stage, value]) => <span key={stage}>{titleCase(stage)} <b>{compactTokens(value)}</b></span>)}</div></details>}</> : <strong aria-label="Usage not reported">—</strong>}</div>
            </article>;
          })}</div>
          <div className="runs-total-row" role="row" title={totalsTitle}><strong role="cell">Total {hasUnreported && <small>(reported runs only)</small>}</strong><span role="cell">Input <b>{compactTokens(totals.input)}</b></span><span role="cell">Output <b>{compactTokens(totals.output)}</b></span><span role="cell">Total <b>{compactTokens(totals.total)}</b></span></div>
        </div>
        {daily.size > 0 && <div className="daily-token-rollup" aria-label="Token usage by day in America Chicago time">{Array.from(daily.values()).map((day, index) => <span key={`${day.label}-${index}`}>{day.label} <b>{compactTokens(day.total)}</b></span>)}</div>}
      </>}
    </Section>
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
  const chicagoWhen = (value: unknown) => {
    if (!value) return "—";
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(date);
  };
  const toggleReason = (replyId: string) => setExpanded((previous) => {
    const next = new Set(previous); if (next.has(replyId)) next.delete(replyId); else next.add(replyId); return next;
  });
  return <><div className="page-lead"><div><p className="eyebrow">Conversation ledger</p><h1>Replies and outcomes</h1><p>Email and LinkedIn activity in one chronological record.</p></div><RefreshButton onClick={onRefresh} active={refreshing} /></div>
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
        <thead><tr><th>Date</th><th>Channel</th><th>Person / topic</th><th>Action</th><th>Rule</th><th>Reason / source</th></tr></thead>
        <tbody>{visibleReplies.map((reply: AnyData, index: number) => {
          const replyId = String(reply.replyId ?? reply.reply_id ?? `reply-${index}`); const threadId = String(reply.threadId ?? reply.thread_id ?? "");
          const prefix = (threadId.split("|")[0] ?? "").trim().toLowerCase(); const channel = prefix === "linkedin" ? "LinkedIn" : prefix === "email" ? "Email" : titleCase(prefix || "unknown");
          const reason = String(reply.reason ?? "No reason recorded"); const descriptor = ((reason.split(" — ")[0] ?? reason).split(";")[0] ?? reason).trim() || "No descriptor";
          const action = String(reply.action ?? "skipped"); const isExpanded = expanded.has(replyId); const rule = String(reply.ruleId ?? reply.rule_id ?? "—");
          return <tr key={replyId}>
            <td data-label="Date" className="reply-date"><time dateTime={String(reply.at ?? "")}>{chicagoWhen(reply.at)}</time></td>
            <td data-label="Channel"><span className={`channel-pill channel-${prefix === "linkedin" ? "linkedin" : prefix === "email" ? "email" : "other"}`}>{channel}</span></td>
            <td data-label="Person / topic"><span className="reply-topic" title={descriptor}>{descriptor}</span></td>
            <td data-label="Action"><span className={`reply-action action-${action}`}>{action === "auto_sent" ? "Auto-sent" : titleCase(action)}</span></td>
            <td data-label="Rule"><span className="rule-pill">{rule}</span></td>
            <td data-label="Reason / source"><button type="button" className={`reason-toggle ${isExpanded ? "expanded" : ""}`} onClick={() => toggleReason(replyId)} aria-expanded={isExpanded} aria-label={`${isExpanded ? "Collapse" : "Expand"} reason for ${descriptor}`}><span>{reason}</span><small>{isExpanded ? "Show less" : "Show all"}</small></button></td>
          </tr>;
        })}</tbody>
      </table></div>}
    </Section>
  </>;
}


const objectValue = (value: unknown): AnyData => value && typeof value === "object" && !Array.isArray(value) ? value as AnyData : {};
const stringList = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : [];
const csvList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return <label className={`profile-field ${error ? "field-error" : ""}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}{error && <small className="input-error">{error}</small>}</label>;
}

function normalizeProfile(raw: AnyData): AnyData {
  const identity = objectValue(raw.identity); const answers = objectValue(raw.answers); const locations = objectValue(raw.locations);
  const metros = stringList(locations.metros); const remote = String(locations.remote ?? "");
  const priority = stringList(locations.priority);
  if (priority.length === 0) { priority.push(...metros); if (remote === "ok" || remote === "only") priority.push("Remote US"); }
  return {
    ...raw,
    identity: { ...identity, name: String(identity.name ?? ""), email: String(identity.email ?? ""), phone: String(identity.phone ?? ""), location: String(identity.location ?? [identity.city, identity.state].filter(Boolean).join(", ")), linkedin: String(identity.linkedin ?? identity.linkedin_url ?? ""), timezone: String(identity.timezone ?? "America/Chicago") },
    work_auth: { ...objectValue(raw.work_auth), status: String(objectValue(raw.work_auth).status ?? ""), sponsor_required: objectValue(raw.work_auth).sponsor_required === true, h1b_gate: String(objectValue(raw.work_auth).h1b_gate ?? "") },
    role_types: stringList(raw.role_types),
    locations: { ...locations, priority, relocation: String(locations.relocation ?? answers.relocate ?? "") },
    targeting: { ...objectValue(raw.targeting), industries: stringList(objectValue(raw.targeting).industries), seniority: stringList(objectValue(raw.targeting).seniority), tiers: Array.isArray(objectValue(raw.targeting).tiers) ? objectValue(raw.targeting).tiers.map(Number) : [] },
    comp: { ...objectValue(raw.comp), floor: objectValue(raw.comp).floor ?? null, note: String(objectValue(raw.comp).note ?? objectValue(raw.comp).negotiable_answer ?? "") },
    start_date: String(raw.start_date ?? ""),
    answers: { ...answers, relocate: String(answers.relocate ?? ""), covenants: String(answers.covenants ?? answers.restrictive_covenants ?? ""), drivers_license: String(answers.drivers_license ?? ""), degree_dates: String(answers.degree_dates ?? ""), home_zip: String(answers.home_zip ?? ""), work_authorized_us: String(answers.work_authorized_us ?? "") },
    caps: { ...objectValue(raw.caps), per_run: Number(objectValue(raw.caps).per_run ?? 0), per_day: Number(objectValue(raw.caps).per_day ?? 0), appliers: Number(objectValue(raw.caps).appliers ?? 0) },
    reply_tiers: { ...objectValue(raw.reply_tiers), auto_send: stringList(objectValue(raw.reply_tiers).auto_send), draft_for_review: stringList(objectValue(raw.reply_tiers).draft_for_review), never: stringList(objectValue(raw.reply_tiers).never) },
  };
}

const baseAnswers = new Set(["relocate", "covenants", "restrictive_covenants", "drivers_license", "degree_dates", "home_zip", "work_authorized_us"]);

function validateProfile(profile: AnyData): Record<string, string> {
  const errors: Record<string, string> = {}; const required = (path: string, value: unknown) => { if (!String(value ?? "").trim()) errors[path] = "Required"; };
  const identity = objectValue(profile.identity); ["name", "email", "phone", "location", "linkedin", "timezone"].forEach((key) => required(`identity.${key}`, identity[key]));
  if (identity.email && !/^\S+@\S+\.\S+$/.test(String(identity.email))) errors["identity.email"] = "Enter a valid email address";
  if (identity.location && !/^.+,\s*[A-Za-z]{2}$/.test(String(identity.location))) errors["identity.location"] = "Use City, ST so it can sync to YAML";
  try { const url = new URL(String(identity.linkedin)); if (!/^https?:$/.test(url.protocol)) throw new Error(); } catch { if (identity.linkedin) errors["identity.linkedin"] = "Enter a full http(s) URL"; }
  const work = objectValue(profile.work_auth); if (!["H-1B", "H1B", "US citizen", "Green card", "OPT", "STEM OPT", "TN", "EAD"].includes(String(work.status))) errors["work_auth.status"] = "Choose a supported status"; if (!["hard", "soft"].includes(String(work.h1b_gate))) errors["work_auth.h1b_gate"] = "Choose hard or soft";
  const locations = objectValue(profile.locations); if (stringList(locations.priority).length === 0) errors["locations.priority"] = "Add at least one priority"; required("locations.relocation", locations.relocation);
  const targeting = objectValue(profile.targeting); if (stringList(targeting.industries).length === 0) errors["targeting.industries"] = "Add at least one industry"; if (stringList(targeting.seniority).length === 0) errors["targeting.seniority"] = "Add at least one level"; if (!Array.isArray(targeting.tiers) || targeting.tiers.length === 0 || targeting.tiers.some((tier: unknown) => ![1, 2, 3].includes(Number(tier)))) errors["targeting.tiers"] = "Use tiers 1, 2, or 3";
  const caps = objectValue(profile.caps); ["per_run", "per_day", "appliers"].forEach((key) => { if (!Number.isInteger(Number(caps[key])) || Number(caps[key]) < 1) errors[`caps.${key}`] = "Enter an integer of 1 or more"; });
  const answers = objectValue(profile.answers); ["relocate", "covenants", "drivers_license", "degree_dates", "home_zip", "work_authorized_us"].forEach((key) => required(`answers.${key}`, answers[key]));
  required("comp.note", objectValue(profile.comp).note); const floor = objectValue(profile.comp).floor; if (floor !== null && floor !== "" && (!Number.isFinite(Number(floor)) || Number(floor) < 0)) errors["comp.floor"] = "Use a positive number or leave blank";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(profile.start_date ?? "")) || Number.isNaN(new Date(`${String(profile.start_date)}T00:00:00`).getTime())) errors.start_date = "Enter a valid date";
  if (stringList(profile.role_types).length === 0) errors.role_types = "At least one role type is required";
  const reply = objectValue(profile.reply_tiers); if (stringList(reply.auto_send).length === 0 || stringList(reply.auto_send).some((code) => !/^R[1-8]$/.test(code))) errors["reply_tiers.auto_send"] = "Use one or more codes R1–R8"; if (stringList(reply.draft_for_review).length === 0) errors["reply_tiers.draft_for_review"] = "Add at least one tier"; if (stringList(reply.never).length === 0) errors["reply_tiers.never"] = "Add at least one tier";
  return errors;
}

function Profile() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: () => api.profile_get({}), refetchOnMount: "always", staleTime: 0 });
  const [draft, setDraft] = useState<AnyData | null>(null); const [errors, setErrors] = useState<Record<string, string>>({}); const [notice, setNotice] = useState<{ tone: "good" | "warn" | "error"; text: string } | null>(null);
  const current = draft ?? (profileQuery.data?.profile ? normalizeProfile(profileQuery.data.profile as AnyData) : null);
  const save = useMutation({
    mutationFn: (profile: AnyData) => api.profile_save(profile as Parameters<typeof api.profile_save>[0]),
    onSuccess: (result) => {
      if (!result.ok) { setErrors(result.field ? { [result.field]: result.message } : {}); setNotice({ tone: "error", text: `${titleCase(result.step)} failed: ${result.message}` }); return; }
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
  return <form className="profile-page" onSubmit={submit} noValidate>
    <div className="page-lead"><div><p className="eyebrow">Run configuration</p><h1>Profile</h1><p>Edit once here. Saving updates the live profile and its readable YAML source together.</p></div><button className="save-profile top-save" type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save profile"}</button></div>
    {notice && <div className={`save-notice ${notice.tone}`} role="status">{notice.text}</div>}
    <div className="profile-grid">
      <Section title="Identity" className="profile-section"><div className="field-grid"><Field label="Name" error={errors["identity.name"]}><input value={identity.name} onChange={(e) => update("identity", "name", e.target.value)} /></Field><Field label="Email" error={errors["identity.email"]}><input type="email" value={identity.email} onChange={(e) => update("identity", "email", e.target.value)} /></Field><Field label="Phone" error={errors["identity.phone"]}><input type="tel" value={identity.phone} onChange={(e) => update("identity", "phone", e.target.value)} /></Field><Field label="Location" hint="City, ST" error={errors["identity.location"]}><input value={identity.location} onChange={(e) => update("identity", "location", e.target.value)} /></Field><Field label="LinkedIn" error={errors["identity.linkedin"]}><input type="url" value={identity.linkedin} onChange={(e) => update("identity", "linkedin", e.target.value)} /></Field><Field label="Timezone" error={errors["identity.timezone"]}><input value={identity.timezone} onChange={(e) => update("identity", "timezone", e.target.value)} /></Field></div></Section>
      <Section title="Work authorization" className="profile-section"><div className="field-grid"><Field label="Status" error={errors["work_auth.status"]}><select value={work.status} onChange={(e) => update("work_auth", "status", e.target.value)}>{["H-1B", "H1B", "US citizen", "Green card", "OPT", "STEM OPT", "TN", "EAD"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Sponsor required"><select value={work.sponsor_required ? "true" : "false"} onChange={(e) => update("work_auth", "sponsor_required", e.target.value === "true")}><option value="true">Yes</option><option value="false">No</option></select></Field><Field label="H-1B gate" error={errors["work_auth.h1b_gate"]}><select value={work.h1b_gate} onChange={(e) => update("work_auth", "h1b_gate", e.target.value)}><option value="soft">Soft</option><option value="hard">Hard</option></select></Field></div></Section>
      <Section title="Run caps" className="profile-section"><div className="field-grid three"><Field label="Per run" error={errors["caps.per_run"]}><input type="number" min="1" value={caps.per_run} onChange={(e) => update("caps", "per_run", Number(e.target.value))} /></Field><Field label="Per day" error={errors["caps.per_day"]}><input type="number" min="1" value={caps.per_day} onChange={(e) => update("caps", "per_day", Number(e.target.value))} /></Field><Field label="Appliers" error={errors["caps.appliers"]}><input type="number" min="1" value={caps.appliers} onChange={(e) => update("caps", "appliers", Number(e.target.value))} /></Field></div></Section>
      <Section title="Targeting" className="profile-section"><div className="field-grid"><Field label="Industries" hint="Comma separated" error={errors["targeting.industries"]}><input value={stringList(targeting.industries).join(", ")} onChange={(e) => update("targeting", "industries", csvList(e.target.value))} /></Field><Field label="Seniority" hint="junior, mid, senior, staff, architect, principal, lead, director" error={errors["targeting.seniority"]}><input value={stringList(targeting.seniority).join(", ")} onChange={(e) => update("targeting", "seniority", csvList(e.target.value))} /></Field><Field label="Tiers" hint="1, 2, or 3" error={errors["targeting.tiers"]}><input value={(Array.isArray(targeting.tiers) ? targeting.tiers : []).join(", ")} onChange={(e) => update("targeting", "tiers", csvList(e.target.value).map(Number))} /></Field></div></Section>
      <Section title="Locations" className="profile-section"><div className="field-grid"><Field label="Priority list" hint="Comma separated; use City, ST, Remote US, or US-wide onsite" error={errors["locations.priority"]}><input value={stringList(locations.priority).join(", ")} onChange={(e) => update("locations", "priority", csvList(e.target.value))} /></Field><Field label="Relocation" error={errors["locations.relocation"]}><input value={locations.relocation} onChange={(e) => update("locations", "relocation", e.target.value)} /></Field></div></Section>
      <Section title="Compensation & start" className="profile-section"><div className="field-grid"><Field label="Comp floor" hint="Leave blank for no floor" error={errors["comp.floor"]}><input inputMode="numeric" value={comp.floor ?? ""} onChange={(e) => update("comp", "floor", e.target.value)} /></Field><Field label="Comp note" error={errors["comp.note"]}><input value={comp.note} onChange={(e) => update("comp", "note", e.target.value)} /></Field><Field label="Start date" error={errors.start_date}><input type="date" value={current.start_date} onChange={(e) => updateRoot("start_date", e.target.value)} /></Field></div></Section>
      <Section title="Screening answers" aside={<button type="button" onClick={addAnswer}>Add answer</button>} className="profile-section profile-wide"><div className="field-grid">{[["relocate", "Relocate"], ["covenants", "Restrictive covenants"], ["drivers_license", "Driver’s license"], ["degree_dates", "Degree dates"], ["home_zip", "Home ZIP"], ["work_authorized_us", "Work authorized in US"]].map(([key = "", label = ""]) => <Field key={key} label={label} error={errors[`answers.${key}`]}><input value={String(answers[key] ?? "")} onChange={(e) => update("answers", key, e.target.value)} /></Field>)}{extras.map(([key, value]) => <div className="extra-answer" key={key}><Field label="Answer key"><input defaultValue={key} onBlur={(e) => renameAnswer(key, e.target.value)} /></Field><Field label="Value"><input value={String(value ?? "")} onChange={(e) => update("answers", key, e.target.value)} /></Field><button type="button" aria-label={`Remove ${key}`} onClick={() => { const next = { ...answers }; delete next[key]; setDraft({ ...current, answers: next }); }}>Remove</button></div>)}</div></Section>
      <Section title="Reply tiers" className="profile-section"><div className="field-grid"><Field label="Auto-send" hint="R1–R8, comma separated" error={errors["reply_tiers.auto_send"]}><input value={stringList(reply.auto_send).join(", ")} onChange={(e) => update("reply_tiers", "auto_send", csvList(e.target.value))} /></Field><Field label="Draft for review" error={errors["reply_tiers.draft_for_review"]}><input value={stringList(reply.draft_for_review).join(", ")} onChange={(e) => update("reply_tiers", "draft_for_review", csvList(e.target.value))} /></Field><Field label="Never" error={errors["reply_tiers.never"]}><input value={stringList(reply.never).join(", ")} onChange={(e) => update("reply_tiers", "never", csvList(e.target.value))} /></Field></div></Section>
      <Section title="Role types" aside={<span className="source-note">Read only</span>} className="profile-section"><div className="readonly-list">{stringList(current.role_types).map((value) => <Status key={value} value={value} />)}</div>{errors.role_types && <p className="inline-error">{errors.role_types}</p>}</Section>
    </div>
    <div className="save-bar"><div><b>Ready for the next run</b><span>{profileQuery.data?.updated_at ? `Last saved ${when(profileQuery.data.updated_at)}` : "Not saved yet"}</span></div><button className="save-profile" type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save profile"}</button></div>
  </form>;
}

function RefreshButton({ onClick, active }: { onClick: () => void; active: boolean }) { return <button className="refresh" onClick={onClick} disabled={active} aria-label="Refresh current dashboard"><Icon name="refresh" /><span>{active ? "Refreshing" : "Refresh"}</span></button>; }

export function App() {
  const [active, setActive] = useState<Tab>("overview"); const queryClient = useQueryClient();
  const snapshotView = active === "profile" ? "overview" : active;
  const snapshot = useQuery({ queryKey: ["snapshot", active], queryFn: () => api.snapshot({ view: snapshotView }), refetchOnMount: "always", staleTime: 0, enabled: active !== "profile" });
  const data = (snapshot.data?.data ?? {}) as AnyData;
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["snapshot", active] }); void snapshot.refetch(); };
  return <div className="app-shell"><SafeAreaTopScrim backgroundColor="var(--bg)" /><aside className="rail" aria-label="Dashboard navigation"><div className="rail-mark"><span /><span /></div><nav>{tabs.map((tab) => <button key={tab.id} className={active === tab.id ? "active" : ""} onClick={() => setActive(tab.id)} aria-current={active === tab.id ? "page" : undefined}><Icon name={tab.icon} /><span>{tab.label}</span></button>)}</nav><div className="rail-foot"><span className="live-dot">Private</span></div></aside>
    <main className="workspace">
      {active === "profile" ? <Profile /> : snapshot.isPending ? <div className="loading"><span /><p>Reading {active} ledger…</p></div> : snapshot.isError ? <div className="error-screen"><div className="health-orb"><Icon name="shield" size={28} /></div><h1>Source unavailable</h1><p>The {active} snapshot could not be read.</p><button onClick={() => snapshot.refetch()}>Retry</button></div> : <>{active === "overview" && <Overview data={data} onRefresh={refresh} refreshing={snapshot.isFetching} />}{active === "applications" && <Applications data={data} onRefresh={refresh} refreshing={snapshot.isFetching} />}{active === "resumes" && <Resumes data={data} onRefresh={refresh} refreshing={snapshot.isFetching} />}{active === "runs" && <Runs data={data} onRefresh={refresh} refreshing={snapshot.isFetching} />}{active === "replies" && <Replies data={data} onRefresh={refresh} refreshing={snapshot.isFetching} />}</>}
      {active !== "profile" && snapshot.data && <p className="freshness">Snapshot {when(snapshot.data.generated_at)}</p>}
    </main>
    <nav className="bottom-nav" aria-label="Dashboard navigation">{tabs.map((tab) => <button key={tab.id} className={active === tab.id ? "active" : ""} onClick={() => setActive(tab.id)} aria-current={active === tab.id ? "page" : undefined}><Icon name={tab.icon} /><span>{tab.label}</span></button>)}</nav>
  </div>;
}
