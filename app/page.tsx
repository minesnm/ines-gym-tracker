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
  const [selectedHeatmapDate, setSelectedHeatmapDate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  useEffect(() => {
    const saved = localStorage.getItem("boutiqueGymHistory");
    if (saved) setHistory(JSON.parse(saved));

    if (typeof window !== "undefined" && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Offline mode activated!'))
        .catch((error) => console.error('Offline mode failed:', error));
    }
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

  const getEquipmentIcon = (eq?: string) => {
    if (eq === "machine") return "🔩";
    if (eq === "bodyweight") return "💪";
    return "🏋️";
  };
  const getEquipmentLabel = (eq: string) => {
    if (eq === "machine") return "Machine";
    if (eq === "bodyweight") return "Body";
    return "Weights";
  };

  const calculateScore = (w: number, r: number) => {
    if (w === 0) return r; 
    return w * (1 + r / 30); 
  };

  useEffect(() => {
    if (exercise.trim().length < 2) { 
      setLastRecord(null); 
      setTodayRecord(null);
      setMaxHistoricalScore(0);
      setChartData([]); 
      return; 
    }
    
    const normalize = (str: string) => str.toLowerCase().trim().replace(/s$/, "");
    const currentNorm = normalize(exercise);
    const matches = history.filter((entry) => normalize(entry.exercise) === currentNorm);

    if (matches.length > 0) {
      const maxScore = Math.max(...matches.map(m => calculateScore(m.weight, m.reps)));
      setMaxHistoricalScore(maxScore);

      const sortedByDate = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const tRecord = sortedByDate.find(entry => isToday(entry.date)) || null;
      const pastRecords = sortedByDate.filter((entry) => !isToday(entry.date));
      const lRecord = pastRecords.length > 0 ? pastRecords[0] : null;
      
      setTodayRecord(tRecord);
      setLastRecord(lRecord);

      const refRecord = tRecord || lRecord;
      if (refRecord) {
        setCategory(refRecord.category);
        setEquipment(refRecord.equipment || "free");
      }
      
      const dailyMaxMap = new Map<number, { dateStr: string, weight: number, reps: number, score: number }>();
      matches.forEach((entry) => {
        const dateObj = new Date(entry.date);
        dateObj.setHours(0, 0, 0, 0); 
        const ts = dateObj.getTime();
        const score = calculateScore(entry.weight, entry.reps);
        
        if (!dailyMaxMap.has(ts) || dailyMaxMap.get(ts)!.score < score) {
          const day = dateObj.getDate();
          const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
          dailyMaxMap.set(ts, { dateStr: `${day}/${month}`, weight: entry.weight, reps: entry.reps, score });
        }
      });
      
      const chartPoints = Array.from(dailyMaxMap.entries())
        .sort((a, b) => a[0] - b[0]) 
        .map(([, data]) => ({ date: data.dateStr, weight: data.weight, reps: data.reps, score: data.score }))
        .slice(-7);
        
      setChartData(chartPoints);
    } else { 
      setLastRecord(null); 
      setTodayRecord(null);
      setMaxHistoricalScore(0);
      setChartData([]); 
    }
  }, [exercise, history]);

  useEffect(() => {
    const w = typeof weight === "number" ? weight : 0;
    const s = typeof sets === "number" ? sets : 0;
    const r = typeof reps === "number" ? reps : 0;

    const currentScore = calculateScore(w, r);

    setIsPR(currentScore > maxHistoricalScore && maxHistoricalScore > 0);

    if (lastRecord) {
      setSuccessMode(
        w > lastRecord.weight || 
        (w === lastRecord.weight && s > lastRecord.sets) || 
        (w === lastRecord.weight && s === lastRecord.sets && r > lastRecord.reps)
      );
    } else {
      setSuccessMode(false);
    }
  }, [weight, sets, reps, lastRecord, maxHistoricalScore]);

  const triggerHaptic = (pattern: number | number[]) => { if (typeof window !== "undefined" && window.navigator?.vibrate) window.navigator.vibrate(pattern); };
  
  const handleIncrement = (setter: React.Dispatch<React.SetStateAction<number | "">>, val: number | "") => { 
    triggerHaptic(30); setter(typeof val === "number" ? val + 1 : 1); 
  };
  const handleDecrement = (setter: React.Dispatch<React.SetStateAction<number | "">>, val: number | "") => { 
    triggerHaptic(30); setter(typeof val === "number" && val > 0 ? val - 1 : 0); 
  };

  const handleSelectPastExercise = (exName: string, cat: "upper" | "lower" | "core") => {
    triggerHaptic(20); setExercise(exName); setCategory(cat);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    const normalize = (str: string) => str.toLowerCase().trim().replace(/s$/, "");
    const matches = history.filter((entry) => normalize(entry.exercise) === normalize(exName));
    if (matches.length > 0) {
      const sortedByDate = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const recent = sortedByDate[0];
      setWeight(recent.weight); setSets(recent.sets); setReps(recent.reps); setEquipment(recent.equipment || "free");
    }
  };

  const handleSave = () => {
    if (!exercise) return;
    triggerHaptic([100, 50, 100]);
    
    const normalize = (str: string) => str.toLowerCase().trim().replace(/s$/, "");
    const currentNorm = normalize(exercise);
    
    const existingTodayIndex = history.findIndex(
      (entry) => isToday(entry.date) && normalize(entry.exercise) === currentNorm
    );

    let updatedHistory;

    if (existingTodayIndex >= 0) {
      updatedHistory = [...history];
      updatedHistory[existingTodayIndex] = {
        ...updatedHistory[existingTodayIndex], category, equipment,
        weight: Number(weight) || 0, sets: Number(sets) || 0, reps: Number(reps) || 0,
        date: new Date().toISOString() 
      };
    } else {
      const newEntry: Workout = { id: crypto.randomUUID(), exercise: exercise.trim(), category, equipment, weight: Number(weight) || 0, sets: Number(sets) || 0, reps: Number(reps) || 0, date: new Date().toISOString() };
      updatedHistory = [...history, newEntry];
    }

    setHistory(updatedHistory);
    localStorage.setItem("boutiqueGymHistory", JSON.stringify(updatedHistory));
    
    setExercise(""); setWeight(""); setSets(""); setReps(""); 
    setSuccessMode(false); setIsPR(false); setIsSaved(true);
    
    setShowHeatmap(true);
    
    setTimeout(() => setIsSaved(false), 1500);
  };

  const exportToCSV = () => {
    triggerHaptic(50);
    const headers = ["Date", "Exercise", "Category", "Equipment", "Weight (kg)", "Sets", "Reps"];
    const rows = history.map(w => [
      new Date(w.date).toLocaleDateString(), w.exercise, w.category, w.equipment, w.weight, w.sets, w.reps
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
        const csvText = e.target?.result as string;
        const lines = csvText.replace(/\r/g, '').split('\n').filter(line => line.trim().length > 0);
        if (lines.length < 2) throw new Error("File is empty");

        const separator = lines[0].includes(';') ? ';' : ',';
        const importedWorkouts: Workout[] = [];

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(separator);
          if (parts.length < 7) continue;

          const [dateStr, exercise, category, equipment, weightStr, setsStr, repsStr] = parts;
          const safeId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : Date.now().toString(36) + Math.random().toString(36).substring(2);

          let parsedDate = new Date();
          const parsed = new Date(dateStr.trim());
          if (!isNaN(parsed.getTime())) parsedDate = parsed;

          importedWorkouts.push({
            id: safeId, date: parsedDate.toISOString(), exercise: exercise?.trim() || "Unknown",
            category: (category?.trim() || "lower") as "upper" | "lower" | "core",
            equipment: (equipment?.trim() || "free") as "free" | "machine" | "bodyweight",
            weight: Number(weightStr) || 0, sets: Number(setsStr) || 0, reps: Number(repsStr) || 0,
          });
        }

        if (importedWorkouts.length > 0 && confirm(`Successfully parsed ${importedWorkouts.length} records. Overwrite your current history?`)) {
          setHistory(importedWorkouts);
          localStorage.setItem("boutiqueGymHistory", JSON.stringify(importedWorkouts));
          triggerHaptic([50, 100, 50]);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch { alert("Import failed. The CSV file might be corrupted."); }
    };
    reader.readAsText(file);
  };

  const clearHistory = () => { if (confirm("Wipe all data?")) { setHistory([]); localStorage.removeItem("boutiqueGymHistory"); } };

  const renderGraph = () => {
    if (chartData.length < 2) return null;
    const width = 300; const height = 90; const paddingX = 20; const paddingY = 25; 
    const scores = chartData.map((d) => d.score);
    const maxS = Math.max(...scores); const minS = Math.min(...scores);
    const yRange = maxS === minS ? 1 : maxS - minS;

    const points = chartData.map((data, i) => {
      const x = paddingX + (i / (chartData.length - 1)) * (width - paddingX * 2);
      const y = height - paddingY - ((data.score - minS) / yRange) * (height - paddingY * 2);
      return { x, y, ...data };
    });

    const pathD = `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`;

    return (
      <div className="mt-5 pt-4 border-t border-gray-100/50">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Progression</p>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#A9C2A3]">Trend</p>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 overflow-visible">
          <path d={pathD} fill="none" stroke="#A9C2A3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-50" />
          {points.map((p, i) => (
            <g key={i}>
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#4B5563">
                {p.weight > 0 ? `${p.weight}x${p.reps}` : `${p.reps}r`}
              </text>
              <circle cx={p.x} cy={p.y} r="4" fill="#E8B4B8" stroke="white" strokeWidth="1.5" />
              <text x={p.x} y={height - 2} textAnchor="middle" fontSize="9" fill="#9CA3AF" fontWeight="600">{p.date}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const renderHeatmap = () => {
    if (!showHeatmap) return null;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
    
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - diffToMonday - 21);

    const days = [];
    const current = new Date(startDate);
    for (let i = 0; i < 28; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lastSeenMap = new Map<string, Workout>();
    const maxScoreMap = new Map<string, number>();
    const dayStats = new Map<number, { total: number, progress: number }>();

    sortedHistory.forEach(entry => {
      const d = new Date(entry.date);
      d.setHours(0,0,0,0);
      const ts = d.getTime();
      
      if (!dayStats.has(ts)) dayStats.set(ts, { total: 0, progress: 0 });
      const stats = dayStats.get(ts)!;
      stats.total += 1;

      const prev = lastSeenMap.get(entry.exercise);
      const currentScore = calculateScore(entry.weight, entry.reps);
      const maxScore = maxScoreMap.get(entry.exercise) || 0;

      let madeProgress = false;
      if (currentScore > maxScore && maxScore > 0) {
        madeProgress = true;
      } else if (prev) {
        if (entry.weight > prev.weight || 
           (entry.weight === prev.weight && entry.sets > prev.sets) || 
           (entry.weight === prev.weight && entry.sets === prev.sets && entry.reps > prev.reps)) {
          madeProgress = true;
        }
      }

      if (madeProgress) stats.progress += 1;

      lastSeenMap.set(entry.exercise, entry);
      if (currentScore > maxScore) maxScoreMap.set(entry.exercise, currentScore);
    });

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    return (
      <div className="mt-4 p-5 bg-white rounded-3xl border border-gray-100 flex flex-col items-center shadow-sm w-full transition-all">
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-4">Progression Calendar</p>
        
        <div className="w-full max-w-[280px]">
          <div className="flex mb-2">
            <div className="w-10"></div> 
            <div className="flex-1 grid grid-cols-7 gap-2 text-center">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                <span key={i} className="text-[8px] font-bold text-gray-300">{day}</span>
              ))}
            </div>
          </div>

          {weeks.map((week, wIndex) => {
            const mondayLabel = week[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            return (
              <div key={wIndex} className="flex items-center mb-2">
                <div className="w-10 text-[8px] font-bold text-gray-400 text-right pr-2">
                  {mondayLabel}
                </div>
                
                <div className="flex-1 grid grid-cols-7 gap-2">
                  {week.map(d => {
                    const ts = d.getTime();
                    const stats = dayStats.get(ts) || { total: 0, progress: 0 };
                    const isToday = ts === today.getTime();
                    const isFuture = ts > today.getTime();
                    
                    let bg = "bg-gray-100/50"; 
                    if (stats.total > 0 && stats.progress === 0) bg = "bg-[#A9C2A3]/40"; 
                    if (stats.progress > 0) bg = "bg-[#A9C2A3] shadow-sm"; 
                    
                    const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const infoLabel = stats.total === 0 ? "Rest Day" : `${stats.total} Logged • ${stats.progress} Progress`;
                    
                    return (
                      <button 
                        key={ts} 
                        disabled={isFuture}
                        onClick={() => {
                          triggerHaptic(10);
                          setSelectedHeatmapDate(`${dateString}: ${infoLabel}`);
                        }}
                        className={`w-full aspect-square rounded-[4px] transition-all ${bg} ${isToday ? 'ring-2 ring-offset-2 ring-[#E8B4B8]/50' : ''} ${isFuture ? 'opacity-20' : ''}`} 
                      />
                    )
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-4 mt-3 flex items-center justify-center">
           <p className={`text-[9px] font-bold uppercase tracking-widest transition-opacity ${selectedHeatmapDate ? 'text-[#E8B4B8]' : 'text-gray-300'}`}>
             {selectedHeatmapDate || "Tap a square for details"}
           </p>
        </div>

        <div className="flex items-center justify-center space-x-4 mt-3 text-[8px] uppercase tracking-widest text-gray-400 font-bold w-full border-t border-gray-50 pt-4">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-gray-100/50"></div>
            <span>Rest</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#A9C2A3]/40"></div>
            <span>Maintain</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#A9C2A3]"></div>
            <span className="text-[#A9C2A3]">Progress</span>
          </div>
        </div>
      </div>
    );
  };

  const displayRecord = todayRecord || lastRecord;
  let cardBorder = "border-gray-100";
  let cardBg = "bg-white";
  let badge = null;

  if (displayRecord) {
    if (todayRecord && !isPR && !successMode) {
      badge = <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Active</span>;
    }
    
    if (isPR) {
      cardBorder = "border-[#E8B4B8] border-2";
      cardBg = "bg-[#E8B4B8]/10";
      badge = <span className="text-[10px] bg-[#E8B4B8] text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest animate-pulse shadow-sm">✨ New PR</span>;
    } else if (successMode) {
      cardBorder = "border-[#A9C2A3] border-2";
      cardBg = "bg-[#A9C2A3]/15";
      badge = <span className="text-[10px] bg-[#A9C2A3] text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest shadow-sm">📈 Progress</span>;
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-700 p-6 font-sans flex flex-col items-center pt-12 pb-20">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light tracking-wide text-gray-800">{todayStr}</h1>
          <p className="text-sm text-gray-400">Log your workout, track your progress.</p>
        </div>

        {displayRecord && (
          <div className={`p-6 rounded-3xl transition-all duration-300 shadow-sm border ${cardBorder} ${cardBg}`}>
            <div className="flex justify-between items-center mb-1">
              <p className={`text-xs uppercase tracking-widest font-bold ${isPR ? 'text-[#dca4a8]' : (successMode ? 'text-[#7A9374]' : 'text-gray-400')}`}>
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
                <button 
                  key={cat} 
                  onClick={() => { setCategory(cat); triggerHaptic(20); }} 
                  className={`flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-semibold transition-all duration-200 ${category === cat ? "bg-[#E8B4B8] text-white shadow-sm scale-[1.02]" : "bg-gray-50 text-gray-400 border border-gray-100"}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex space-x-2">
              <input type="text" placeholder="e.g., Leg Press" value={exercise} onChange={(e) => setExercise(e.target.value)} className="flex-1 bg-gray-50/50 border border-gray-200 rounded-xl p-4 outline-none focus:border-[#E8B4B8] text-lg" />
              <button onClick={() => { triggerHaptic(20); setEquipment(equipment === "free" ? "machine" : equipment === "machine" ? "bodyweight" : "free"); }} className="w-[64px] bg-gray-50 border border-gray-200 rounded-xl flex flex-col items-center justify-center">
                <span className="text-xl mb-0.5">{getEquipmentIcon(equipment)}</span>
                <span className="text-[7px] uppercase tracking-widest text-gray-400 font-bold">{getEquipmentLabel(equipment)}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50/50 border border-gray-200 rounded-2xl p-2 min-h-[60px]">
            <button onClick={() => handleDecrement(setWeight, weight)} className="w-14 h-12 rounded-xl flex items-center justify-center bg-white border border-gray-100 shadow-sm text-3xl text-gray-400 active:bg-gray-50 transition-colors">-</button>
            <div className="flex items-baseline justify-center flex-1">
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))} className="w-16 text-right bg-transparent outline-none font-semibold text-3xl text-gray-800" />
                <span className="text-sm font-bold text-gray-400 ml-1.5 uppercase tracking-wide">kg</span>
            </div>
            <button onClick={() => handleIncrement(setWeight, weight)} className="w-14 h-12 rounded-xl flex items-center justify-center bg-white border border-gray-100 shadow-sm text-3xl text-gray-400 active:bg-gray-50 transition-colors">+</button>
          </div>

          <div className="flex space-x-4">
            <div className="flex-1 bg-gray-50/50 border border-gray-200 rounded-2xl p-2 flex items-center justify-between shadow-sm">
              <button onClick={() => handleDecrement(setSets, sets)} className="w-10 h-10 flex items-center justify-center text-3xl text-gray-400 active:bg-gray-100 rounded-lg transition-colors">-</button>
              <div className="flex items-baseline justify-center">
                 <input type="number" value={sets} onChange={(e) => setSets(e.target.value === "" ? "" : Number(e.target.value))} className="w-10 text-right bg-transparent outline-none font-semibold text-2xl text-gray-800" />
                 <span className="text-xs font-bold text-gray-400 ml-1.5 uppercase tracking-wide">sets</span>
              </div>
              <button onClick={() => handleIncrement(setSets, sets)} className="w-10 h-10 flex items-center justify-center text-3xl text-gray-400 active:bg-gray-100 rounded-lg transition-colors">+</button>
            </div>
            
            <div className="flex-1 bg-gray-50/50 border border-gray-200 rounded-2xl p-2 flex items-center justify-between shadow-sm">
              <button onClick={() => handleDecrement(setReps, reps)} className="w-10 h-10 flex items-center justify-center text-3xl text-gray-400 active:bg-gray-100 rounded-lg transition-colors">-</button>
              <div className="flex items-baseline justify-center">
                 <input type="number" value={reps} onChange={(e) => setReps(e.target.value === "" ? "" : Number(e.target.value))} className="w-10 text-right bg-transparent outline-none font-semibold text-2xl text-gray-800" />
                 <span className="text-xs font-bold text-gray-400 ml-1.5 uppercase tracking-wide">reps</span>
              </div>
              <button onClick={() => handleIncrement(setReps, reps)} className="w-10 h-10 flex items-center justify-center text-3xl text-gray-400 active:bg-gray-100 rounded-lg transition-colors">+</button>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={!exercise || isSaved} className={`w-full mt-4 min-h-[60px] rounded-xl text-lg font-medium tracking-wide transition-all ${isSaved ? "bg-[#A9C2A3] text-white" : "bg-[#E8B4B8] text-white shadow-sm disabled:opacity-40"}`}>
          {isSaved ? "✓ Saved" : (todayRecord ? "UPDATE SET" : "SAVE SET")}
        </button>

        {/* 🌸 THE FINAL, REFINED "EMPTY STATE" ONBOARDING CARD 🌸 */}
        {history.length === 0 ? (
          <div className="pt-8 border-t border-gray-100 space-y-4 animate-fade-in">
             <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 shadow-sm text-center space-y-5">
                <span className="text-3xl">👋</span>
                <h3 className="text-gray-800 font-medium">Welcome to your training log.</h3>
                <p className="text-sm text-gray-500 leading-relaxed text-left">
                  Everything here is private and lives strictly on your device.
                </p>
                <ul className="text-xs text-gray-500 leading-relaxed text-left space-y-3 bg-white p-4 rounded-2xl border border-gray-100">
                  <li className="flex gap-2"><span>🎯</span> <span><strong>Tag your set:</strong> Choose a muscle group (Upper/Lower/Core) and tap the icon to toggle equipment (Weights/Machine/Body).</span></li>
                  <li className="flex gap-2"><span>📝</span> <span><strong>Log your first set</strong> above to start tracking.</span></li>
                  <li className="flex gap-2"><span>📈</span> <span><strong>Push harder</strong> than last time to see the card turn green.</span></li>
                  <li className="flex gap-2"><span>✨</span> <span><strong>Hit an all-time high</strong> to unlock a pink PR badge.</span></li>
                  <li className="flex gap-2"><span>📲</span> <span><strong>Save it to your home screen</strong> to use it completely offline!</span></li>
                </ul>
             </div>
          </div>
        ) : (
          <div className="pt-8 border-t border-gray-100 space-y-4">
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
              <div key={cat} className="space-y-2 mt-4">
                <p className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider ml-1">{cat} Body</p>
                <div className="flex flex-wrap gap-2">
                  {groupedExercises[cat].map((ex, i) => (
                    <button key={i} onClick={() => handleSelectPastExercise(ex, cat)} className={`px-4 py-2 text-sm font-medium rounded-full flex items-center space-x-1.5 ${exercisesToday.has(ex) ? "bg-[#A9C2A3]/15 text-[#6B8565]" : "bg-[#A9C2A3] text-white shadow-sm"}`}>
                      <span>{getEquipmentIcon(equipmentMap.get(ex))}</span>
                      <span>{ex}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-center pt-6 pb-2">
               <button onClick={() => setShowHeatmap(!showHeatmap)} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-full shadow-sm">
                 {showHeatmap ? "Hide Calendar" : "📊 Show Progression Calendar"}
               </button>
            </div>
            {renderHeatmap()}
          </div>
        )}

        <div className="pt-12 flex justify-center items-center space-x-6 opacity-30 hover:opacity-100 transition-opacity">
          <input type="file" accept=".csv" onChange={importData} ref={fileInputRef} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-800">↑ Import CSV</button>
          <button onClick={exportToCSV} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-800">↓ Export CSV</button>
          <button onClick={clearHistory} className="text-[10px] font-bold uppercase tracking-widest text-red-400">× Wipe</button>
        </div>
      </div>
    </div>
  );
}
