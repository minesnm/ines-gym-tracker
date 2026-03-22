"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Workout {
  id: string;
  exercise: string;
  category: "upper" | "lower" | "core";
  equipment: "free" | "machine" | "bodyweight";
  weight: number;
  sets: number;
  reps: number;
  date: string;
}

// ─── PURE HELPERS (outside component — stable, never recreated on render) ─────

const normalize = (str: string) => str.toLowerCase().trim();

// Outside the component so it's never recreated and is safe inside
// useMemo/useEffect dependency arrays without warnings.
const isToday = (dateString: string) => {
  const d1 = new Date(dateString), d2 = new Date();
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const calculateScore = (w: number, r: number) => w === 0 ? r : w * (1 + r / 30);

const getEquipmentLabel = (eq: string) =>
  eq === "machine" ? "Machine" : eq === "bodyweight" ? "Body" : "Weights";

// ─── SVG ICONS ────────────────────────────────────────────────────────────────

const IconTrash = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const IconEye = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconPencil = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconCheck = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconFreeWeight = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12h6" /><rect x="6" y="5" width="3" height="14" rx="1" />
    <rect x="15" y="5" width="3" height="14" rx="1" />
    <path d="M4 12h2" /><path d="M18 12h2" />
    <rect x="2" y="8" width="2" height="8" rx="1" /><rect x="20" y="8" width="2" height="8" rx="1" />
  </svg>
);

const IconMachine = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="4" width="10" height="4" rx="1" /><rect x="5" y="10" width="10" height="4" rx="1" />
    <rect x="5" y="16" width="10" height="4" rx="1" /><path d="M10 2v20" />
    <path d="M15 12h4" /><path d="M19 11v2" />
  </svg>
);

const IconBodyweight = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1.5" /><path d="m9 20 3-6 3 6" />
    <path d="m6 8 6 2 6-2" /><path d="M12 10v4" />
  </svg>
);

const EquipmentIcon = ({ eq, size = 14 }: { eq?: string; size?: number }) => {
  if (eq === "machine")    return <IconMachine size={size} />;
  if (eq === "bodyweight") return <IconBodyweight size={size} />;
  return <IconFreeWeight size={size} />;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function GymTracker() {
  const [exercise, setExercise] = useState("");
  const [category, setCategory] = useState<"upper" | "lower" | "core">("lower");
  const [equipment, setEquipment] = useState<"free" | "machine" | "bodyweight">("free");
  const [weight, setWeight] = useState<number | "">(30);
  const [sets, setSets] = useState<number | "">(3);
  const [reps, setReps] = useState<number | "">(10);

  const [history, setHistory] = useState<Workout[]>([]);
  const [lastRecord, setLastRecord] = useState<Workout | null>(null);
  const [todayRecord, setTodayRecord] = useState<Workout | null>(null);
  const [maxHistoricalScore, setMaxHistoricalScore] = useState<number>(0);

  const [successMode, setSuccessMode] = useState(false);
  const [isPR, setIsPR] = useState(false);
  const [chartData, setChartData] = useState<{ date: string; weight: number; reps: number; score: number }[]>([]);

  const [isSaved, setIsSaved] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [selectedHeatmapDate, setSelectedHeatmapDate] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [hiddenExercises, setHiddenExercises] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: "", weight: 0, sets: 0, reps: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ref used to scroll the heatmap into view when it opens
  const heatmapRef = useRef<HTMLDivElement>(null);

  // suppressHydrationWarning on the h1 handles the only server/client mismatch
  // (the date string). No need for isMounted to blank the whole page.
  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });

  useEffect(() => {
    const saved = localStorage.getItem("boutiqueGymHistory");
    if (saved) setHistory(JSON.parse(saved));
    const savedHidden = localStorage.getItem("boutiqueGymHidden");
    if (savedHidden) setHiddenExercises(JSON.parse(savedHidden));

  }, []);

  // Scroll the heatmap into view whenever it becomes visible
  useEffect(() => {
    if (showHeatmap && heatmapRef.current) {
      setTimeout(() => {
        heatmapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50); // small delay lets the element render first
    }
  }, [showHeatmap]);

  // Native back-gesture closes the log modal on mobile
  const openActivityLog = () => {
    window.history.pushState({ modal: "activityLog" }, "");
    setIsLogOpen(true);
  };
  const closeActivityLog = () => {
    if (window.history.state?.modal === "activityLog") window.history.back();
    else setIsLogOpen(false);
  };
  useEffect(() => {
    const handlePopState = () => { if (isLogOpen) setIsLogOpen(false); };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isLogOpen]);

  // ─── KEYBOARD HELPERS ─────────────────────────────────────────────────────────

  const handleFocusSelect = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  const blurKeyboard = () => (document.activeElement as HTMLElement)?.blur();

  // ─── DERIVED DATA (all memoized — only recompute when history changes) ────────

  const todaySummary = useMemo(() => {
    const t = history.filter((i) => isToday(i.date));
    return {
      upper: new Set(t.filter((i) => i.category === "upper").map((i) => i.exercise)).size,
      lower: new Set(t.filter((i) => i.category === "lower").map((i) => i.exercise)).size,
      core:  new Set(t.filter((i) => i.category === "core" ).map((i) => i.exercise)).size,
    };
  }, [history]);

  // Count PRs achieved today: for each exercise logged today, check if its
  // score beats the best score from all previous (non-today) sessions.
  const todayPRs = useMemo(() => {
    const todayEntries = history.filter((e) => isToday(e.date));
    return todayEntries.filter((entry) => {
      const previousBest = history
        .filter((e) => !isToday(e.date) && normalize(e.exercise) === normalize(entry.exercise))
        .reduce((best, e) => Math.max(best, calculateScore(e.weight, e.reps)), 0);
      return previousBest > 0 && calculateScore(entry.weight, entry.reps) > previousBest;
    }).length;
  }, [history]);

  const exerciseLastDone = useMemo(() => {
    const map = new Map<string, number>();
    history.forEach((entry) => {
      const time = new Date(entry.date).getTime();
      if (!map.has(entry.exercise) || map.get(entry.exercise)! < time)
        map.set(entry.exercise, time);
    });
    return map;
  }, [history]);

  // Two pre-sorted views of history — computed once, reused everywhere.
  // Previously the array was re-sorted independently in 5+ places.
  const historySorted = useMemo(
    () =>
      [...history].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [history]
  );
  const historyChronological = useMemo(
    () =>
      [...history].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [history]
  );


  // Sorted once inside useMemo — no separate recentHistory variable
  const groupedExercises = useMemo(() => {
    return {
      upper: Array.from(new Set(historySorted.filter((i) => i.category === "upper").map((i) => i.exercise))),
      lower: Array.from(new Set(historySorted.filter((i) => i.category === "lower").map((i) => i.exercise))),
      core:  Array.from(new Set(historySorted.filter((i) => i.category === "core" ).map((i) => i.exercise))),
    };
  }, [history]);

  const equipmentMap = useMemo(() => {
    const map = new Map<string, string>();
    history.forEach((e) => { map.set(e.exercise, e.equipment || "free"); });
    return map;
  }, [history]);

  const exercisesToday = useMemo(
    () => new Set(history.filter((i) => isToday(i.date)).map((i) => i.exercise)),
    [history]
  );

  // Autocomplete: matches history exercise names containing the current input.
  // Returns empty when input < 2 chars or an exact match already exists.
  const suggestions = useMemo(() => {
    const trimmed = exercise.trim();
    if (trimmed.length < 2) return [];
    const norm = normalize(trimmed);
    if (history.some((e) => normalize(e.exercise) === norm)) return [];
    const seen = new Set<string>();
    return [...historySorted]
      .reduce<string[]>((acc, e) => {
        if (!seen.has(e.exercise) && normalize(e.exercise).includes(norm)) {
          seen.add(e.exercise);
          acc.push(e.exercise);
        }
        return acc;
      }, [])
      .slice(0, 5);
  }, [exercise, history]);

  // ─── HEATMAP DATA (memoized) ─────────────────────────────────────────────────
  // Previously computed inside renderHeatmap() on every render.
  // Now only recomputes when history changes.
  const heatmapData = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dow = today.getDay();
    const start = new Date(today); start.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) - 21);
    const days: Date[] = []; const cur = new Date(start);
    for (let i = 0; i < 28; i++) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }

    const lastSeen = new Map<string, Workout>(), bestScore = new Map<string, number>();
    const dayStats = new Map<number, { total: number; progress: number }>();
    historyChronological.forEach((entry) => {
      const d = new Date(entry.date); d.setHours(0, 0, 0, 0); const ts = d.getTime();
      if (!dayStats.has(ts)) dayStats.set(ts, { total: 0, progress: 0 });
      const stats = dayStats.get(ts)!; stats.total++;
      const prev = lastSeen.get(entry.exercise);
      const score = calculateScore(entry.weight, entry.reps);
      const best = bestScore.get(entry.exercise) || 0;
      const progress = (score > best && best > 0) || (!!prev && (
        entry.weight > prev.weight ||
        (entry.weight === prev.weight && entry.sets > prev.sets) ||
        (entry.weight === prev.weight && entry.sets === prev.sets && entry.reps > prev.reps)
      ));
      if (progress) stats.progress++;
      lastSeen.set(entry.exercise, entry);
      if (score > best) bestScore.set(entry.exercise, score);
    });

    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return { today, weeks, dayStats };
  }, [history]);

  // ─── ACTIVITY LOG DATA (memoized) ─────────────────────────────────────────────
  // Previously regrouped on every render inside renderActivityLog().
  const activityLogGroups = useMemo(() => {
    const grouped = new Map<string, Workout[]>();
    [...historySorted]
      .forEach((entry) => {
        if (!grouped.has(entry.exercise)) grouped.set(entry.exercise, []);
        grouped.get(entry.exercise)!.push(entry);
      });
    return Array.from(grouped.entries()).sort(
      (a, b) => new Date(b[1][0].date).getTime() - new Date(a[1][0].date).getTime()
    );
  }, [history]);

  // ─── EFFECTS ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (exercise.trim().length < 2) {
      setLastRecord(null); setTodayRecord(null); setMaxHistoricalScore(0); setChartData([]);
      return;
    }
    const norm = normalize(exercise);
    const matches = history.filter((e) => normalize(e.exercise) === norm);
    if (matches.length > 0) {
      setMaxHistoricalScore(Math.max(...matches.map((m) => calculateScore(m.weight, m.reps))));
      const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const tRecord = sorted.find((e) => isToday(e.date)) || null;
      const lRecord = sorted.filter((e) => !isToday(e.date))[0] ?? null;
      setTodayRecord(tRecord); setLastRecord(lRecord);
      const ref = tRecord || lRecord;
      if (ref) { setCategory(ref.category); setEquipment(ref.equipment || "free"); }
      const dailyMax = new Map<number, { date: string; weight: number; reps: number; score: number }>();
      matches.forEach((e) => {
        const d = new Date(e.date); d.setHours(0, 0, 0, 0);
        const ts = d.getTime(), score = calculateScore(e.weight, e.reps);
        if (!dailyMax.has(ts) || dailyMax.get(ts)!.score < score)
          dailyMax.set(ts, { date: `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`, weight: e.weight, reps: e.reps, score });
      });
      setChartData(Array.from(dailyMax.entries()).sort((a, b) => a[0] - b[0]).map(([, v]) => v).slice(-7));
    } else {
      setLastRecord(null); setTodayRecord(null); setMaxHistoricalScore(0); setChartData([]);
    }
  }, [exercise, history]);

  useEffect(() => {
    const w = typeof weight === "number" ? weight : 0;
    const s = typeof sets   === "number" ? sets   : 0;
    const r = typeof reps   === "number" ? reps   : 0;
    setIsPR(calculateScore(w, r) > maxHistoricalScore && maxHistoricalScore > 0);
    setSuccessMode(!!lastRecord && (
      w > lastRecord.weight ||
      (w === lastRecord.weight && s > lastRecord.sets) ||
      (w === lastRecord.weight && s === lastRecord.sets && r > lastRecord.reps)
    ));
  }, [weight, sets, reps, lastRecord, maxHistoricalScore]);

  // ─── HANDLERS ─────────────────────────────────────────────────────────────────

  const triggerHaptic = (p: number | number[]) => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) window.navigator.vibrate(p);
  };

  const handleIncrement = (setter: React.Dispatch<React.SetStateAction<number | "">>, val: number | "") => {
    triggerHaptic(30); setter(typeof val === "number" ? val + 1 : 1);
  };
  const handleDecrement = (setter: React.Dispatch<React.SetStateAction<number | "">>, val: number | "") => {
    triggerHaptic(30); setter(typeof val === "number" && val > 0 ? val - 1 : 0);
  };

  const handleSelectPastExercise = (exName: string, cat: "upper" | "lower" | "core") => {
    triggerHaptic(20); setExercise(exName); setCategory(cat);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    const recent = historySorted.find((e) => normalize(e.exercise) === normalize(exName));
    if (recent) { setWeight(recent.weight); setSets(recent.sets); setReps(recent.reps); setEquipment(recent.equipment || "free"); }
  };

  const handleSelectSuggestion = (name: string) => {
    triggerHaptic(20);
    const recent = historySorted.find((e) => normalize(e.exercise) === normalize(name));
    setExercise(name);
    if (recent) {
      setCategory(recent.category);
      setEquipment(recent.equipment || "free");
      setWeight(recent.weight);
      setSets(recent.sets);
      setReps(recent.reps);
    }
    setShowSuggestions(false);
  };

  // Debounced localStorage write — setHistory is immediate so the UI updates
  // instantly, but the actual disk write is deferred 400ms. This avoids
  // blocking the main thread on every rapid Save tap.
  const lsWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveHistory = (updated: Workout[]) => {
    setHistory(updated);
    if (lsWriteTimer.current) clearTimeout(lsWriteTimer.current);
    lsWriteTimer.current = setTimeout(() => {
      localStorage.setItem("boutiqueGymHistory", JSON.stringify(updated));
    }, 400);
  };

  const handleSave = () => {
    if (!exercise) return;
    triggerHaptic([100, 50, 100]);
    const norm = normalize(exercise);
    const idx = history.findIndex((e) => isToday(e.date) && normalize(e.exercise) === norm);
    const updated = idx >= 0
      ? history.map((e, i) => i === idx ? { ...e, category, equipment, weight: Number(weight) || 0, sets: Number(sets) || 0, reps: Number(reps) || 0, date: new Date().toISOString() } : e)
      : [...history, { id: crypto.randomUUID(), exercise: exercise.trim(), category, equipment, weight: Number(weight) || 0, sets: Number(sets) || 0, reps: Number(reps) || 0, date: new Date().toISOString() }];
    saveHistory(updated);
    setExercise(""); setWeight(""); setSets(""); setReps("");
    setSuccessMode(false); setIsPR(false); setIsSaved(true); setShowHeatmap(true);
    setTimeout(() => setIsSaved(false), 1500);
  };

  const handleDeleteEntry = (id: string, isFromActiveCard = false) => {
    if (!confirm("Permanently delete this entry?")) return;
    triggerHaptic([50, 50]);
    saveHistory(history.filter((e) => e.id !== id));
    if (isFromActiveCard) { setExercise(""); setWeight(30); setSets(3); setReps(10); }
  };

  const startEditing = (entry: Workout) => {
    triggerHaptic(20);
    setEditingId(entry.id);
    setEditForm({ date: entry.date.split("T")[0], weight: entry.weight, sets: entry.sets, reps: entry.reps });
  };

  const saveEdit = (id: string) => {
    triggerHaptic([50, 50]);
    saveHistory(history.map((h) => h.id !== id ? h : {
      ...h,
      weight: Number(editForm.weight), sets: Number(editForm.sets), reps: Number(editForm.reps),
      date: new Date(`${editForm.date}T12:00:00`).toISOString(),
    }));
    setEditingId(null);
  };

  const renameExercise = (oldName: string) => {
    const newName = window.prompt(`Rename "${oldName}" to:`, oldName);
    if (!newName || newName.trim() === "" || newName.trim() === oldName) return;
    triggerHaptic(50);
    saveHistory(history.map((e) => normalize(e.exercise) === normalize(oldName) ? { ...e, exercise: newName.trim() } : e));
  };

  const toggleHideExercise = (name: string) => {
    triggerHaptic(30);
    const updated = hiddenExercises.includes(name)
      ? hiddenExercises.filter((e) => e !== name)
      : [...hiddenExercises, name];
    setHiddenExercises(updated);
    localStorage.setItem("boutiqueGymHidden", JSON.stringify(updated));
  };

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); } else { next.add(name); }
      return next;
    });
  };

  const exportToCSV = () => {
    triggerHaptic(50);
    const headers = ["Date", "Exercise", "Category", "Equipment", "Weight (kg)", "Sets", "Reps"];
    const rows = history.map((w) => [new Date(w.date).toLocaleDateString(), w.exercise, w.category, w.equipment, w.weight, w.sets, w.reps]);
    const url = URL.createObjectURL(new Blob([[headers, ...rows].map((r) => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url;
    a.setAttribute("download", `gym-history-${new Date().toISOString().split("T")[0]}.csv`); a.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const lines = (e.target?.result as string).replace(/\r/g, "").split("\n").filter((l) => l.trim());
        if (lines.length < 2) throw new Error();
        const sep = lines[0].includes(";") ? ";" : ",";
        const workouts: Workout[] = lines.slice(1).flatMap((line) => {
          const p = line.split(sep); if (p.length < 7) return [];
          const [dateStr, ex, cat, eq, wt, st, rp] = p;
          const parsed = new Date(dateStr.trim());
          return [{ id: crypto.randomUUID(), date: isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString(), exercise: ex?.trim() || "Unknown", category: (cat?.trim() || "lower") as "upper" | "lower" | "core", equipment: (eq?.trim() || "free") as "free" | "machine" | "bodyweight", weight: Number(wt) || 0, sets: Number(st) || 0, reps: Number(rp) || 0 }];
        });
        if (workouts.length > 0 && confirm(`Parsed ${workouts.length} records. Overwrite current history?`)) {
          saveHistory(workouts); triggerHaptic([50, 100, 50]);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch { alert("Import failed. The CSV may be corrupted."); }
    };
    reader.readAsText(file);
  };

  const clearHistory = () => {
    if (confirm("Wipe all data?")) { setHistory([]); localStorage.removeItem("boutiqueGymHistory"); }
  };

  // ─── GRAPH ────────────────────────────────────────────────────────────────────

  const renderGraph = () => {
    if (chartData.length < 2) return null;
    const W = 300, H = 90, px = 20, py = 25;
    const scores = chartData.map((d) => d.score);
    const maxS = Math.max(...scores), minS = Math.min(...scores);
    const yR = maxS === minS ? 1 : maxS - minS;
    const pts = chartData.map((d, i) => ({
      x: px + (i / (chartData.length - 1)) * (W - px * 2),
      y: H - py - ((d.score - minS) / yR) * (H - py * 2),
      ...d,
    }));
    return (
      <div className="mt-5 pt-4 border-t border-gray-100/50">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Progression</p>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#A9C2A3]">Trend</p>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24 overflow-visible">
          <path d={`M ${pts.map((p) => `${p.x} ${p.y}`).join(" L ")}`} fill="none" stroke="#A9C2A3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-50" />
          {pts.map((p, i) => (
            <g key={i}>
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#4B5563">
                {p.weight > 0 ? `${p.weight}x${p.reps}` : `${p.reps}r`}
              </text>
              <circle cx={p.x} cy={p.y} r="4" fill="#E8B4B8" stroke="white" strokeWidth="1.5" />
              <text x={p.x} y={H - 2} textAnchor="middle" fontSize="9" fill="#9CA3AF" fontWeight="600">{p.date}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  // ─── HEATMAP ──────────────────────────────────────────────────────────────────

  const renderHeatmap = () => {
    if (!showHeatmap) return null;
    const { today, weeks, dayStats } = heatmapData;
    return (
      // ref attached here so the scroll effect can find this element
      <div ref={heatmapRef} className="mt-4 p-5 bg-white rounded-3xl border border-gray-100 flex flex-col items-center shadow-sm w-full">
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-4">Progression Calendar</p>
        <div className="w-full max-w-[280px]">
          <div className="flex mb-2">
            <div className="w-10" />
            <div className="flex-1 grid grid-cols-7 gap-2 text-center">
              {["M","T","W","T","F","S","S"].map((d, i) => <span key={i} className="text-[8px] font-bold text-gray-300">{d}</span>)}
            </div>
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex items-center mb-2">
              <div className="w-10 text-[8px] font-bold text-gray-400 text-right pr-2">
                {week[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
              <div className="flex-1 grid grid-cols-7 gap-2">
                {week.map((d) => {
                  const ts = d.getTime(), s = dayStats.get(ts) || { total: 0, progress: 0 };
                  const isNow = ts === today.getTime(), isFuture = ts > today.getTime();
                  let bg = "bg-gray-100/50";
                  if (s.total > 0 && s.progress === 0) bg = "bg-[#A9C2A3]/40";
                  if (s.progress > 0) bg = "bg-[#A9C2A3] shadow-sm";
                  const info = s.total === 0 ? "Rest Day" : `${s.total} Logged · ${s.progress} Progress`;
                  return (
                    <button key={ts} disabled={isFuture}
                      onClick={() => { triggerHaptic(10); setSelectedHeatmapDate(`${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${info}`); }}
                      className={`w-full aspect-square rounded-[4px] transition-all ${bg} ${isNow ? "ring-2 ring-offset-2 ring-[#E8B4B8]/50" : ""} ${isFuture ? "opacity-20" : ""}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="h-4 mt-3 flex items-center justify-center">
          <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedHeatmapDate ? "text-[#E8B4B8]" : "text-gray-300"}`}>
            {selectedHeatmapDate || "Tap a square for details"}
          </p>
        </div>
        <div className="flex items-center justify-center space-x-4 mt-3 text-[8px] uppercase tracking-widest text-gray-400 font-bold w-full border-t border-gray-50 pt-4">
          {[["bg-gray-100/50", "Rest"], ["bg-[#A9C2A3]/40", "Maintain"], ["bg-[#A9C2A3]", "Progress"]].map(([bg, label]) => (
            <div key={label} className="flex items-center space-x-1.5">
              <div className={`w-2.5 h-2.5 rounded-[2px] ${bg}`} />
              <span className={label === "Progress" ? "text-[#A9C2A3]" : ""}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── ACTIVITY LOG MODAL ───────────────────────────────────────────────────────

  const renderActivityLog = () => {
    if (!isLogOpen) return null;

    const sortedGroups = activityLogGroups;

    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <div
          className="absolute inset-0 bg-white/60 backdrop-blur-sm"
          style={{ animation: "fadeInBlur 0.3s ease-out forwards" }}
          onClick={closeActivityLog}
        />
        <div
          className="relative w-full h-[92vh] bg-gray-50 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] overflow-y-auto pb-20"
          style={{ animation: "slideUpModal 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
        >
          <div className="sticky top-0 w-full pt-4 pb-2 bg-gray-50 z-10 flex justify-center rounded-t-[2rem] cursor-pointer" onClick={closeActivityLog}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </div>

          <div className="p-6 max-w-md mx-auto pt-2">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-light text-gray-800">Activity Log</h2>
              <button onClick={closeActivityLog} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-800 bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm">
                Close
              </button>
            </div>

            {history.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">Your log is empty.</p>}

            <div className="space-y-3">
              {sortedGroups.map(([exName, entries]) => {
                const isExpanded = expandedGroups.has(exName);
                const isHidden   = hiddenExercises.includes(exName);
                const latest     = entries[0];
                const dateStr    = new Date(latest.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();

                return (
                  <div key={exName} className={`rounded-2xl border transition-all ${isHidden ? "opacity-60" : ""} bg-white border-gray-100 shadow-sm`}>
                    <div onClick={() => toggleGroup(exName)} className="p-4 cursor-pointer flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] tracking-widest font-bold text-gray-400">{dateStr}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleHideExercise(exName); }}
                            className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 px-2 py-0.5 rounded-full"
                          >
                            {isHidden ? <IconEye size={12} /> : <IconEyeOff size={12} />}
                            {isHidden ? "HIDDEN" : "HIDE"}
                          </button>
                          {entries.length > 1 && (
                            <span className="text-[9px] uppercase tracking-widest font-bold text-[#A9C2A3] bg-[#A9C2A3]/10 px-2 py-0.5 rounded-full">
                              {entries.length} ENTRIES
                            </span>
                          )}
                        </div>
                        <p className="text-base font-bold text-gray-800 mb-1 flex items-baseline gap-1.5">
                          {exName}
                          <span className="text-xs font-normal text-gray-400 capitalize">
                            ({latest.category} • {getEquipmentLabel(latest.equipment)})
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 font-medium">
                          {latest.weight > 0 ? `${latest.weight}kg` : "Bodyweight"} • {latest.sets} sets of {latest.reps}
                        </p>
                      </div>
                      <div className="text-gray-300 shrink-0 ml-4 transition-transform duration-200" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-50 bg-gray-50/50">
                        <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Log History</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); renameExercise(exName); }}
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            <IconPencil size={12} /> RENAME ALL
                          </button>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {entries.map((entry) => (
                            <div key={entry.id} className={`p-4 flex flex-col transition-all ${editingId === entry.id ? "bg-white shadow-sm" : ""}`}>
                              {editingId === entry.id ? (
                                <div className="flex flex-col gap-4">
                                  <div className="flex justify-between items-center">
                                    <p className="text-sm font-bold text-[#E8B4B8]">Editing Entry</p>
                                    <input
                                      type="date"
                                      value={editForm.date}
                                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          document.getElementById(`edit-weight-${entry.id}`)?.focus();
                                        }
                                      }}
                                      className="text-xs bg-gray-50 border border-gray-200 rounded-md p-1 outline-none text-gray-600"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    {(["weight", "sets", "reps"] as const).map((field, fi) => {
                                      const ids = ["weight", "sets", "reps"];
                                      const nextId = ids[fi + 1] ? `edit-${ids[fi + 1]}-${entry.id}` : null;
                                      return (
                                        <div key={field} className="flex-1 bg-gray-50 rounded-xl p-2 border border-gray-100">
                                          <p className="text-[9px] uppercase font-bold text-gray-400 text-center mb-1">{field}</p>
                                          <input
                                            id={`edit-${field}-${entry.id}`}
                                            type="text"
                                            inputMode={field === "weight" ? "decimal" : "numeric"}
                                            enterKeyHint={nextId ? "next" : "done"}
                                            value={editForm[field]}
                                            onChange={(e) => setEditForm({ ...editForm, [field]: Number(e.target.value) })}
                                            onFocus={handleFocusSelect}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                if (nextId) {
                                                  document.getElementById(nextId)?.focus();
                                                } else {
                                                  blurKeyboard();
                                                  setTimeout(() => saveEdit(entry.id), 10);
                                                }
                                              }
                                            }}
                                            className="w-full bg-transparent text-center font-bold text-gray-800 outline-none"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="flex justify-end gap-2 mt-2">
                                    <button onClick={() => setEditingId(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600">Cancel</button>
                                    <button onClick={() => saveEdit(entry.id)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-[#E8B4B8] text-white rounded-lg shadow-sm">Save</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-between items-center w-full">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">
                                      {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
                                      {isToday(entry.date) && <span className="ml-2 text-[#E8B4B8]">· TODAY</span>}
                                    </p>
                                    <p className="text-xs text-gray-600 font-medium">
                                      {entry.weight > 0 ? `${entry.weight}kg` : "Bodyweight"} • {entry.sets} sets of {entry.reps}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => startEditing(entry)} className="text-gray-300 p-2 rounded-lg hover:bg-white hover:shadow-sm hover:text-[#E8B4B8] transition-all" title="Edit Entry">
                                      <IconPencil size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteEntry(entry.id, entry.id === todayRecord?.id)} className="text-red-300 p-2 rounded-lg hover:bg-white hover:shadow-sm hover:text-red-400 transition-all" title="Delete Entry">
                                      <IconTrash size={16} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200/60 flex justify-center items-center space-x-6">
              <input type="file" accept=".csv" onChange={importData} ref={fileInputRef} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-800 transition-colors">Import CSV</button>
              <button onClick={exportToCSV} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-800 transition-colors">Export CSV</button>
              <button onClick={clearHistory} className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors">Wipe Data</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── BADGE & CARD STYLE ───────────────────────────────────────────────────────

  const displayRecord = todayRecord || lastRecord;
  let cardBorder = "border-gray-100", cardBg = "bg-white", badge = null;
  if (displayRecord) {
    if (todayRecord && !isPR && !successMode)
      badge = <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Active</span>;
    if (isPR) {
      cardBorder = "border-[#E8B4B8] border-2"; cardBg = "bg-[#E8B4B8]/10";
      badge = <span className="text-[10px] bg-[#E8B4B8] text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest animate-pulse shadow-sm">New PR</span>;
    } else if (successMode) {
      cardBorder = "border-[#A9C2A3] border-2"; cardBg = "bg-[#A9C2A3]/15";
      badge = <span className="text-[10px] bg-[#A9C2A3] text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest shadow-sm">Progress</span>;
    }
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white text-gray-700 p-6 font-sans flex flex-col items-center pt-12 pb-20">
      <style>{`
        @keyframes slideUpModal {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeInBlur {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(4px); }
        }
      `}</style>

      {renderActivityLog()}

      <div className="w-full max-w-md space-y-8">

        <div className="text-center space-y-2">
          <h1 suppressHydrationWarning className="text-3xl font-light tracking-wide text-gray-800">{todayStr}</h1>
          <p className="text-sm text-gray-400">Log your workout, track your progress.</p>
        </div>

        {displayRecord && (
          <div className={`p-6 rounded-3xl transition-all duration-300 shadow-sm border ${cardBorder} ${cardBg}`}>
            <div className="flex justify-between items-center mb-1">
              <p className={`text-xs uppercase tracking-widest font-bold ${isPR ? "text-[#dca4a8]" : successMode ? "text-[#7A9374]" : "text-gray-400"}`}>
                {todayRecord ? "Today's Log" : "Last Time"} ({getEquipmentLabel(displayRecord.equipment)})
              </p>
              {badge}
            </div>
            <p className="text-xl font-medium text-gray-800">
              {displayRecord.weight > 0 ? `${displayRecord.weight}kg ` : ""}
              {displayRecord.reps} × {displayRecord.sets}
            </p>
            {todayRecord && !isPR && !successMode && (
              <p className="mt-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Updating will override this entry</p>
            )}
            {renderGraph()}
          </div>
        )}

        <div className="space-y-6">
          <div className="flex flex-col space-y-3">
            <div className="flex space-x-2">
              {(["upper", "lower", "core"] as const).map((cat) => (
                <button key={cat} onClick={() => { setCategory(cat); triggerHaptic(20); }}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-semibold transition-all duration-200 ${category === cat ? "bg-[#E8B4B8] text-white shadow-sm scale-[1.02]" : "bg-gray-50 text-gray-400 border border-gray-100"}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  id="exercise-input"
                  type="text"
                  placeholder="e.g., Leg Press"
                  enterKeyHint="next"
                  value={exercise}
                  onChange={(e) => { setExercise(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      document.getElementById("weight-input")?.focus();
                    }
                  }}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-4 outline-none focus:border-[#E8B4B8] text-lg"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
                    {suggestions.map((name) => {
                      const eq = equipmentMap.get(name);
                      const lastTime = exerciseLastDone.get(name);
                      const daysAgo = lastTime ? Math.floor((Date.now() - lastTime) / (1000 * 60 * 60 * 24)) : null;
                      return (
                        <button
                          key={name}
                          onMouseDown={() => handleSelectSuggestion(name)}
                          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-gray-400"><EquipmentIcon eq={eq} size={13} /></span>
                            <span className="text-sm font-medium text-gray-700">{name}</span>
                          </div>
                          {daysAgo !== null && (
                            <span className="text-[10px] font-semibold text-gray-400 shrink-0 ml-2">
                              {daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                onClick={() => { triggerHaptic(20); setEquipment(equipment === "free" ? "machine" : equipment === "machine" ? "bodyweight" : "free"); }}
                className="w-[64px] bg-gray-50 border border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1">
                <span className="text-gray-500"><EquipmentIcon eq={equipment} size={20} /></span>
                <span className="text-[7px] uppercase tracking-widest text-gray-400 font-bold">{getEquipmentLabel(equipment)}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50/50 border border-gray-200 rounded-2xl p-2 min-h-[60px]">
            <button onClick={() => handleDecrement(setWeight, weight)} className="w-14 h-12 rounded-xl flex items-center justify-center bg-white border border-gray-100 shadow-sm text-3xl text-gray-400 active:bg-gray-50 transition-colors">-</button>
            <div className="flex items-baseline justify-center flex-1">
              <input
                id="weight-input"
                type="number"
                inputMode="decimal"
                enterKeyHint="next"
                value={weight}
                onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))}
                onFocus={handleFocusSelect}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); document.getElementById("sets-input")?.focus(); }
                }}
                className="w-16 text-right bg-transparent outline-none font-semibold text-3xl text-gray-800"
              />
              <span className="text-sm font-bold text-gray-400 ml-1.5 uppercase tracking-wide">kg</span>
            </div>
            <button onClick={() => handleIncrement(setWeight, weight)} className="w-14 h-12 rounded-xl flex items-center justify-center bg-white border border-gray-100 shadow-sm text-3xl text-gray-400 active:bg-gray-50 transition-colors">+</button>
          </div>

          <div className="flex space-x-4">
            <div className="flex-1 bg-gray-50/50 border border-gray-200 rounded-2xl p-2 flex items-center justify-between shadow-sm">
              <button onClick={() => handleDecrement(setSets, sets)} className="w-10 h-10 flex items-center justify-center text-3xl text-gray-400 active:bg-gray-100 rounded-lg transition-colors">-</button>
              <div className="flex items-baseline justify-center">
                <input
                  id="sets-input"
                  type="number"
                  inputMode="numeric"
                  enterKeyHint="next"
                  value={sets}
                  onChange={(e) => setSets(e.target.value === "" ? "" : Number(e.target.value))}
                  onFocus={handleFocusSelect}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); document.getElementById("reps-input")?.focus(); }
                  }}
                  className="w-10 text-right bg-transparent outline-none font-semibold text-2xl text-gray-800"
                />
                <span className="text-xs font-bold text-gray-400 ml-1.5 uppercase tracking-wide">sets</span>
              </div>
              <button onClick={() => handleIncrement(setSets, sets)} className="w-10 h-10 flex items-center justify-center text-3xl text-gray-400 active:bg-gray-100 rounded-lg transition-colors">+</button>
            </div>

            <div className="flex-1 bg-gray-50/50 border border-gray-200 rounded-2xl p-2 flex items-center justify-between shadow-sm">
              <button onClick={() => handleDecrement(setReps, reps)} className="w-10 h-10 flex items-center justify-center text-3xl text-gray-400 active:bg-gray-100 rounded-lg transition-colors">-</button>
              <div className="flex items-baseline justify-center">
                <input
                  id="reps-input"
                  type="number"
                  inputMode="numeric"
                  enterKeyHint="done"
                  value={reps}
                  onChange={(e) => setReps(e.target.value === "" ? "" : Number(e.target.value))}
                  onFocus={handleFocusSelect}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      blurKeyboard();
                      if (exercise.trim().length >= 2) setTimeout(() => handleSave(), 10);
                    }
                  }}
                  className="w-10 text-right bg-transparent outline-none font-semibold text-2xl text-gray-800"
                />
                <span className="text-xs font-bold text-gray-400 ml-1.5 uppercase tracking-wide">reps</span>
              </div>
              <button onClick={() => handleIncrement(setReps, reps)} className="w-10 h-10 flex items-center justify-center text-3xl text-gray-400 active:bg-gray-100 rounded-lg transition-colors">+</button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          {todayRecord && (
            <button onClick={() => handleDeleteEntry(todayRecord.id, true)}
              className="min-h-[60px] px-5 rounded-xl border border-red-100 bg-red-50 text-red-400 transition-all shadow-sm flex items-center justify-center hover:bg-red-100"
              title="Delete today's entry">
              <IconTrash size={20} />
            </button>
          )}
          <button onClick={handleSave} disabled={!exercise || isSaved}
            className={`flex-1 min-h-[60px] rounded-xl text-lg font-medium tracking-wide transition-all ${isSaved ? "bg-[#A9C2A3] text-white" : "bg-[#E8B4B8] text-white shadow-sm disabled:opacity-40"}`}>
            {isSaved ? "Saved" : todayRecord ? "Update Set" : "Save Set"}
          </button>
        </div>

        {/* Session summary — only shown after at least one exercise is logged today */}
        {(todaySummary.upper + todaySummary.lower + todaySummary.core) > 0 && (
          <div className="rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4">
            <p className="text-[9px] uppercase tracking-widest font-bold text-gray-400 mb-2">Today&apos;s Session</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-[11px] font-bold uppercase tracking-widest">
                {todaySummary.upper > 0 && <span className="text-[#E8B4B8]">{todaySummary.upper} Upper</span>}
                {todaySummary.lower > 0 && <span className="text-[#A9C2A3]">{todaySummary.lower} Lower</span>}
                {todaySummary.core > 0 && <span className="text-[#7A9374]">{todaySummary.core} Core</span>}
              </div>
              {todayPRs > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#E8B4B8]/15 text-[#E8B4B8] px-2.5 py-1 rounded-full">
                  ✨ {todayPRs} {todayPRs === 1 ? "PR" : "PRs"}
                </span>
              )}
            </div>
          </div>
        )}

        {history.length === 0 ? (
          <div className="pt-8 border-t border-gray-100 space-y-4">
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
              <h3 className="text-gray-800 font-medium text-center">Welcome to your training log.</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Everything here is private and lives strictly on your device.</p>
              <ul className="text-xs text-gray-500 leading-relaxed space-y-3 bg-white p-4 rounded-2xl border border-gray-100">
                {[
                  ["🎯", "Tag your set", "Choose a muscle group and tap the equipment icon to switch between weights, machine, and bodyweight."],
                  ["📝", "Log your first set", "above to start tracking."],
                  ["📈", "Beat last time", "to see the card turn green."],
                  ["✨", "Hit an all-time high", "to unlock a pink PR badge."],
                  ["📜", "Activity Log", "tap it below to edit entries, rename exercises, or hide ones you no longer do."],
                  ["📊", "Progression Calendar", "shows your consistency and progress over the last 4 weeks."],
                  ["📲", "Save to your home screen", "to use it completely offline."],
                ].map(([emoji, strong, rest]) => (
                  <li key={strong} className="flex gap-2">
                    <span className="shrink-0">{emoji}</span>
                    <span><strong>{strong}</strong> {rest}</span>
                  </li>
                ))}
              </ul>

              {/* Import CSV — useful for migrating from another device */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 text-center mb-2 uppercase tracking-widest font-semibold">Migrating from another device?</p>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-[11px] font-bold uppercase tracking-widest text-gray-500 bg-white border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
                >
                  Import CSV
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-8 border-t border-gray-100 space-y-4">
            <div className="text-center">
              <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400">Your Exercises</h2>
            </div>

            {(["lower", "upper", "core"] as const).map((cat) =>
              groupedExercises[cat].filter((ex) => !hiddenExercises.includes(ex)).length > 0 && (
                <div key={cat} className="space-y-2 mt-4">
                  <p className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider ml-1">{cat} Body</p>
                  <div className="flex flex-wrap gap-2">
                    {groupedExercises[cat]
                      .filter((ex) => !hiddenExercises.includes(ex))
                      .map((ex, i) => {
                        const lastDoneTime = exerciseLastDone.get(ex) || 0;
                        const hoursSince = (Date.now() - lastDoneTime) / (1000 * 60 * 60);
                        // Named doneToday to avoid shadowing the isToday() function above
                        const doneToday = exercisesToday.has(ex);

                        let styleClass;
                        if (doneToday) {
                          styleClass = "bg-gray-50 text-[#E8B4B8] border border-gray-200";
                        } else if (hoursSince <= 48) {
                          styleClass = "bg-[#A9C2A3]/20 text-[#6B8565] ring-1 ring-[#A9C2A3]/30";
                        } else {
                          styleClass = "bg-[#A9C2A3] text-white shadow-sm";
                        }

                        return (
                          <button key={i} onClick={() => handleSelectPastExercise(ex, cat)}
                            className={`px-4 py-2 text-sm font-medium rounded-full flex items-center space-x-1.5 transition-all ${styleClass}`}>
                            {doneToday
                              ? <span className="text-[#E8B4B8]"><IconCheck size={14} /></span>
                              : <span className="opacity-70"><EquipmentIcon eq={equipmentMap.get(ex)} size={14} /></span>
                            }
                            <span>{ex}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )
            )}

            <div className="flex justify-center items-center space-x-4 pt-6 pb-1">
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-50 border border-gray-200" />
                <span className="text-[8px] uppercase tracking-widest font-bold text-[#E8B4B8]">Today</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#A9C2A3]/20 ring-1 ring-[#A9C2A3]/30" />
                <span className="text-[8px] uppercase tracking-widest font-bold text-[#6B8565]">Last 48h</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#A9C2A3]" />
                <span className="text-[8px] uppercase tracking-widest font-bold text-[#A9C2A3]">Fresh</span>
              </div>
            </div>

            <div className="flex justify-center pt-4 pb-2 gap-3">
              <button onClick={openActivityLog} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-full shadow-sm">
                Activity Log
              </button>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-full shadow-sm">
                {showHeatmap ? "Hide Calendar" : "Progression Calendar"}
              </button>
            </div>

            {renderHeatmap()}
          </div>
        )}
      </div>
    </div>
  );
}
