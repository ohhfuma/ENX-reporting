import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
  Upload, RefreshCw, Settings2, Search, CheckCircle2,
  Circle, FileSpreadsheet, Layers, Target, ListChecks, AlertTriangle,
  ChevronRight, ChevronDown, Info, X, AlertCircle, Calendar, ExternalLink,
  HelpCircle, Mail, Copy, Check, Send
} from 'lucide-react';

const CANDIDATES = {
  key: ['issue key', 'key'],
  issueType: ['issue type', 'tipo', 'type'],
  status: ['status', 'stato'],
  storyPoints: [
    'custom field (story points)', 'story points', 'story point estimate',
    'custom field (story point estimate)', 'story point'
  ],
  epicLink: ['parent key', 'epic link', 'custom field (epic link)', 'parent'],
  parentSummary: ['parent summary', 'custom field (epic name)', 'epic name'],
  summary: ['summary', 'riepilogo'],
  label: ['labels', 'label'],
  dueDate: ['due date', 'duedate']
};

const STATUS_ORDER = [
  'done', 'blocked for qa', 'in qa', 'ready for qa', 'blocked for dev',
  'in progress', 'in review', 'review ready', 'to do', 'groom ready', 'in draft'
];

const QUICK_LINKS = {
  'EE RaS MVP': [
    { label: 'EE MVP Report', url: 'https://acupay.atlassian.net/issues/?filter=11334' },
    { label: 'EE UAT Issue board', url: 'https://acupay.atlassian.net/jira/software/c/projects/EE/boards/424' },
    { label: 'EE MVP Backlog', url: 'https://acupay.atlassian.net/jira/software/c/projects/EE/boards/186/backlog' }
  ],
  'EE BIP': [
    { label: 'EE BIP Report', url: 'https://acupay.atlassian.net/issues/?filter=11334' },
    { label: 'EE BIP Backlog and Dev board', url: 'https://acupay.atlassian.net/jira/software/c/projects/BIP/boards/494/backlog' }
  ]
};

function statusRank(status) {
  const idx = STATUS_ORDER.indexOf(norm(status));
  return idx === -1 ? STATUS_ORDER.length : idx;
}

function statusBadgeClasses(status) {
  const n = norm(status);
  if (n === 'done') return 'bg-emerald-100 text-emerald-700';
  if (n.includes('blocked')) return 'bg-rose-100 text-rose-700';
  if (n.includes('progress') || n.includes('review') || n.includes('qa')) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function findHeader(headers, candidates) {
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const c of candidates) {
    const idx = lower.findIndex(h => h === c);
    if (idx !== -1) return headers[idx];
  }
  for (const c of candidates) {
    const idx = lower.findIndex(h => h.includes(c));
    if (idx !== -1) return headers[idx];
  }
  return '';
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commas = (firstLine.match(/,/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

function parseCSV(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { field += char; }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === delimiter) { row.push(field); field = ''; }
      else if (char === '\r') { /* skip */ }
      else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else { field += char; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

function parseNumber(str) {
  if (str === undefined || str === null) return 0;
  let s = String(str).trim();
  if (s === '') return 0;
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function norm(v) {
  return (v || '').toString().trim().toLowerCase();
}

function extractSuffixDigits(str) {
  const m = (str || '').match(/(\d+)\s*$/);
  return m ? m[1] : '';
}

function getBarClass(pct) {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  if (pct >= 25) return 'bg-orange-500';
  return 'bg-rose-500';
}
function getHex(pct) {
  if (pct >= 80) return '#10b981';
  if (pct >= 50) return '#f59e0b';
  if (pct >= 25) return '#f97316';
  return '#f43f5e';
}

function epicSortKey(label) {
  const m = (label || '').match(/^epic\s+(\d+)/i);
  if (m) return { hasNumber: true, num: parseInt(m[1], 10) };
  return { hasNumber: false, num: Infinity };
}

function compareEpics(a, b) {
  const ka = epicSortKey(a.label);
  const kb = epicSortKey(b.label);
  if (ka.hasNumber && kb.hasNumber) return ka.num - kb.num;
  if (ka.hasNumber && !kb.hasNumber) return -1;
  if (!ka.hasNumber && kb.hasNumber) return 1;
  if (a.key === '__NO_EPIC__') return 1;
  if (b.key === '__NO_EPIC__') return -1;
  return a.label.localeCompare(b.label);
}

function formatToday() {
  const d = new Date();
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const FIELD_LABELS = {
  key: 'Issue Key',
  issueType: 'Issue Type',
  status: 'Status',
  storyPoints: 'Story Points',
  epicLink: 'Epic Link / Parent key',
  parentSummary: 'Parent Summary (direct epic name - recommended)',
  summary: 'Summary',
  label: 'Label (optional)',
  dueDate: 'Due Date (optional)'
};

// ---------- Quick links dropdown bar (upload screen only) ----------
function QuickLinksBar() {
  const [openKey, setOpenKey] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenKey(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="flex flex-wrap gap-3 mb-4">
      {Object.keys(QUICK_LINKS).map(groupName => (
        <div key={groupName} className="relative">
          <button
            onClick={() => setOpenKey(k => (k === groupName ? null : groupName))}
            className="flex items-center gap-1.5 text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg shadow-sm"
          >
            {groupName}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openKey === groupName ? 'rotate-180' : ''}`} />
          </button>
          {openKey === groupName && (
            <div className="absolute z-30 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5">
              {QUICK_LINKS[groupName].map(link => (
                <a
                  key={link.url + link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span>{link.label}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function JiraProgressDashboard() {
  const [stage, setStage] = useState('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [data, setData] = useState([]);
  const [error, setError] = useState('');

  const [mapping, setMapping] = useState({
    key: '', issueType: '', status: '', storyPoints: '', epicLink: '',
    parentSummary: '', summary: '', label: '', dueDate: ''
  });
  const [storyTypeValue, setStoryTypeValue] = useState('');
  const [epicTypeValue, setEpicTypeValue] = useState('');
  const [doneStatuses, setDoneStatuses] = useState([]);

  const [epicSelection, setEpicSelection] = useState(null);
  const [epicSearch, setEpicSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  const [modalEpicKey, setModalEpicKey] = useState(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const distinctIssueTypes = useMemo(() => {
    if (!mapping.issueType) return [];
    const set = new Set();
    data.forEach(r => { const v = (r[mapping.issueType] || '').trim(); if (v) set.add(v); });
    return Array.from(set).sort();
  }, [data, mapping.issueType]);

  const distinctStatuses = useMemo(() => {
    if (!mapping.status) return [];
    const set = new Set();
    data.forEach(r => { const v = (r[mapping.status] || '').trim(); if (v) set.add(v); });
    return Array.from(set).sort();
  }, [data, mapping.status]);

  function sampleValues(header, n = 4) {
    if (!header) return [];
    const set = [];
    const seen = new Set();
    for (const r of data) {
      const v = (r[header] || '').trim();
      if (v && !seen.has(v)) { seen.add(v); set.push(v); }
      if (set.length >= n) break;
    }
    return set;
  }

  const { nameIndex, suffixIndex, dueDateIndex } = useMemo(() => {
    const nameIdx = {};
    const sufIdx = {};
    const dueIdx = {};
    if (!mapping.key) return { nameIndex: nameIdx, suffixIndex: sufIdx, dueDateIndex: dueIdx };
    data.forEach(r => {
      const k = (r[mapping.key] || '').trim();
      if (!k) return;
      const summaryField = (mapping.summary && r[mapping.summary]) ? r[mapping.summary].trim() : '';
      if (summaryField) {
        nameIdx[k] = summaryField;
        const suf = extractSuffixDigits(k);
        if (suf && !sufIdx[suf]) sufIdx[suf] = summaryField;
      }
      const dueField = (mapping.dueDate && r[mapping.dueDate]) ? r[mapping.dueDate].trim() : '';
      if (dueField) dueIdx[k] = dueField;
    });
    return { nameIndex: nameIdx, suffixIndex: sufIdx, dueDateIndex: dueIdx };
  }, [data, mapping.key, mapping.summary, mapping.dueDate]);

  const parentSummaryIndex = useMemo(() => {
    const idx = {};
    if (!mapping.epicLink || !mapping.parentSummary) return idx;
    data.forEach(r => {
      const k = (r[mapping.epicLink] || '').trim();
      if (!k) return;
      const ps = (r[mapping.parentSummary] || '').trim();
      if (ps && !idx[k]) idx[k] = ps;
    });
    return idx;
  }, [data, mapping.epicLink, mapping.parentSummary]);

  function resolveEpicLabel(epicLinkRaw, directParentSummary) {
    const direct = (directParentSummary || '').trim();
    if (direct) return { label: direct, resolved: true };

    const k = (epicLinkRaw || '').trim();
    if (!k) return { label: '', resolved: false };

    if (parentSummaryIndex[k]) return { label: parentSummaryIndex[k], resolved: true };
    if (nameIndex[k]) return { label: nameIndex[k], resolved: true };
    const suf = extractSuffixDigits(k);
    if (suf && suffixIndex[suf]) return { label: suffixIndex[suf], resolved: true };
    return { label: k, resolved: false };
  }

  const epicLinkDiagnostics = useMemo(() => {
    if (!mapping.epicLink || !mapping.issueType || !storyTypeValue) return [];
    const counts = {};
    const sampleSummary = {};
    data.forEach(r => {
      if (norm(r[mapping.issueType]) !== norm(storyTypeValue)) return;
      const raw = (r[mapping.epicLink] || '').trim();
      const key = raw || '(empty / no Epic)';
      counts[key] = (counts[key] || 0) + 1;
      if (!sampleSummary[key] && mapping.parentSummary) {
        const ps = (r[mapping.parentSummary] || '').trim();
        if (ps) sampleSummary[key] = ps;
      }
    });
    return Object.entries(counts).map(([raw, count]) => {
      const isEmpty = raw === '(empty / no Epic)';
      const res = isEmpty ? { label: 'No Epic', resolved: true } : resolveEpicLabel(raw, sampleSummary[raw]);
      return { raw, count, ...res, isEmpty };
    }).sort((a, b) => b.count - a.count);
  }, [data, mapping.epicLink, mapping.issueType, mapping.parentSummary, storyTypeValue, nameIndex, suffixIndex, parentSummaryIndex]);

  function processFile(file) {
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let text = e.target.result;
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        const delimiter = detectDelimiter(text);
        const rows = parseCSV(text, delimiter);
        if (rows.length < 2) {
          setError('The file appears to be empty or invalid.');
          return;
        }
        const rawHeaders = rows[0].map(h => h.trim());
        const uniqueHeaders = Array.from(new Set(rawHeaders));

        const records = rows.slice(1).map(r => {
          const obj = {};
          rawHeaders.forEach((h, i) => {
            const val = r[i] !== undefined ? r[i] : '';
            if (obj[h] !== undefined) {
              if (val.trim()) {
                obj[h] = obj[h].trim() ? `${obj[h]}, ${val}` : val;
              }
            } else {
              obj[h] = val;
            }
          });
          return obj;
        });

        const autoMap = {
          key: findHeader(uniqueHeaders, CANDIDATES.key),
          issueType: findHeader(uniqueHeaders, CANDIDATES.issueType),
          status: findHeader(uniqueHeaders, CANDIDATES.status),
          storyPoints: findHeader(uniqueHeaders, CANDIDATES.storyPoints),
          epicLink: findHeader(uniqueHeaders, CANDIDATES.epicLink),
          parentSummary: findHeader(uniqueHeaders, CANDIDATES.parentSummary),
          summary: findHeader(uniqueHeaders, CANDIDATES.summary),
          label: findHeader(uniqueHeaders, CANDIDATES.label),
          dueDate: findHeader(uniqueHeaders, CANDIDATES.dueDate)
        };

        let epicGuess = '';
        let storyGuess = '';
        let doneGuess = [];

        if (autoMap.issueType) {
          const types = Array.from(new Set(records.map(r => (r[autoMap.issueType] || '').trim()).filter(Boolean)));
          epicGuess = types.find(t => norm(t) === 'epic') || types.find(t => norm(t).includes('epic')) || '';
          storyGuess = types.find(t => norm(t) === 'story') ||
                       types.find(t => norm(t).includes('story') && norm(t) !== norm(epicGuess)) || '';
        }
        if (autoMap.status) {
          const statuses = Array.from(new Set(records.map(r => (r[autoMap.status] || '').trim()).filter(Boolean)));
          doneGuess = statuses.filter(s => norm(s) === 'done' || norm(s) === 'closed' || norm(s) === 'completed');
        }

        setHeaders(uniqueHeaders);
        setData(records);
        setMapping(autoMap);
        setFileName(file.name);
        setEpicTypeValue(epicGuess);
        setStoryTypeValue(storyGuess);
        setDoneStatuses(doneGuess);

        const autoMapComplete =
          autoMap.key && autoMap.issueType && autoMap.status &&
          autoMap.storyPoints && autoMap.epicLink && storyGuess;

        if (autoMapComplete) {
          setStage('dashboard');
        } else {
          setError('Some required columns could not be auto-detected. Please verify the mapping below.');
          setStage('mapping');
        }
      } catch (err) {
        setError('Error while reading the file: ' + err.message);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  function handleFileInput(e) {
    const file = e.target.files && e.target.files[0];
    if (file) processFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function resetAll() {
    setStage('upload');
    setFileName('');
    setHeaders([]);
    setData([]);
    setMapping({ key: '', issueType: '', status: '', storyPoints: '', epicLink: '', parentSummary: '', summary: '', label: '', dueDate: '' });
    setStoryTypeValue('');
    setEpicTypeValue('');
    setDoneStatuses([]);
    setEpicSelection(null);
    setModalEpicKey(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function toggleDoneStatus(s) {
    setDoneStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  const mappingValid = mapping.key && mapping.issueType && mapping.status && mapping.storyPoints && mapping.epicLink && storyTypeValue;

  const { epics, overall, unresolvedCount } = useMemo(() => {
    if (stage !== 'dashboard' || !mappingValid) return { epics: [], overall: null, unresolvedCount: 0 };

    const storyRows = data.filter(r => norm(r[mapping.issueType]) === norm(storyTypeValue));

    const agg = {};
    let unresolved = 0;
    let noEstimateCount = 0;

    storyRows.forEach(r => {
      const rawEpicKey = (r[mapping.epicLink] || '').trim();
      const epicKey = rawEpicKey || '__NO_EPIC__';
      const spRaw = (r[mapping.storyPoints] || '').trim();
      const sp = parseNumber(spRaw);
      const isNoEstimate = spRaw === '';
      if (isNoEstimate) noEstimateCount++;

      const status = (r[mapping.status] || '').trim();
      const isDone = doneStatuses.some(d => norm(d) === norm(status));
      const directParentSummary = mapping.parentSummary ? (r[mapping.parentSummary] || '').trim() : '';

      if (!agg[epicKey]) {
        let label, resolved;
        if (epicKey === '__NO_EPIC__') {
          label = 'No Epic'; resolved = true;
        } else {
          const r2 = resolveEpicLabel(rawEpicKey, directParentSummary);
          label = r2.label; resolved = r2.resolved;
          if (!resolved) unresolved++;
        }
        agg[epicKey] = {
          key: epicKey, label, resolved, totalSP: 0, doneSP: 0,
          totalCount: 0, doneCount: 0, noEstimateCount: 0, statusCounts: {}, rows: [],
          dueDate: epicKey === '__NO_EPIC__' ? '' : (dueDateIndex[rawEpicKey] || '')
        };
      } else if (!agg[epicKey].resolved && directParentSummary) {
        agg[epicKey].label = directParentSummary;
        agg[epicKey].resolved = true;
        unresolved = Math.max(0, unresolved - 1);
      }

      const e = agg[epicKey];
      e.totalSP += sp;
      e.totalCount += 1;
      if (isDone) { e.doneSP += sp; e.doneCount += 1; }
      if (isNoEstimate) e.noEstimateCount += 1;
      e.statusCounts[status] = (e.statusCounts[status] || 0) + 1;
      e.rows.push({
        key: (r[mapping.key] || '').trim(),
        summary: (mapping.summary ? (r[mapping.summary] || '').trim() : ''),
        label: (mapping.label ? (r[mapping.label] || '').trim() : ''),
        status,
        sp: isNoEstimate ? null : sp
      });
    });

    const epicsArr = Object.values(agg)
      .map(e => ({ ...e, pct: e.totalSP > 0 ? (e.doneSP / e.totalSP) * 100 : 0 }))
      .sort(compareEpics);

    const totalSP = epicsArr.reduce((s, e) => s + e.totalSP, 0);
    const doneSP = epicsArr.reduce((s, e) => s + e.doneSP, 0);
    const totalCount = epicsArr.reduce((s, e) => s + e.totalCount, 0);
    const doneCount = epicsArr.reduce((s, e) => s + e.doneCount, 0);

    return {
      epics: epicsArr,
      overall: {
        totalSP, doneSP, totalCount, doneCount, noEstimateCount,
        pct: totalSP > 0 ? (doneSP / totalSP) * 100 : 0,
        epicCount: epicsArr.length
      },
      unresolvedCount: unresolved
    };
  }, [stage, mappingValid, data, mapping, storyTypeValue, doneStatuses, nameIndex, suffixIndex, parentSummaryIndex, dueDateIndex]);

  const visibleEpics = useMemo(() => {
    if (epicSelection === null) return epics;
    return epics.filter(e => epicSelection.has(e.key));
  }, [epics, epicSelection]);

  const filteredDropdownEpics = useMemo(() => {
    const term = epicSearch.trim().toLowerCase();
    if (!term) return epics;
    return epics.filter(e => e.label.toLowerCase().includes(term));
  }, [epics, epicSearch]);

  function isEpicVisible(key) {
    return epicSelection === null || epicSelection.has(key);
  }
  function toggleEpicVisibility(key) {
    setEpicSelection(prev => {
      const base = prev === null ? new Set(epics.map(e => e.key)) : new Set(prev);
      if (base.has(key)) base.delete(key); else base.add(key);
      return base;
    });
  }
  function selectAllEpics() { setEpicSelection(new Set(epics.map(e => e.key))); }
  function selectNoneEpics() { setEpicSelection(new Set()); }

  const barChartData = useMemo(() => {
    return visibleEpics.map(e => ({
      name: e.label.length > 24 ? e.label.slice(0, 24) + '…' : e.label,
      pct: Math.round(e.pct * 10) / 10
    }));
  }, [visibleEpics]);

  const modalEpic = useMemo(() => {
    if (!modalEpicKey) return null;
    const found = epics.find(e => e.key === modalEpicKey);
    if (!found) return null;
    const sortedRows = [...found.rows].sort((a, b) => statusRank(a.status) - statusRank(b.status));
    return { ...found, rows: sortedRows };
  }, [modalEpicKey, epics]);

  const reportText = useMemo(() => {
    if (!overall) return '';
    const lines = [];
    lines.push(`Here is the status update as of ${formatToday()}:`);
    lines.push('');
    epics
      .filter(e => e.key !== '__NO_EPIC__')
      .forEach(e => {
        const spRemaining = Math.max(e.totalSP - e.doneSP, 0);
        const due = e.dueDate || 'TBD';
        lines.push(
          `- ${e.label}: Due date: ${due}, SP remaining: ${spRemaining}/${e.totalSP}, US to estimate: ${e.noEstimateCount}`
        );
      });
    return lines.join('\n');
  }, [epics, overall]);

  function handleCopyReport() {
    navigator.clipboard.writeText(reportText).then(() => {
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 2000);
    });
  }

  function handleOpenEmail() {
    const subject = encodeURIComponent(`Project Status Update - ${formatToday()}`);
    const body = encodeURIComponent(reportText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-7 h-7 text-indigo-600" />
              Project Progress Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Progress calculated as completed Story Points / total Story Points per Epic
            </p>
          </div>
          {stage !== 'upload' && (
            <div className="flex gap-2">
              {stage === 'dashboard' && (
                <button
                  onClick={() => setReportOpen(true)}
                  className="flex items-center gap-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg shadow-sm"
                >
                  <Mail className="w-4 h-4" /> Report
                </button>
              )}
              <button
                onClick={() => setStage('mapping')}
                className="flex items-center gap-1 text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg shadow-sm"
              >
                <Settings2 className="w-4 h-4" /> Edit mapping
              </button>
              <button
                onClick={resetAll}
                className="flex items-center gap-1 text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg shadow-sm"
              >
                <RefreshCw className="w-4 h-4" /> New file
              </button>
            </div>
          )}
        </header>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {stage === 'upload' && (
          <div className="space-y-4">
            <QuickLinksBar />

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors p-10 sm:p-16 flex flex-col items-center justify-center text-center shadow-sm"
            >
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8 text-indigo-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Upload the JIRA export (CSV)</h2>
              <p className="text-slate-500 text-sm mb-6 max-w-md">
                Drag and drop the file here, or select it manually.
              </p>
              <label className="cursor-pointer inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm">
                <Upload className="w-4 h-4" /> Select CSV file
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-indigo-800">
                <span className="font-semibold">How to properly download the CSV:</span> select the project report
                above using one of the "EE RaS MVP" / "EE BIP" links. Then, in the top right, click <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200">"..."</span>,
                choose <span className="font-medium">"Export"</span>, then <span className="font-medium">"Excel CSV – filter fields"</span>.
              </p>
            </div>
          </div>
        )}

        {stage === 'mapping' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-1">
              <Settings2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-800">Verify column mapping</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              File: <span className="font-medium text-slate-700">{fileName}</span> — {data.length} rows, {headers.length} columns.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {Object.keys(FIELD_LABELS).map(fieldKey => (
                <div key={fieldKey}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {FIELD_LABELS[fieldKey]}
                    {['parentSummary', 'summary', 'label', 'dueDate'].includes(fieldKey) ? '' : ' *'}
                  </label>
                  <select
                    value={mapping[fieldKey]}
                    onChange={(e) => setMapping(m => ({ ...m, [fieldKey]: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">-- none --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  {mapping[fieldKey] && (
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      Example values: {sampleValues(mapping[fieldKey]).join(' · ') || '(empty)'}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  "Issue Type" value that identifies a User Story *
                </label>
                <select
                  value={storyTypeValue}
                  onChange={(e) => setStoryTypeValue(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">-- select --</option>
                  {distinctIssueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  "Issue Type" value that identifies an Epic (informational)
                </label>
                <select
                  value={epicTypeValue}
                  onChange={(e) => setEpicTypeValue(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">-- none --</option>
                  {distinctIssueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-xs font-medium text-slate-600 mb-2">
                Which statuses should be considered "Done" for the calculation? *
              </label>
              <div className="flex flex-wrap gap-2">
                {distinctStatuses.length === 0 && (
                  <span className="text-sm text-slate-400">Select the "Status" column first</span>
                )}
                {distinctStatuses.map(s => {
                  const active = doneStatuses.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleDoneStatus(s)}
                      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                        active
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-slate-300 text-slate-600 hover:border-emerald-400'
                      }`}
                    >
                      {active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {epicLinkDiagnostics.length > 0 && (
              <div className="mb-8 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Epic ↔ User Story link verification</h3>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-200">
                        <th className="py-1.5 pr-3">Epic Link (raw value)</th>
                        <th className="py-1.5 pr-3">Resolved name</th>
                        <th className="py-1.5 pr-3"># Stories</th>
                        <th className="py-1.5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {epicLinkDiagnostics.map((d, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="py-1.5 pr-3 font-mono text-slate-600">{d.raw}</td>
                          <td className="py-1.5 pr-3 text-slate-700">{d.resolved ? d.label : '—'}</td>
                          <td className="py-1.5 pr-3 text-slate-500">{d.count}</td>
                          <td className="py-1.5">
                            {d.isEmpty ? (
                              <span className="text-slate-400">no epic</span>
                            ) : d.resolved ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> resolved</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-500"><AlertTriangle className="w-3 h-3" /> unresolved</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!mappingValid && (
              <p className="text-sm text-rose-500 mb-4">
                Fill in all required fields (*) before continuing.
              </p>
            )}
            {mappingValid && doneStatuses.length === 0 && (
              <p className="text-sm text-amber-500 mb-4">
                No "Done" status selected: completion % will be 0 for all Epics.
              </p>
            )}

            <button
              disabled={!mappingValid}
              onClick={() => setStage('dashboard')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium shadow-sm ${
                mappingValid
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Generate dashboard <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {stage === 'dashboard' && overall && (
          <div className="space-y-6">
            {unresolvedCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {unresolvedCount} Epics unresolved (name not found).
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" /> Overall project status
              </h2>
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="relative w-44 h-44 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: overall.doneSP },
                          { name: 'Remaining', value: Math.max(overall.totalSP - overall.doneSP, 0) }
                        ]}
                        dataKey="value"
                        innerRadius={60}
                        outerRadius={82}
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        <Cell fill={getHex(overall.pct)} />
                        <Cell fill="#e2e8f0" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-slate-800">{overall.pct.toFixed(0)}%</span>
                    <span className="text-xs text-slate-400">completed</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 w-full">
                  <StatTile icon={<Layers className="w-4 h-4" />} label="Total Epics" value={overall.epicCount} />
                  <StatTile icon={<ListChecks className="w-4 h-4" />} label="User Stories" value={overall.totalCount} />
                  <StatTile icon={<CheckCircle2 className="w-4 h-4" />} label="Completed Stories" value={overall.doneCount} />
                  <StatTile
                    icon={<AlertCircle className="w-4 h-4" />}
                    label="US without estimate"
                    value={overall.noEstimateCount}
                    highlight={overall.noEstimateCount > 0}
                  />
                  <StatTile label="Total Story Points" value={overall.totalSP} />
                  <StatTile label="Completed Story Points" value={overall.doneSP} />
                  <StatTile label="Remaining SP" value={Math.max(overall.totalSP - overall.doneSP, 0)} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <ListChecks className="w-5 h-5 text-indigo-600" /> Filter Epics
              </h2>
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFilterOpen(o => !o)}
                  className="w-full sm:w-[26rem] flex items-center justify-between border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white hover:bg-slate-50"
                >
                  <span className="text-slate-700">
                    {visibleEpics.length} of {epics.length} Epics selected
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                </button>

                {filterOpen && (
                  <div className="absolute z-20 mt-2 w-full sm:w-[26rem] bg-white border border-slate-200 rounded-xl shadow-lg p-4">
                    <div className="relative mb-3">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={epicSearch}
                        onChange={(e) => setEpicSearch(e.target.value)}
                        placeholder="Search Epics..."
                        className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="flex gap-2 text-xs mb-3">
                      <button onClick={selectAllEpics} className="px-2.5 py-1 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-600">Select all</button>
                      <button onClick={selectNoneEpics} className="px-2.5 py-1 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-600">Deselect all</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {filteredDropdownEpics.map(e => {
                        const active = isEpicVisible(e.key);
                        return (
                          <label
                            key={e.key}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleEpicVisibility(e.key)}
                              className="rounded border-slate-300"
                            />
                            {!e.resolved && e.key !== '__NO_EPIC__' && (
                              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            )}
                            <span className="flex-1 truncate text-slate-700">{e.label}</span>
                            <span className="text-xs text-slate-400">{e.pct.toFixed(0)}%</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Epic by Epic Detail</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleEpics.length === 0 && (
                  <p className="text-sm text-slate-400 col-span-full">No Epic selected.</p>
                )}
                {visibleEpics.map(e => (
                  <div key={e.key} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <h3 className="font-medium text-slate-800 text-sm leading-snug flex items-center gap-1.5" title={e.label}>
                          {!e.resolved && e.key !== '__NO_EPIC__' && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          )}
                          <span className="truncate">{e.label}</span>
                        </h3>
                        {e.resolved && e.key !== '__NO_EPIC__' && (
                          <span className="text-[11px] text-slate-400">Key: {e.key}</span>
                        )}
                      </div>
                      <span className="text-sm font-semibold flex-shrink-0" style={{ color: getHex(e.pct) }}>
                        {e.pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3 mt-2">
                      <div
                        className={`h-full rounded-full ${getBarClass(e.pct)}`}
                        style={{ width: `${Math.min(e.pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>SP: {e.doneSP}/{e.totalSP}</span>
                      <span>Stories: {e.doneCount}/{e.totalCount}</span>
                    </div>
                    {e.key !== '__NO_EPIC__' && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
                        <Calendar className="w-3 h-3" />
                        <span>Due date: {e.dueDate || '—'}</span>
                      </div>
                    )}
                    <button
                      onClick={() => setModalEpicKey(e.key)}
                      className="mt-auto text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:bg-indigo-50 rounded-lg px-3 py-1.5 self-start"
                    >
                      View stories ({e.totalCount})
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {visibleEpics.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Completion % comparison</h2>
                <div style={{ width: '100%', height: Math.max(barChartData.length * 36, 120) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                        {barChartData.map((d, i) => <Cell key={i} fill={getHex(d.pct)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {modalEpic && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
            onClick={() => setModalEpicKey(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-200">
                <div>
                  <h3 className="font-semibold text-slate-800">{modalEpic.label}</h3>
                  {modalEpic.key !== '__NO_EPIC__' && (
                    <span className="text-xs text-slate-400">Key: {modalEpic.key}</span>
                  )}
                </div>
                <button
                  onClick={() => setModalEpicKey(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="text-left text-slate-500 text-xs">
                      <th className="py-2.5 px-5">Key</th>
                      <th className="py-2.5 px-5">Summary</th>
                      <th className="py-2.5 px-5">Label</th>
                      <th className="py-2.5 px-5">Status</th>
                      <th className="py-2.5 px-5 text-right">Story Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalEpic.rows.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="py-2.5 px-5 font-mono text-xs text-slate-600 whitespace-nowrap">{row.key}</td>
                        <td className="py-2.5 px-5 text-slate-700">{row.summary}</td>
                        <td className="py-2.5 px-5 text-slate-500 text-xs">{row.label || '—'}</td>
                        <td className="py-2.5 px-5">
                          <span className={`text-xs px-2 py-1 rounded-full ${statusBadgeClasses(row.status)}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-5 text-right text-slate-600">
                          {row.sp === null ? <span className="text-amber-500">—</span> : row.sp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {reportOpen && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
            onClick={() => setReportOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-600" /> Status Report
                </h3>
                <button
                  onClick={() => setReportOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-5">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono">
                  {reportText}
                </pre>
              </div>
              <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200">
                <button
                  onClick={handleCopyReport}
                  className="flex items-center gap-1.5 text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg"
                >
                  {reportCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {reportCopied ? 'Copied!' : 'Copy to clipboard'}
                </button>
                <button
                  onClick={handleOpenEmail}
                  className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg"
                >
                  <Send className="w-4 h-4" /> Open in email client
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3 flex flex-col gap-1 ${highlight ? 'bg-amber-50' : 'bg-slate-50'}`}>
      <div className={`flex items-center gap-1.5 text-xs ${highlight ? 'text-amber-500' : 'text-slate-400'}`}>{icon}{label}</div>
      <span className={`text-xl font-semibold ${highlight ? 'text-amber-600' : 'text-slate-800'}`}>{value}</span>
    </div>
  );
}