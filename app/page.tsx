"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";

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

// Single normalize function — lowercase + trim.
// No .replace(/s$/, "") which caused false matches (e.g. "Press" → "Pre").
const normalize = (str: string) => str.toLowerCase().trim();

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
// Using SVG throughout keeps the UI consistent and professional.
// No emojis in interactive controls.

const IconTrash = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

// Eye open — used when the exercise is hidden (tap to restore)
const IconEye = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// Eye with slash — used when the exercise is visible (tap to hide)
const IconEyeOff = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// Pencil — rename button
const IconPencil = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

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

  // Which exercise groups are open in the Activity Log. All collapsed by default
  // so the log opens as a clean scannable list of exercise names.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Hidden exercises: only affects pill visibility on the main page.
  // History is always preserved.
  const [hiddenExercises, setHiddenExercises] = useState<string[]>([]);

  // Editing state for Activity Log
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: "", weight: 0, sets: 0, reps: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });

  useEffect(() => {
    const saved = localStorage.getItem("boutiqueGymHistory");
    if (saved) setHistory(JSON.parse(saved));
    const savedHidden = localStorage.getItem("boutiqueGymHidden");
    if (savedHidden) setHiddenExercises(JSON.parse(savedHidden));
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("Offline mode activated!"))
        .catch((err) => console.error("Offline mode failed:", err));
    }
  }, []);

  // ─── NATIVE GESTURE INTERCEPTION ───────────────────────────────────────────────
  
  const openActivityLog = () => {
    window.history.pushState({ modal: "activityLog" }, "");
    setIsLogOpen(true);
  };

  const closeActivityLog = () => {
    // If the dummy state is still there, navigating back will naturally close the log via the popstate listener
    if (window.history.state?.modal === "activityLog") {
      window.history.back();
    } else {
      // Fallback in case history was manipulated
      setIsLogOpen(false);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      // If the user triggers the system back gesture, we close the log
      if (isLogOpen) {
        setIsLogOpen(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isLogOpen]);

  // ─────────────────────────────────────────────────────────────────────────────

  const isToday = (dateString: string) => {
    const d1 = new Date(dateString), d2 = new Date();
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  const todaySummary = useMemo(() => {
    const t = history.filter((i) => isToday(i.date));
    return {
      upper: new Set(t.filter((i) => i.category === "upper").map((i) => i.exercise)).size,
      lower: new Set(t.filter((i) => i.category === "lower").map((i) => i.exercise)).size,
      core:  new Set(t.filter((i) => i.category === "core" ).map((i) => i.exercise)).size,
    };
  }, [history]);

  // Map to store the absolute latest timestamp each exercise was performed
  // Used to calculate "Fatigue Fade" opacities.
  const exerciseLastDone = useMemo(() => {
    const map = new Map<string, number>();
    history.forEach(entry => {
      const time = new Date(entry.date).getTime();
      const existing = map.get(entry.exercise) || 0;
      if (time > existing) {
        map.set(entry.exercise, time);
      }
    });
    return map;
  }, [history]);

  // Sort history newest first so Set grabs the most recently performed exercises
  const recentHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const groupedExercises = {
    upper: Array.from(new Set(recentHistory.filter((i) => i.category === "upper").map((i) => i.exercise))),
    lower: Array.from(new Set(recentHistory.filter((i) => i.category === "lower").map((i) => i.exercise))),
    core:  Array.from(new Set(recentHistory.filter((i) => i.category === "core" ).map((i) => i.exercise))),
  };

  const equipmentMap = new Map<string, string>();
  history.forEach((e) => { equipmentMap.set(e.exercise, e.equipment || "free"); });
  const exercisesToday = new Set(history.filter((i) => isToday(i.date)).map((i) => i.exercise));

  const getEquipmentIcon  = (eq?: string) => eq === "machine" ? "🔩" : eq === "bodyweight" ? "💪" : "🏋️";
  const getEquipmentLabel = (eq: string)  => eq === "machine" ? "Machine" : eq === "bodyweight" ? "Body" : "Weights";

  const calculateScore = (w: number, r: number) => w === 0 ? r : w * (1 + r / 30);

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
    setSuccessMode(!!lastRecord && (w > lastRecord.weight || (w === lastRecord.weight && s > lastRecord.sets) || (w === lastRecord.weight && s === lastRecord.sets && r > lastRecord.reps)));
  }, [weight, sets, reps, lastRecord, maxHistoricalScore]);

  const triggerHaptic = (p: number | number[]) => { if (typeof window !== "undefined" && window.navigator?.vibrate) window.navigator.vibrate(p); };

  const handleIncrement = (setter: React.Dispatch<React.SetStateAction<number | "">>, val: number | "") => { triggerHaptic(30); setter(typeof val === "number" ? val + 1 : 1); };
  const handleDecrement = (setter: React.Dispatch<React.SetStateAction<number | "">>, val: number | "") => { triggerHaptic(30); setter(typeof val === "number" && val > 0 ? val - 1 : 0); };

  const handleSelectPastExercise = (exName: string, cat: "upper" | "lower" | "core") => {
    triggerHaptic(20); setExercise(exName); setCategory(cat);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    const recent = [...history].filter((e) => normalize(e.exercise) === normalize(exName)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    if (recent) { setWeight(recent.weight); setSets(recent.sets); setReps(recent.reps); setEquipment(recent.equipment || "free"); }
  };

  const handleSave = () => {
    if (!exercise) return;
    triggerHaptic([100, 50, 100]);
    const norm = normalize(exercise);
    const idx = history.findIndex((e) => isToday(e.date) && normalize(e.exercise) === norm);
    const updated = idx >= 0
      ? history.map((e, i) => i === idx ? { ...e, category, equipment, weight: Number(weight) || 0, sets: Number(sets) || 0, reps: Number(reps) || 0, date: new Date().toISOString() } : e)
      : [...history, { id: crypto.randomUUID(), exercise: exercise.trim(), category, equipment, weight: Number(weight) || 0, sets: Number(sets) || 0, reps: Number(reps) || 0, date: new Date().toISOString() }];
    setHistory(updated);
    localStorage.setItem("boutiqueGymHistory", JSON.stringify(updated));
    setExercise(""); setWeight(""); setSets(""); setReps("");
    setSuccessMode(false); setIsPR(false); setIsSaved(true); setShowHeatmap(true);
    setTimeout(() => setIsSaved(false), 1500);
  };

  const startEditing = (entry: Workout) => {
    triggerHaptic(20);
    setEditingId(entry.id);
    setEditForm({
      date: entry.date.split('T')[0], 
      weight: entry.weight,
      sets: entry.sets,
      reps: entry.reps
    });
  };

  const saveEdit = (id: string) => {
    triggerHaptic([50, 50]);
    const updatedHistory = history.map(h => {
      if (h.id === id) {
        const updatedDate = new Date(`${editForm.date}T12:00:00`).toISOString();
        return { ...h, weight: Number(editForm.weight), sets: Number(editForm.sets), reps: Number(editForm.reps), date: updatedDate };
      }
      return h;
    });
    setHistory(updatedHistory);
    localStorage.setItem("boutiqueGymHistory", JSON.stringify(updatedHistory));
    setEditingId(null);
  };

  // Deletes one specific entry by id.
  // isFromActiveCard resets the form when deleting via the button next to Save.
  const handleDeleteEntry = (id: string, isFromActiveCard = false) => {
    if (!confirm("Permanently delete this entry?")) return;
    triggerHaptic([50, 50]);
    const updated = history.filter((e) => e.id !== id);
    setHistory(updated);
    localStorage.setItem("boutiqueGymHistory", JSON.stringify(updated));
    if (isFromActiveCard) { setExercise(""); setWeight(30); setSets(3); setReps(10); }
  };

  // Renames every entry for a given exercise in one operation.
  const renameExercise = (oldName: string) => {
    const newName = window.prompt(`Rename "${oldName}" to:`, oldName);
    if (!newName || newName.trim() === "" || newName.trim() === oldName) return;
    triggerHaptic(50);
    const updated = history.map((e) => normalize(e.exercise) === normalize(oldName) ? { ...e, exercise: newName.trim() } : e);
    setHistory(updated);
    localStorage.setItem("boutiqueGymHistory", JSON.stringify(updated));
  };

  // Toggles pill visibility on the main page. History is never affected.
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
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
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
          setHistory(workouts); localStorage.setItem("boutiqueGymHistory", JSON.stringify(workouts)); triggerHaptic([50, 100, 50]);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch { alert("Import failed. The CSV may be corrupted."); }
    };
    reader.readAsText(file);
  };

  const clearHistory = () => { if (confirm("Wipe all data?")) { setHistory([]); localStorage.removeItem("boutiqueGymHistory"); } };

  // ─── GRAPH ────────────────────────────────────────────────────────────────────

  const renderGraph = () => {
    if (chartData.length < 2) return null;
    const W = 300, H = 90, px = 20, py = 25;
    const scores = chartData.map((d) => d.score);
    const maxS = Math.max(...scores), minS = Math.min(...scores);
    const yR = maxS === minS ? 1 : maxS - minS;
    const pts = chartData.map((d, i) => ({ x: px + (i / (chartData.length - 1)) * (W - px * 2), y: H - py - ((d.score - minS) / yR) * (H - py * 2), ...d }));
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
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#4B5563">{p.weight > 0 ? `${p.weight}x${p.reps}` : `${p.reps}r`}</text>
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
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dow = today.getDay();
    const start = new Date(today); start.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) - 21);
    const days: Date[] = []; const cur = new Date(start);
    for (let i = 0; i < 28; i++) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lastSeen = new Map<string, Workout>(), bestScore = new Map<string, number>();
    const dayStats = new Map<number, { total: number; progress: number }>();
    
    sorted.forEach((entry) => {
      const d = new Date(entry.date); d.setHours(0, 0, 0, 0); const ts = d.getTime();
      if (!dayStats.has(ts)) dayStats.set(ts, { total: 0, progress: 0 });
      const stats = dayStats.get(ts)!; stats.total++;
      const prev = lastSeen.get(entry.exercise);
      const score = calculateScore(entry.weight, entry.reps);
      const best = bestScore.get(entry.exercise) || 0;
      
      const progress = (score > best && best > 0) || (!!prev && (entry.weight > prev.weight || (entry.weight === prev.weight && entry.sets > prev.sets) || (entry.weight === prev.weight && entry.sets === prev.sets && entry.reps > prev.reps)));
      if (progress) stats.progress++;
      
      lastSeen.set(entry.exercise, entry);
      if (score > best) bestScore.set(entry.exercise, score);
    });
    const weeks: Date[][] = []; for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return (
      <div className="mt-4 p-5 bg-white rounded-3xl border border-gray-100 flex flex-col items-center shadow-sm w-full">
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
              <div className="w-10 text-[8px] font-bold text-gray-400 text-right pr-2">{week[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
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
          <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedHeatmapDate ? "text-[#E8B4B8]" : "text-gray-300"}`}>{selectedHeatmapDate || "Tap a square for details"}</p>
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

    const grouped = new Map<string, Workout[]>();
    [...history]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach((entry) => {
        if (!grouped.has(entry.exercise)) grouped.set(entry.exercise, []);
        grouped.get(entry.exercise)!.push(entry);
      });

    const sortedGroups = Array.from(grouped.entries()).sort(
      (a, b) => new Date(b[1][0].date).getTime() - new Date(a[1][0].date).getTime()
    );

    return (
      <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto pb-20">
        <div className="p-6 max-w-md mx-auto pt-12">

          {/* Header */}
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

                  {/* Summary Header (Styled exactly like the screenshot) */}
                  <div
                    onClick={() => toggleGroup(exName)}
                    className="p-4 cursor-pointer flex justify-between items-center"
                  >
                    <div className="flex-1">
                      {/* Top Row: Date & Hide Button */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] tracking-widest font-bold text-gray-400">
                          {dateStr}
                        </span>
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

                      {/* Middle Row: Exercise & Category */}
                      <p className="text-base font-bold text-gray-800 mb-1 flex items-baseline gap-1.5">
                        {exName}
                        <span className="text-xs font-normal text-gray-400 capitalize">
                          ({latest.category} • {getEquipmentLabel(latest.equipment)})
                        </span>
                      </p>

                      {/* Bottom Row: Weight & Reps summary */}
                      <p className="text-xs text-gray-500 font-medium">
                        {latest.weight > 0 ? `${latest.weight}kg` : "Bodyweight"} • {latest.sets} sets of {latest.reps}
                      </p>
                    </div>

                    {/* Expand Chevron */}
                    <div className="text-gray-300 shrink-0 ml-4 transition-transform duration-200" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>

                  {/* Expanded: History & Edit Controls */}
                  {isExpanded && (
                    <div className="border-t border-gray-50 bg-gray-50/50">
                      <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Log History</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); renameExercise(exName); }}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <IconPencil size={12}/> RENAME ALL
                        </button>
                      </div>

                      <div className="divide-y divide-gray-50">
                        {entries.map((entry) => (
                          <div key={entry.id} className={`p-4 flex flex-col transition-all ${editingId === entry.id ? 'bg-white shadow-sm' : ''}`}>
                            
                            {editingId === entry.id ? (
                              <div className="flex flex-col gap-4 animate-fade-in">
                                <div className="flex justify-between items-center">
                                  <p className="text-sm font-bold text-[#E8B4B8]">Editing Entry</p>
                                  <input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} className="text-xs bg-gray-50 border border-gray-200 rounded-md p-1 outline-none text-gray-600" />
                                </div>
                                <div className="flex gap-2">
                                  <div className="flex-1 bg-gray-50 rounded-xl p-2 border border-gray-100">
                                    <p className="text-[9px] uppercase font-bold text-gray-400 text-center mb-1">Weight</p>
                                    <input type="number" value={editForm.weight} onChange={(e) => setEditForm({...editForm, weight: Number(e.target.value)})} className="w-full bg-transparent text-center font-bold text-gray-800 outline-none" />
                                  </div>
                                  <div className="flex-1 bg-gray-50 rounded-xl p-2 border border-gray-100">
                                    <p className="text-[9px] uppercase font-bold text-gray-400 text-center mb-1">Sets</p>
                                    <input type="number" value={editForm.sets} onChange={(e) => setEditForm({...editForm, sets: Number(e.target.value)})} className="w-full bg-transparent text-center font-bold text-gray-800 outline-none" />
                                  </div>
                                  <div className="flex-1 bg-gray-50 rounded-xl p-2 border border-gray-100">
                                    <p className="text-[9px] uppercase font-bold text-gray-400 text-center mb-1">Reps</p>
                                    <input type="number" value={editForm.reps} onChange={(e) => setEditForm({...editForm, reps: Number(e.target.value)})} className="w-full bg-transparent text-center font-bold text-gray-800 outline-none" />
                                  </div>
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
        </div>
      </div>
    );
  };

  // ─── BADGE & CARD ─────────────────────────────────────────────────────────────

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
      {renderActivityLog()}

      <div className="w-full max-w-md space-y-8">

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light tracking-wide text-gray-800">{todayStr}</h1>
          <p className="text-sm text-gray-400">Log your workout, track your progress.</p>
        </div>

        {/* Last record / Today's log card */}
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

        {/* Input form */}
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
              <input type="text" placeholder="e.g., Leg Press" value={exercise} onChange={(e) => setExercise(e.target.value)}
                className="flex-1 bg-gray-50/50 border border-gray-200 rounded-xl p-4 outline-none focus:border-[#E8B4B8] text-lg" />
              <button onClick={() => { triggerHaptic(20); setEquipment(equipment === "free" ? "machine" : equipment === "machine" ? "bodyweight" : "free"); }}
                className="w-[64px] bg-gray-50 border border-gray-200 rounded-xl flex flex-col items-center justify-center">
                <span className="text-xl mb-0.5">{getEquipmentIcon(equipment)}</span>
                <span className="text-[7px] uppercase tracking-widest text-gray-400 font-bold">{getEquipmentLabel(equipment)}</span>
              </button>
            </div>
          </div>

          {/* Weight */}
          <div className="flex items-center justify-between bg-gray-50/50 border border-gray-200 rounded-2xl p-2 min-h-[60px]">
            <button onClick={() => handleDecrement(setWeight, weight)} className="w-14 h-12 rounded-xl flex items-center justify-center bg-white border border-gray-100 shadow-sm text-3xl text-gray-400 active:bg-gray-50 transition-colors">-</button>
            <div className="flex items-baseline justify-center flex-1">
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))} className="w-16 text-right bg-transparent outline-none font-semibold text-3xl text-gray-800" />
              <span className="text-sm font-bold text-gray-400 ml-1.5 uppercase tracking-wide">kg</span>
            </div>
            <button onClick={() => handleIncrement(setWeight, weight)} className="w-14 h-12 rounded-xl flex items-center justify-center bg-white border border-gray-100 shadow-sm text-3xl text-gray-400 active:bg-gray-50 transition-colors">+</button>
          </div>

          {/* Sets & Reps */}
          <div className="flex space-x-4">
            {([["sets", sets, setSets], ["reps", reps, setReps]] as const).map(([label, val, setter]) => (
              <div key={label} className="flex-1 bg-gray-50/50 border border-gray-200 rounded-2xl p-2 flex items-center justify-between shadow-sm">
                <button onClick={() => handleDecrement(setter, val)} className="w-10 h-10 flex items-center justify-center text-3xl text-gray-400 active:bg-gray-100 rounded-lg transition-colors">-</button>
                <div className="flex items-baseline justify-center">
                  <input type="number" value={val} onChange={(e) => setter(e.target.value === "" ? "" : Number(e.target.value))} className="w-10 text-right bg-transparent outline-none font-semibold text-2xl text-gray-800" />
                  <span className="text-xs font-bold text-gray-400 ml-1.5 uppercase tracking-wide">{label}</span>
                </div>
                <button onClick={() => handleIncrement(setter, val)} className="w-10 h-10 flex items-center justify-center text-3xl text-gray-400 active:bg-gray-100 rounded-lg transition-colors">+</button>
              </div>
            ))}
          </div>
        </div>

        {/* Save row — trash icon only appears when there is a today entry to undo */}
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

        {/* Empty state / history */}
        {history.length === 0 ? (
          <div className="pt-8 border-t border-gray-100 space-y-4">
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
              <h3 className="text-gray-800 font-medium text-center">Welcome to your training log.</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Everything here is private and lives strictly on your device.</p>
              <ul className="text-xs text-gray-500 leading-relaxed space-y-3 bg-white p-4 rounded-2xl border border-gray-100">
                {[
                  ["Tag your set", "Choose a muscle group and tap the equipment icon to switch between weights, machine, and bodyweight."],
                  ["Log your first set", "above to start tracking."],
                  ["Beat last time", "to see the card turn green."],
                  ["Hit an all-time high", "to unlock a pink PR badge."],
                  ["Save to your home screen", "to use it completely offline."],
                ].map(([strong, rest]) => (
                  <li key={strong} className="flex gap-2">
                    <span className="text-gray-300 shrink-0">·</span>
                    <span><strong>{strong}</strong> {rest}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="pt-8 border-t border-gray-100 space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400">Your Exercises</h2>
              <div className="flex justify-center space-x-3 text-[10px] font-bold uppercase tracking-widest">
                <span className={todaySummary.upper > 0 ? "text-[#E8B4B8]" : "text-gray-300"}>{todaySummary.upper} Upper</span>
                <span className="text-gray-200">·</span>
                <span className={todaySummary.lower > 0 ? "text-[#A9C2A3]" : "text-gray-300"}>{todaySummary.lower} Lower</span>
                <span className="text-gray-200">·</span>
                <span className={todaySummary.core > 0 ? "text-[#7A9374]" : "text-gray-300"}>{todaySummary.core} Core</span>
              </div>
            </div>

            {/* Exercise pills — hidden exercises filtered out silently */}
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
                        const isToday = exercisesToday.has(ex);
                
                        let styleClass;
                        
                        if (isToday) {
                            // Active Today (Lightest - Ghosted gray)
                            styleClass = "bg-gray-50 text-gray-400 border border-gray-100 opacity-50";
                        } else if (hoursSince < 24) {
                            // Severely fatigued (0-24h - Light green wash)
                            styleClass = "bg-[#A9C2A3]/20 text-[#6B8565] ring-1 ring-[#A9C2A3]/30"; 
                        } else if (hoursSince < 48) {
                            // Partially fatigued (24-48h - Medium solid green)
                            styleClass = "bg-[#A9C2A3]/60 text-white shadow-sm"; 
                        } else {
                            // Fresh (48h+ - Solid green)
                            styleClass = "bg-[#A9C2A3] text-white shadow-sm"; 
                        }

                        return (
                          <button key={i} onClick={() => handleSelectPastExercise(ex, cat)}
                            className={`px-4 py-2 text-sm font-medium rounded-full flex items-center space-x-1.5 transition-all ${styleClass}`}>
                            <span>{getEquipmentIcon(equipmentMap.get(ex))}</span>
                            <span>{ex}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )
            )}

            {/* Recovery Legend */}
            <div className="flex justify-center items-center space-x-4 pt-6 pb-1">
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-100 border border-gray-200"></div>
                <span className="text-[8px] uppercase tracking-widest font-bold text-gray-400">Last 24h</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#A9C2A3]/50"></div>
                <span className="text-[8px] uppercase tracking-widest font-bold text-gray-400">Last 48h</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#A9C2A3]"></div>
                <span className="text-[8px] uppercase tracking-widest font-bold text-[#A9C2A3]">Previous</span>
              </div>
            </div>

            <div className="flex justify-center pt-4 pb-2 gap-3">
              <button onClick={openActivityLog} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-full shadow-sm">
                Activity Log
              </button>
              <button onClick={() => setShowHeatmap(!showHeatmap)} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-full shadow-sm">
                {showHeatmap ? "Hide Calendar" : "Progression Calendar"}
              </button>
            </div>

            {renderHeatmap()}
          </div>
        )}

        {/* Utility bar — fades in on hover so it doesn't clutter the main view */}
        <div className="pt-12 flex justify-center items-center space-x-6 opacity-30 hover:opacity-100 transition-opacity">
          <input type="file" accept=".csv" onChange={importData} ref={fileInputRef} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-800">Import CSV</button>
          <button onClick={exportToCSV} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-800">Export CSV</button>
          <button onClick={clearHistory} className="text-[10px] font-bold uppercase tracking-widest text-red-400">Wipe</button>
        </div>

      </div>
    </div>
  );
}
