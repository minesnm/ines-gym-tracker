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

export default function GymTracker() {
  const [exercise, setExercise] = useState("");
  const [category, setCategory] = useState<"upper" | "lower" | "core">("lower");
  const [equipment, setEquipment] = useState<"free" | "machine" | "bodyweight">("free");
  const [weight, setWeight] = useState<number | "">(20);
  const [sets, setSets] = useState<number | "">(3);
  const [reps, setReps] = useState<number | "">(10);
  const [history, setHistory] = useState<Workout[]>([]);
  const [lastRecord, setLastRecord] = useState<Workout | null>(null);
  const [successMode, setSuccessMode] = useState(false);
  const [chartData, setChartData] = useState<{ date: string; maxWeight: number }[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  useEffect(() => {
    const saved = localStorage.getItem("boutiqueGymHistory");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const isToday = (dateString: string) => {
    const d1 = new Date(dateString);
    const d2 = new Date();
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  const todaySummary = useMemo(() => {
    const todayEntries = history.filter((item) => isToday(item.date));
    const upper = new Set(todayEntries.filter((i) => i.category === "upper").map((i) => i.exercise)).size;
    const lower = new Set(todayEntries.filter((i) => i.category === "lower").map((i) => i.exercise)).size;
    const core = new Set(todayEntries.filter((i) => i.category === "core").map((i) => i.exercise)).size;
    return { upper, lower, core };
  }, [history]);

  const groupedExercises = {
    upper: Array.from(new Set(history.filter((item) => item.category === "upper").map((item) => item.exercise))).reverse(),
    lower: Array.from(new Set(history.filter((item) => item.category === "lower").map((item) => item.exercise))).reverse(),
    core: Array.from(new Set(history.filter((item) => item.category === "core").map((item) => item.exercise))).reverse(),
  };

  const equipmentMap = new Map<string, string>();
  history.forEach((entry) => { equipmentMap.set(entry.exercise, entry.equipment || "free"); });

  const exercisesToday = new Set(history.filter((item) => isToday(item.date)).map((item) => item.exercise));

  const getEquipmentIcon = (eq: string) => {
    if (eq === "machine") return "🔩";
    if (eq === "bodyweight") return "💪";
    return "🏋️";
  };

  const getEquipmentLabel = (eq: string) => {
    if (eq === "machine") return "Machine";
    if (eq === "bodyweight") return "Body";
    return "Weights";
  };

  useEffect(() => {
    if (exercise.trim().length < 2) { setLastRecord(null); setSuccessMode(false); setChartData([]); return; }
    const normalize = (str: string) => str.toLowerCase().trim().replace(/s$/, "");
    const currentNorm = normalize(exercise);
    const matches = history.filter((entry) => normalize(entry.exercise) === currentNorm);

    if (matches.length > 0) {
      const sortedByDate = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const pastRecords = sortedByDate.filter((entry) => !isToday(entry.date));
      const recent = pastRecords.length > 0 ? pastRecords[0] : sortedByDate[0];
      setLastRecord(recent);
      if (recent.category) setCategory(recent.category);
      if (recent.equipment) setEquipment(recent.equipment);
      const w = typeof weight === "number" ? weight : 0;
      const s = typeof sets === "number" ? sets : 0;
      const r = typeof reps === "number" ? reps : 0;
      setSuccessMode(w > recent.weight || (w === recent.weight && s > recent.sets) || (w === recent.weight && s === recent.sets && r > recent.reps));
      const dailyMaxMap = new Map<string, number>();
      [...matches].reverse().forEach((entry) => {
        const dateStr = `${new Date(entry.date).getMonth() + 1}/${new Date(entry.date).getDate()}`;
        if (!dailyMaxMap.has(dateStr) || (dailyMaxMap.get(dateStr) || 0) < entry.weight) dailyMaxMap.set(dateStr, entry.weight);
      });
      setChartData(Array.from(dailyMaxMap, ([date, maxWeight]) => ({ date, maxWeight })));
    } else { setLastRecord(null); setSuccessMode(false); setChartData([]); }
  }, [exercise, history, weight, sets, reps]);

  const triggerHaptic = (pattern: number | number[]) => { if (typeof window !== "undefined" && window.navigator?.vibrate) window.navigator.vibrate(pattern); };
  
  const handleIncrement = (setter: React.Dispatch<React.SetStateAction<number | "">>, val: number | "") => { 
    triggerHaptic(30); 
    setter(typeof val === "number" ? val + 1 : 1); 
  };
  
  const handleDecrement = (setter: React.Dispatch<React.SetStateAction<number | "">>, val: number | "") => { 
    triggerHaptic(30); 
    setter(typeof val === "number" && val > 0 ? val - 1 : 0); 
  };

  const handleSelectPastExercise = (exName: string, cat: "upper" | "lower" | "core") => {
    triggerHaptic(20); setExercise(exName); setCategory(cat);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    const normalize = (str: string) => str.toLowerCase().trim().replace(/s$/, "");
    const matches = history.filter((entry) => normalize(entry.exercise) === normalize(exName));
    if (matches.length > 0) {
      const recent = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      setWeight(recent.weight); setSets(recent.sets); setReps(recent.reps); setEquipment(recent.equipment || "free");
    }
  };

  const handleSave = () => {
    if (!exercise) return;
    triggerHaptic([100, 50, 100]);
    const newEntry: Workout = { id: crypto.randomUUID(), exercise: exercise.trim(), category, equipment, weight: Number(weight) || 0, sets: Number(sets) || 0, reps: Number(reps) || 0, date: new Date().toISOString() };
    const updatedHistory = [...history, newEntry];
    setHistory(updatedHistory);
    localStorage.setItem("boutiqueGymHistory", JSON.stringify(updatedHistory));
    setExercise(""); setWeight(""); setSets(""); setReps(""); setSuccessMode(false); setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1500);
  };

  const exportToCSV = () => {
    triggerHaptic(50);
    const headers = ["Date", "Exercise", "Category", "Equipment", "Weight (kg)", "Sets", "Reps"];
    const rows = history.map(w => [
      new Date(w.date).toLocaleDateString(),
      w.exercise,
      w.category,
      w.equipment,
      w.weight,
      w.sets,
      w.reps
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `gym-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          if (confirm(`Import ${imported.length} records? This replaces current history.`)) {
            setHistory(imported);
            localStorage.setItem("boutiqueGymHistory", JSON.stringify(imported));
          }
        }
      } catch {
        alert("Please use a valid JSON backup file for imports."); 
      }
    };
    reader.readAsText(file);
  };

  const clearHistory = () => { if (confirm("Wipe all data?")) { setHistory([]); localStorage.removeItem("boutiqueGymHistory"); } };

  return (
    <div className="min-h-screen bg-white text-gray-700 p-6 font-sans flex flex-col items-center pt-12 pb-20">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light tracking-wide text-gray-800">{todayStr}</h1>
          <p className="text-sm text-gray-400">Log your workout, track your progress.</p>
        </div>

        {lastRecord && (
          <div className={`p-6 rounded-2xl transition-all duration-300 ${successMode ? "bg-[#A9C2A3]/10 border border-[#A9C2A3]/50" : "bg-white border border-gray-200 shadow-sm"}`}>
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Last Time ({getEquipmentLabel(lastRecord.equipment)})</p>
            <p className="text-xl font-medium text-gray-700">{lastRecord.weight > 0 ? `${lastRecord.weight}kg for ` : ""}{lastRecord.sets} × {lastRecord.reps}</p>
            {chartData.length >= 2 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <svg viewBox="0 0 300 60" className="w-full h-16 overflow-visible">
                  <path d={`M ${chartData.map((d, i) => `${10 + (i / (chartData.length - 1)) * 280} ${60 - 10 - ((d.maxWeight - Math.min(...chartData.map(w => w.maxWeight))) / (Math.max(...chartData.map(w => w.maxWeight)) === Math.min(...chartData.map(w => w.maxWeight)) ? 1 : Math.max(...chartData.map(w => w.maxWeight)) - Math.min(...chartData.map(w => w.maxWeight)))) * 40}`).join(' L ')}`} fill="none" stroke="#A9C2A3" strokeWidth="3" strokeLinecap="round" className="opacity-70" />
                </svg>
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          <div className="flex flex-col space-y-3">
            <div className="flex space-x-2">
              {(["upper", "lower", "core"] as const).map((cat) => (
                <button key={cat} onClick={() => { setCategory(cat); triggerHaptic(20); }} className={`flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-semibold transition-all duration-200 ${category === cat ? "bg-[#E8B4B8] text-white shadow-sm scale-[1.02]" : "bg-gray-50 text-gray-400 border border-gray-100"}`}>{cat}</button>
              ))}
            </div>
            <div className="flex space-x-2">
              <input type="text" placeholder="e.g., Leg Press" value={exercise} onChange={(e) => setExercise(e.target.value)} className="flex-1 bg-gray-50/50 border border-gray-200 rounded-xl p-4 outline-none focus:border-[#E8B4B8] text-lg" />
              <button onClick={() => { triggerHaptic(20); setEquipment(equipment === "free" ? "machine" : equipment === "machine" ? "bodyweight" : "free"); }} className="w-[60px] bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
                <span className="text-xl">{getEquipmentIcon(equipment)}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50/50 border border-gray-200 rounded-xl p-2 min-h-[60px]">
            <button onClick={() => handleDecrement(setWeight, weight)} className="w-14 h-12 rounded-lg flex items-center justify-center bg-white border border-gray-100 shadow-sm text-2xl text-gray-600">-</button>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))} className="w-20 text-center bg-transparent outline-none font-medium text-2xl" />
            <button onClick={() => handleIncrement(setWeight, weight)} className="w-14 h-12 rounded-lg flex items-center justify-center bg-white border border-gray-100 shadow-sm text-2xl text-gray-600">+</button>
          </div>

          <div className="flex space-x-4">
            <div className="flex-1 bg-gray-50/50 border border-gray-200 rounded-xl p-1 flex items-center justify-between px-3">
              <button onClick={() => handleDecrement(setSets, sets)} className="text-xl px-2 text-gray-400">-</button>
              <input type="number" value={sets} onChange={(e) => setSets(e.target.value === "" ? "" : Number(e.target.value))} className="w-10 text-center bg-transparent outline-none font-medium text-lg" />
              <button onClick={() => handleIncrement(setSets, sets)} className="text-xl px-2 text-gray-400">+</button>
            </div>
            <div className="flex-1 bg-gray-50/50 border border-gray-200 rounded-xl p-1 flex items-center justify-between px-3">
              <button onClick={() => handleDecrement(setReps, reps)} className="text-xl px-2 text-gray-400">-</button>
              <input type="number" value={reps} onChange={(e) => setReps(e.target.value === "" ? "" : Number(e.target.value))} className="w-10 text-center bg-transparent outline-none font-medium text-lg" />
              <button onClick={() => handleIncrement(setReps, reps)} className="text-xl px-2 text-gray-400">+</button>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={!exercise || isSaved} className={`w-full mt-4 min-h-[60px] rounded-xl text-lg font-medium tracking-wide transition-all ${isSaved ? "bg-[#A9C2A3] text-white" : "bg-[#E8B4B8] text-white shadow-sm disabled:opacity-40"}`}>
          {isSaved ? "✓ Saved" : "Save Set"}
        </button>

        <div className="pt-8 border-t border-gray-100 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400">Today&apos;s Plan & History</h2>
            <div className="flex justify-center space-x-3 text-[10px] font-bold uppercase tracking-widest">
               <span className={todaySummary.upper > 0 ? "text-[#E8B4B8]" : "text-gray-300"}>{todaySummary.upper} Upper</span>
               <span className="text-gray-200">•</span>
               <span className={todaySummary.lower > 0 ? "text-[#A9C2A3]" : "text-gray-300"}>{todaySummary.lower} Lower</span>
               <span className="text-gray-200">•</span>
               <span className={todaySummary.core > 0 ? "text-[#7A9374]" : "text-gray-300"}>{todaySummary.core} Core</span>
            </div>
          </div>

          {(["lower", "upper", "core"] as const).map((cat) => groupedExercises[cat].length > 0 && (
            <div key={cat} className="space-y-2">
              <p className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider ml-1">{cat} Body</p>
              <div className="flex flex-wrap gap-2">
                {groupedExercises[cat].map((ex, i) => (
                  <button key={i} onClick={() => handleSelectPastExercise(ex, cat)} className={`px-4 py-2 text-sm font-medium rounded-full flex items-center space-x-1.5 ${exercisesToday.has(ex) ? "bg-[#A9C2A3]/15 text-[#6B8565]" : "bg-[#A9C2A3] text-white"}`}>
                    <span>{getEquipmentIcon(equipmentMap.get(ex))}</span>
                    <span>{ex}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-12 flex justify-center items-center space-x-6 opacity-30 hover:opacity-100 transition-opacity">
          <input type="file" accept=".json" onChange={importData} ref={fileInputRef} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-800">↑ Import</button>
          <button onClick={exportToCSV} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-800">↓ Export CSV</button>
          <button onClick={clearHistory} className="text-[10px] font-bold uppercase tracking-widest text-red-400">× Wipe</button>
        </div>
      </div>
    </div>
  );
}
