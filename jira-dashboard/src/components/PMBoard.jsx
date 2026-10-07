import React, { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  LayoutDashboard,
  ListChecks,
  Calendar,
  Save,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";
import JiraDashboard from "./JiraDashboard";

const STAGES = ["Initiative", "Study", "Execution", "Hypercare"];
const RAGS = ["Green", "Amber", "Red"];
const PHASE_STATUS = ["To be started", "Ongoing", "Delay", "Completed"];
const PENTEST_STATUS = ["To be planned", "Planned", "Ongoing", "Completed"];

const inputClass =
  "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white text-slate-700";
const labelClass = "block text-xs font-medium text-slate-500 mb-1";

let idCounter = 1;
function uid() {
  idCounter += 1;
  return `id-${Date.now()}-${idCounter}`;
}

function fmt(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function emptyPhase() {
  return { deadline: "", status: "To be started", notes: "" };
}

function emptyProject() {
  return {
    id: uid(),
    name: "",
    goLive: "",
    stage: "Initiative",
    rag: "Green",
    phases: {
      hlbrs: emptyPhase(),
      usDefinition: emptyPhase(),
      developments: emptyPhase(),
      qa: emptyPhase(),
      goLivePhase: { status: "To be started", notes: "" },
    },
    penTest: { enabled: false, startDate: "", status: "To be planned", notes: "" },
    openPoints: [],
  };
}

function seedProjects() {
  return [
    {
      id: uid(),
      name: "CSDR Penalties Automation",
      goLive: "2026-03-16",
      stage: "Execution",
      rag: "Amber",
      phases: {
        hlbrs: { deadline: "2025-10-15", status: "Completed", notes: "Signed off by Compliance" },
        usDefinition: { deadline: "2025-11-20", status: "Completed", notes: "" },
        developments: { deadline: "2026-01-30", status: "Ongoing", notes: "Backend 70% done" },
        qa: { deadline: "2026-02-20", status: "To be started", notes: "" },
        goLivePhase: { status: "To be started", notes: "" },
      },
      penTest: { enabled: false, startDate: "", status: "To be planned", notes: "" },
      openPoints: [
        { id: uid(), text: "Align with Compliance on penalty calculation formula" },
        { id: uid(), text: "Confirm infra sizing for prod with IT" },
      ],
    },
    {
      id: uid(),
      name: "T+1 Settlement Readiness",
      goLive: "2026-06-30",
      stage: "Study",
      rag: "Green",
      phases: {
        hlbrs: { deadline: "2025-12-05", status: "Ongoing", notes: "" },
        usDefinition: { deadline: "2026-01-15", status: "To be started", notes: "" },
        developments: { deadline: "2026-03-30", status: "To be started", notes: "" },
        qa: { deadline: "2026-05-10", status: "To be started", notes: "" },
        goLivePhase: { status: "To be started", notes: "" },
      },
      penTest: { enabled: true, startDate: "2026-05-20", status: "Planned", notes: "" },
      openPoints: [],
    },
    {
      id: uid(),
      name: "Tax Reporting Platform Revamp",
      goLive: "2025-11-10",
      stage: "Hypercare",
      rag: "Red",
      phases: {
        hlbrs: { deadline: "2025-05-10", status: "Completed", notes: "" },
        usDefinition: { deadline: "2025-06-15", status: "Completed", notes: "" },
        developments: { deadline: "2025-08-20", status: "Completed", notes: "" },
        qa: { deadline: "2025-09-30", status: "Delay", notes: "Regression failures on report #4" },
        goLivePhase: { status: "Completed", notes: "" },
      },
      penTest: { enabled: true, startDate: "2025-09-25", status: "Completed", notes: "" },
      openPoints: [{ id: uid(), text: "Hypercare incident #112 still open with vendor" }],
    },
  ];
}

function Logo() {
  const bars = [
    { h: 14, c: "#9fd1e6" },
    { h: 22, c: "#5fb0d6" },
    { h: 29, c: "#1f93b0" },
    { h: 33, c: "#13907a" },
    { h: 25, c: "#3fae55" },
    { h: 17, c: "#8ecf4e" },
  ];
  return (
    <div className="flex items-center gap-2.5">
      <svg width="38" height="40" viewBox="0 0 38 40">
        {bars.map((b, i) => {
          const x = 1 + i * 6;
          const y = 36 - b.h;
          return <rect key={i} x={x} y={y} width={4} height={b.h} rx={1} fill={b.c} />;
        })}
      </svg>
      <div className="leading-tight">
        <div className="font-extrabold text-slate-800 text-sm md:text-base tracking-wide">
          EURONEXT
        </div>
        <div className="font-semibold text-slate-400 text-[9px] md:text-[10px] tracking-[0.18em]">
          SECURITIES
        </div>
      </div>
    </div>
  );
}

function ragColor(rag) {
  if (rag === "Green") return "bg-emerald-500";
  if (rag === "Amber") return "bg-amber-400";
  return "bg-rose-500";
}

function RagDot({ rag, size = "md" }) {
  const s = size === "lg" ? "w-4 h-4" : "w-2.5 h-2.5";
  return <span className={`inline-block rounded-full ${s} ${ragColor(rag)} ring-2 ring-white shadow-sm`} />;
}

function stageStyle(stage) {
  switch (stage) {
    case "Initiative":
      return "bg-indigo-50 text-indigo-700 border border-indigo-100";
    case "Study":
      return "bg-sky-50 text-sky-700 border border-sky-100";
    case "Execution":
      return "bg-violet-50 text-violet-700 border border-violet-100";
    case "Hypercare":
      return "bg-teal-50 text-teal-700 border border-teal-100";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function StageBadge({ stage }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${stageStyle(stage)}`}>
      {stage}
    </span>
  );
}

function statusStyle(status) {
  switch (status) {
    case "Completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Ongoing":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Delay":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "Planned":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "To be started":
    case "To be planned":
    default:
      return "bg-slate-100 text-slate-500 border-slate-200";
  }
}

function StatusPill({ status }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyle(status)} whitespace-nowrap`}>
      {status}
    </span>
  );
}

function OpenPoints({ points, onChange }) {
  const [draft, setDraft] = useState("");

  function add() {
    if (!draft.trim()) return;
    onChange([...points, { id: uid(), text: draft.trim() }]);
    setDraft("");
  }
  function remove(id) {
    onChange(points.filter((p) => p.id !== id));
  }
  function updateText(id, text) {
    onChange(points.map((p) => (p.id === id ? { ...p, text } : p)));
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ListChecks size={16} className="text-slate-400" />
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Open Points</h4>
      </div>
      <div className="space-y-2 mb-3">
        {points.length === 0 && (
          <p className="text-xs text-slate-400 italic">No open points yet.</p>
        )}
        {points.map((pt) => (
          <div key={pt.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <input
              value={pt.text}
              onChange={(e) => updateText(pt.id, e.target.value)}
              className="flex-1 text-sm text-slate-600 bg-transparent outline-none"
            />
            <button onClick={() => remove(pt.id)} className="text-slate-300 hover:text-rose-500">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a discussion point for the next alignment..."
          className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40 bg-white"
        />
        <button
          onClick={add}
          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium flex items-center gap-1 shrink-0"
        >
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
}

function progressOf(p) {
  const statuses = [
    p.phases.hlbrs.status,
    p.phases.usDefinition.status,
    p.phases.developments.status,
    p.phases.qa.status,
  ];
  if (p.penTest.enabled) statuses.push(p.penTest.status);
  statuses.push(p.phases.goLivePhase.status);
  const completed = statuses.filter((s) => s === "Completed").length;
  return Math.round((completed / statuses.length) * 100);
}

function ProjectCard({ project, onEdit, onDeleteRequest, onOpenPointsChange }) {
  const rows = [
    { key: "hlbrs", label: "HLBRs", deadline: project.phases.hlbrs.deadline, status: project.phases.hlbrs.status, notes: project.phases.hlbrs.notes },
    { key: "usDefinition", label: "US Definition", deadline: project.phases.usDefinition.deadline, status: project.phases.usDefinition.status, notes: project.phases.usDefinition.notes },
    { key: "developments", label: "Developments", deadline: project.phases.developments.deadline, status: project.phases.developments.status, notes: project.phases.developments.notes },
    { key: "qa", label: "QA", deadline: project.phases.qa.deadline, status: project.phases.qa.status, notes: project.phases.qa.notes },
  ];
  if (project.penTest.enabled) {
    rows.push({
      key: "penTest",
      label: "Penetration Tests",
      deadline: project.penTest.startDate,
      status: project.penTest.status,
      notes: project.penTest.notes,
    });
  }
  rows.push({
    key: "goLivePhase",
    label: "Go-Live",
    deadline: project.goLive,
    status: project.phases.goLivePhase.status,
    notes: project.phases.goLivePhase.notes,
  });

  const progress = progressOf(project);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <RagDot rag={project.rag} size="lg" />
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-base md:text-lg truncate">{project.name}</h3>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} /> Go-Live: {fmt(project.goLive)}
              </span>
              <StageBadge stage={project.stage} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 w-32">
            <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-slate-400 w-8 text-right">{progress}%</span>
          </div>
          <button
            onClick={() => onEdit(project)}
            title="Edit project"
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDeleteRequest(project.id)}
            title="Delete project"
            className="p-2 rounded-lg hover:bg-rose-100 text-rose-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-slate-50/60 text-slate-400 text-[11px] uppercase tracking-wide">
              <th className="text-left px-5 py-2 font-semibold">Phase</th>
              <th className="text-left px-5 py-2 font-semibold">Deadline</th>
              <th className="text-left px-5 py-2 font-semibold">Status</th>
              <th className="text-left px-5 py-2 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-700 whitespace-nowrap">{row.label}</td>
                <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{fmt(row.deadline)}</td>
                <td className="px-5 py-3">
                  <StatusPill status={row.status} />
                </td>
                <td className="px-5 py-3 text-slate-500 max-w-xs truncate" title={row.notes}>
                  {row.notes || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
        <OpenPoints
          points={project.openPoints}
          onChange={(points) => onOpenPointsChange(project.id, points)}
        />
      </div>
    </div>
  );
}

function PhaseField({ label, data, onChange, showDate = true, dateLabel = "Deadline", statusOptions, extraDateDisplay }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border border-slate-200 rounded-xl p-3 bg-slate-50/60">
      <div className="md:col-span-3 font-semibold text-sm text-slate-700 md:pt-2">{label}</div>
      <div className="md:col-span-3">
        <label className={labelClass}>{dateLabel}</label>
        {showDate ? (
          <input
            type="date"
            value={data.deadline || data.startDate || ""}
            onChange={(e) =>
              onChange({
                ...data,
                [data.startDate !== undefined ? "startDate" : "deadline"]: e.target.value,
              })
            }
            className={inputClass}
          />
        ) : (
          <div className="text-sm text-slate-400 italic md:pt-2">{extraDateDisplay}</div>
        )}
      </div>
      <div className="md:col-span-3">
        <label className={labelClass}>Status</label>
        <select
          value={data.status}
          onChange={(e) => onChange({ ...data, status: e.target.value })}
          className={inputClass}
        >
          {statusOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-3">
        <label className={labelClass}>Notes</label>
        <input
          type="text"
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          placeholder="Optional comment..."
          className={inputClass}
        />
      </div>
    </div>
  );
}

function ProjectForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() =>
    initial ? JSON.parse(JSON.stringify(initial)) : emptyProject()
  );

  function updatePhase(key, value) {
    setForm((f) => ({ ...f, phases: { ...f.phases, [key]: value } }));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    onSave(form);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 z-50 flex items-start md:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">
            {initial ? "Edit Project" : "New Project"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Project Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. T2S Settlement Upgrade"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Go-Live (target date)</label>
              <input
                type="date"
                value={form.goLive}
                onChange={(e) => setForm({ ...form, goLive: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Status (Stage)</label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className={inputClass}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>RAG</label>
              <div className="flex gap-2">
                {RAGS.map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setForm({ ...form, rag: r })}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition ${
                      form.rag === r
                        ? "border-slate-700 bg-slate-800 text-white"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${ragColor(r)}`} />
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            Phases Tracking
          </h4>

          <PhaseField
            label="HLBRs"
            data={form.phases.hlbrs}
            onChange={(v) => updatePhase("hlbrs", v)}
            statusOptions={PHASE_STATUS}
          />
          <PhaseField
            label="US Definition"
            data={form.phases.usDefinition}
            onChange={(v) => updatePhase("usDefinition", v)}
            statusOptions={PHASE_STATUS}
          />
          <PhaseField
            label="Developments"
            data={form.phases.developments}
            onChange={(v) => updatePhase("developments", v)}
            statusOptions={PHASE_STATUS}
          />
          <PhaseField
            label="QA"
            data={form.phases.qa}
            onChange={(v) => updatePhase("qa", v)}
            statusOptions={PHASE_STATUS}
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="pentest-toggle"
              checked={form.penTest.enabled}
              onChange={(e) =>
                setForm({ ...form, penTest: { ...form.penTest, enabled: e.target.checked } })
              }
              className="w-4 h-4 accent-emerald-600"
            />
            <label htmlFor="pentest-toggle" className="text-sm text-slate-600">
              Include <span className="font-medium">Penetration Tests</span> phase (shown between QA and Go-Live)
            </label>
          </div>

          {form.penTest.enabled && (
            <PhaseField
              label="Penetration Tests"
              data={form.penTest}
              onChange={(v) => setForm({ ...form, penTest: v })}
              dateLabel="Start Date"
              statusOptions={PENTEST_STATUS}
            />
          )}

          <PhaseField
            label="Go-Live"
            data={form.phases.goLivePhase}
            onChange={(v) => updatePhase("goLivePhase", v)}
            showDate={false}
            extraDateDisplay={fmt(form.goLive) + " (from Go-Live target above)"}
            statusOptions={PHASE_STATUS}
          />
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-200 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-2"
          >
            <Save size={16} /> Save Project
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3 text-rose-500">
          <AlertTriangle size={22} />
          <h3 className="font-bold text-slate-800 text-base">Delete project?</h3>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          This action cannot be undone. All tracking data and open points for this project will be removed.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardView() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <JiraDashboard />
    </div>
  );
}

function Sidebar({ view, setView, projects }) {
  const ragCounts = { Green: 0, Amber: 0, Red: 0 };
  projects.forEach((p) => (ragCounts[p.rag] = (ragCounts[p.rag] || 0) + 1));

  return (
    <div className="sticky top-6 space-y-4">
      <button
        onClick={() => setView(view === "dashboard" ? "projects" : "dashboard")}
        className="w-full text-left bg-white rounded-2xl border-2 border-emerald-200 shadow-sm p-7 hover:shadow-md hover:border-emerald-400 hover:bg-emerald-50/40 transition"
      >
        <div className="flex items-center gap-2.5 text-emerald-700 mb-2">
          <LayoutDashboard size={22} />
          <span className="font-bold text-base">
            {view === "dashboard" ? "Back to Projects" : "Focus on project status"}
          </span>
        </div>
        <p className="text-sm text-emerald-600/80 leading-relaxed">
          {view === "dashboard"
            ? "Return to the project tracking boards"
            : "View Epic status update for a specific project"}
        </p>
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Quick Overview</h4>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Projects</span>
          <span className="font-bold text-slate-700">{projects.length}</span>
        </div>
        {RAGS.map((r) => (
          <div key={r} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-500">
              <span className={`w-2.5 h-2.5 rounded-full ${ragColor(r)}`} /> {r}
            </span>
            <span className="font-bold text-slate-700">{ragCounts[r] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PMBoard() {
  const [projects, setProjects] = useState(() => []);
  const [view, setView] = useState("projects");
  const [modal, setModal] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  function openNew() {
    setModal({ mode: "new" });
  }
  function openEdit(project) {
    setModal({ mode: "edit", project });
  }
  function closeModal() {
    setModal(null);
  }

  function saveProject(data) {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === data.id);
      return exists ? prev.map((p) => (p.id === data.id ? data : p)) : [...prev, data];
    });
  }

  function updateOpenPoints(id, points) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, openPoints: points } : p)));
  }

  function confirmDelete() {
    setProjects((prev) => prev.filter((p) => p.id !== deletingId));
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="hidden sm:block w-px h-10 bg-slate-200" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                Euronext Securities, PM Board
              </h1>
              <p className="text-sm text-slate-400 font-medium">Fiscal Services</p>
            </div>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-emerald-600/20 transition"
          >
            <Plus size={16} /> New Project
          </button>
        </div>
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-300 via-teal-500 to-emerald-500" />
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 flex flex-col lg:flex-row gap-6">
        <main className="flex-1 min-w-0 space-y-6">
          {view === "projects" ? (
            <>
              {projects.length === 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                  <FolderOpen className="mx-auto text-slate-300 mb-3" size={40} />
                  <p className="text-slate-500 mb-4">No projects yet. Start tracking your first one.</p>
                  <button
                    onClick={openNew}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
                  >
                    <Plus size={16} /> Create your first project
                  </button>
                </div>
              )}
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onEdit={openEdit}
                  onDeleteRequest={setDeletingId}
                  onOpenPointsChange={updateOpenPoints}
                />
              ))}
            </>
          ) : (
            <DashboardView />
          )}
        </main>

        <aside className="w-full lg:w-80 shrink-0">
          <Sidebar view={view} setView={setView} projects={projects} />
        </aside>
      </div>

      <footer className="max-w-screen-2xl mx-auto px-6 pb-10">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-6 flex-wrap">
          <span className="font-semibold text-slate-700 text-sm">RAG Legend:</span>
          <span className="flex items-center gap-2 text-sm text-slate-500">
            <span className="w-3 h-3 rounded-full bg-emerald-500" /> Green = On track
          </span>
          <span className="flex items-center gap-2 text-sm text-slate-500">
            <span className="w-3 h-3 rounded-full bg-amber-400" /> Amber = Minor Delay
          </span>
          <span className="flex items-center gap-2 text-sm text-slate-500">
            <span className="w-3 h-3 rounded-full bg-rose-500" /> Red = Major Delay
          </span>
        </div>
      </footer>

      {modal && (
        <ProjectForm
          initial={modal.mode === "edit" ? modal.project : null}
          onSave={saveProject}
          onClose={closeModal}
        />
      )}

      {deletingId && (
        <DeleteConfirm onCancel={() => setDeletingId(null)} onConfirm={confirmDelete} />
      )}
    </div>
  );
}
