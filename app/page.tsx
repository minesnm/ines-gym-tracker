"use client";

import React, { useState, useEffect } from "react";

// 1. We define exactly what a Workout looks like so Vercel is happy
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
  const [equipment, setEquipment] = useState<"free" | "machine" | "bodyweight">(
    "free"
  );

  const [weight, setWeight] = useState<number | "">(20);
  const [sets, setSets] = useState<number | "">(3);
  const [reps, setReps] = useState<number | "">(10);

  const [history, setHistory] = useState<Workout[]>([]); // Using the Workout type here
  const [lastRecord, setLastRecord] = useState<Workout | null>(null);
  const [successMode, setSuccessMode] = useState(false);
  const [chartData, setChartData] = useState<
    { date: string; maxWeight: number }[]
  >([]);

  const [isSaved, setIsSaved] = useState(false);

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  useEffect(() => {
    const saved = localStorage.getItem("boutiqueGymHistory");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const groupedExercises = {
    upper: Array.from(
      new Set(
        history
          .filter((item) => item.category === "upper")
          .map((item) => item.exercise)
      )
    ).reverse(),
    lower: Array.from(
      new Set(
        history
          .filter((item) => item.category === "lower")
          .map((item) => item.exercise)
      )
    ).reverse(),
    core: Array.from(
      new Set(
        history
          .filter((item) => item.category === "core")
          .map((item) => item.exercise)
      )
    ).reverse(),
  };

  const equipmentMap = new Map();
  history.forEach((entry) => {
    equipmentMap.set(entry.exercise, entry.equipment || "free");
  });

  const isToday = (dateString: string) => {
    const d1 = new Date(dateString);
    const d2 = new Date();
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };
  const exercisesToday = new Set(
    history.filter((item) => isToday(item.date)).map((item) => item.exercise)
  );

  useEffect(() => {
    if (exercise.trim().length < 2) {
      setLastRecord(null);
      setSuccessMode(false);
      setChartData([]);
      return;
    }

    const normalize = (str: string) =>
      str.toLowerCase().trim().replace(/s$/, "");
    const currentNorm = normalize(exercise);

    const matches = history.filter(
      (entry) => normalize(entry.exercise) === currentNorm
    );

    if (matches.length > 0) {
      const sortedByDate = [...matches].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const pastRecords = sortedByDate.filter((entry) => !isToday(entry.date));
      const recent = pastRecords.length > 0 ? pastRecords[0] : sortedByDate[0];

      setLastRecord(recent);
      if (recent.category) setCategory(recent.category);
      if (recent.equipment) setEquipment(recent.equipment);

      const w = typeof weight === "number" ? weight : 0;
      const s = typeof sets === "number" ? sets : 0;
      const r = typeof reps === "number" ? reps : 0;

      if (
        w > recent.weight ||
        (w === recent.weight && s > recent.sets) ||
        (w === recent.weight && s === recent.sets && r > recent.reps)
      ) {
        setSuccessMode(true);
      } else {
        setSuccessMode(false);
      }

      const dailyMaxMap = new Map<string, number>();
      [...matches].reverse().forEach((entry) => {
        const dateObj = new Date(entry.date);
        const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
        if (
          !dailyMaxMap.has(dateStr) ||
          (dailyMaxMap.get(dateStr) || 0) < entry.weight
        ) {
          dailyMaxMap.set(dateStr, entry.weight);
        }
      });

      const chartPoints = Array.from(dailyMaxMap, ([date, maxWeight]) => ({
        date,
        maxWeight,
      }));
      setChartData(chartPoints);
    } else {
      setLastRecord(null);
      setSuccessMode(false);
      setChartData([]);
    }
  }, [exercise, history, weight, sets, reps]);

  const triggerHaptic = (pattern: number | number[]) => {
    if (
      typeof window !== "undefined" &&
      window.navigator &&
      window.navigator.vibrate
    ) {
      window.navigator.vibrate(pattern);
    }
  };

  const handleIncrement = (
    setter: React.Dispatch<React.SetStateAction<number | "">>,
    val: number | ""
  ) => {
    triggerHaptic(30);
    setter(typeof val === "number" ? val + 1 : 1);
  };

  const handleDecrement = (
    setter: React.Dispatch<React.SetStateAction<number | "">>,
    val: number | ""
  ) => {
    triggerHaptic(30);
    setter(typeof val === "number" && val > 0 ? val - 1 : 0);
  };

  const handleSelectPastExercise = (
    exName: string,
    cat: "upper" | "lower" | "core"
  ) => {
    triggerHaptic(20);
    setExercise(exName);
    setCategory(cat);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    const normalize = (str: string) =>
      str.toLowerCase().trim().replace(/s$/, "");
    const matches = history.filter(
      (entry) => normalize(entry.exercise) === normalize(exName)
    );

    if (matches.length > 0) {
      const sortedByDate = [...matches].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const recent = sortedByDate[0];

      setWeight(recent.weight);
      setSets(recent.sets);
      setReps(recent.reps);
      setEquipment(recent.equipment || "free");
    }
  };

  const toggleEquipment = () => {
    triggerHaptic(20);
    if (equipment === "free") setEquipment("machine");
    else if (equipment === "machine") setEquipment("bodyweight");
    else setEquipment("free");
  };

  const getEquipmentIcon = (eq: string) => {
    if (eq === "machine") return "🔩";
    if (eq === "bodyweight") return "💪";
    return "🏋️";
  };

  const getEquipmentLabel = (eq: string) => {
    if (eq === "machine") return "Mach";
    if (eq === "bodyweight") return "Body";
    return "Free";
  };

  const handleSave = () => {
    if (!exercise) return;
    triggerHaptic([100, 50, 100]);

    const newEntry: Workout = {
      id: crypto.randomUUID(),
      exercise: exercise.trim(),
      category: category,
      equipment: equipment,
      weight: typeof weight === "number" ? weight : 0,
      sets: typeof sets === "number" ? sets : 0,
      reps: typeof reps === "number" ? reps : 0,
      date: new Date().toISOString(),
    };

    const updatedHistory = [...history, newEntry];
    setHistory(updatedHistory);
    localStorage.setItem("boutiqueGymHistory", JSON.stringify(updatedHistory));

    setExercise("");
    setWeight("");
    setSets("");
    setReps("");
    setSuccessMode(false);

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 1500);
  };

  const injectTestData = () => {
    const ONE_DAY = 86400000;
    const now = Date.now();

    const fakeData: Workout[] = [
      {
        id: crypto.randomUUID(),
        exercise: "Goblet Squat",
        category: "lower",
        equipment: "free",
        weight: 15,
        sets: 3,
        reps: 10,
        date: new Date(now - ONE_DAY * 3).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        exercise: "Leg Press",
        category: "lower",
        equipment: "machine",
        weight: 80,
        sets: 4,
        reps: 12,
        date: new Date(now - ONE_DAY * 2).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        exercise: "Goblet Squat",
        category: "lower",
        equipment: "free",
        weight: 22,
        sets: 4,
        reps: 12,
        date: new Date(now - ONE_DAY * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        exercise: "Lat Pulldown",
        category: "upper",
        equipment: "machine",
        weight: 45,
        sets: 3,
        reps: 12,
        date: new Date(now - ONE_DAY * 2).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        exercise: "Plank",
        category: "core",
        equipment: "bodyweight",
        weight: 0,
        sets: 3,
        reps: 60,
        date: new Date(now).toISOString(),
      },
    ];

    const updatedHistory = [...history, ...fakeData];
    setHistory(updatedHistory);
    localStorage.setItem("boutiqueGymHistory", JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("boutiqueGymHistory");
    setExercise("");
    setWeight(20);
    setSets(3);
    setReps(10);
    setEquipment("free");
  };

  const renderGraph = () => {
    if (chartData.length < 2) return null;

    const width = 300;
    const height = 60;
    const padding = 10;

    const weights = chartData.map((d) => d.maxWeight);
    const maxW = Math.max(...weights);
    const minW = Math.min(...weights);
    const yRange = maxW === minW ? 1 : maxW - minW;

    const points = chartData.map((data, i) => {
      const x = padding + (i / (chartData.length - 1)) * (width - padding * 2);
      const y =
        height -
        padding -
        ((data.maxWeight - minW) / yRange) * (height - padding * 2);
      return { x, y, ...data };
    });

    const pathD = `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`;

    return (
      <div className="mt-5 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] uppercase tracking-widest text-gray-400">
            Progression
          </p>
          <p className="text-[10px] font-medium text-[#A9C2A3]">Trend</p>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-16 overflow-visible"
        >
          <path
            d={pathD}
            fill="none"
            stroke="#A9C2A3"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-70"
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#E8B4B8"
              stroke="white"
              strokeWidth="1.5"
            />
          ))}
        </svg>

        <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-medium">
          <span>
            {chartData[0].maxWeight > 0 ? `${chartData[0].maxWeight}kg` : "BW"}
          </span>
          <span>
            {chartData[chartData.length - 1].maxWeight > 0
              ? `${chartData[chartData.length - 1].maxWeight}kg`
              : "BW"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-gray-700 p-6 font-sans flex flex-col items-center pt-12 pb-20">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light tracking-wide text-gray-800">
            {todayStr}
          </h1>
          <p className="text-sm text-gray-400">
            Log your progress, beautifully.
          </p>
        </div>

        {lastRecord && (
          <div
            className={`p-6 rounded-2xl transition-all duration-300 ${
              successMode
                ? "bg-[#A9C2A3]/10 border border-[#A9C2A3]/50"
                : "bg-white border border-gray-200 shadow-sm"
            }`}
          >
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">
              Last Time{" "}
              {lastRecord.equipment
                ? `(${getEquipmentLabel(lastRecord.equipment)})`
                : ""}
            </p>

            <p className="text-xl font-medium text-gray-700">
              {lastRecord.weight > 0 ? `${lastRecord.weight}kg for ` : ""}
              {lastRecord.sets} × {lastRecord.reps}
            </p>

            <p
              className={`mt-2 text-sm font-medium ${
                successMode ? "text-[#7A9374]" : "text-gray-500"
              }`}
            >
              {successMode
                ? "✨ You're crushing it today!"
                : "Can you do a little more today?"}
            </p>
            {renderGraph()}
          </div>
        )}

        <div className="space-y-6">
          <div className="flex flex-col space-y-3">
            <label className="text-xs uppercase tracking-widest ml-1 text-gray-400">
              Exercise
            </label>
            <div className="flex space-x-2">
              {(["upper", "lower", "core"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    triggerHaptic(20);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-semibold transition-all duration-200 ${
                    category === cat
                      ? "bg-[#E8B4B8] text-white shadow-sm scale-[1.02]"
                      : "bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="e.g., Leg Press"
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                className="flex-1 bg-gray-50/50 border border-gray-200 rounded-xl p-4 outline-none focus:border-[#E8B4B8] focus:ring-1 focus:ring-[#E8B4B8] transition-all min-h-[50px] text-lg text-gray-800"
              />
              <button
                onClick={toggleEquipment}
                className="w-[60px] bg-gray-50 border border-gray-200 rounded-xl flex flex-col items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
              >
                <span className="text-xl mb-0.5">
                  {getEquipmentIcon(equipment)}
                </span>
                <span className="text-[8px] uppercase tracking-widest text-gray-400 font-bold">
                  {getEquipmentLabel(equipment)}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-xs uppercase tracking-widest ml-1 text-gray-400">
              Weight (kg)
            </label>
            <div className="flex items-center justify-between bg-gray-50/50 border border-gray-200 rounded-xl p-2 min-h-[60px]">
              <button
                onClick={() => handleDecrement(setWeight, weight)}
                className="w-14 h-12 rounded-lg flex items-center justify-center bg-white border border-gray-100 shadow-sm hover:bg-gray-50 text-gray-600 text-2xl transition-colors"
              >
                -
              </button>
              <input
                type="number"
                value={weight}
                onChange={(e) =>
                  setWeight(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-20 text-center bg-transparent outline-none font-medium text-2xl text-gray-700"
              />
              <button
                onClick={() => handleIncrement(setWeight, weight)}
                className="w-14 h-12 rounded-lg flex items-center justify-center bg-white border border-gray-100 shadow-sm hover:bg-gray-50 text-gray-600 text-2xl transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex space-x-4">
            <div className="flex-1 flex flex-col space-y-2">
              <label className="text-xs uppercase tracking-widest ml-1 text-gray-400">
                Sets
              </label>
              <div className="flex items-center justify-between bg-gray-50/50 border border-gray-200 rounded-xl p-1 min-h-[50px]">
                <button
                  onClick={() => handleDecrement(setSets, sets)}
                  className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600 text-xl transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  value={sets}
                  onChange={(e) =>
                    setSets(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-10 text-center bg-transparent outline-none font-medium text-lg text-gray-700"
                />
                <button
                  onClick={() => handleIncrement(setSets, sets)}
                  className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600 text-xl transition-colors"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col space-y-2">
              <label className="text-xs uppercase tracking-widest ml-1 text-gray-400">
                Reps
              </label>
              <div className="flex items-center justify-between bg-gray-50/50 border border-gray-200 rounded-xl p-1 min-h-[50px]">
                <button
                  onClick={() => handleDecrement(setReps, reps)}
                  className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600 text-xl transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) =>
                    setReps(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-10 text-center bg-transparent outline-none font-medium text-lg text-gray-700"
                />
                <button
                  onClick={() => handleIncrement(setReps, reps)}
                  className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600 text-xl transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!exercise || isSaved}
          className={`w-full mt-4 min-h-[60px] rounded-xl text-lg font-medium tracking-wide transition-all duration-300 shadow-sm ${
            isSaved
              ? "bg-[#A9C2A3] text-white scale-[0.98]"
              : "bg-[#E8B4B8] text-white hover:bg-[#dca4a8] disabled:opacity-40 disabled:hover:bg-[#E8B4B8]"
          }`}
        >
          {isSaved ? "✓ Saved" : "Save Set"}
        </button>

        {(groupedExercises.upper.length > 0 ||
          groupedExercises.lower.length > 0 ||
          groupedExercises.core.length > 0) && (
          <div className="pt-8 border-t border-gray-100 space-y-6">
            {/* FIXED: Apostrophe escaped for Vercel */}
            <h2 className="text-xs uppercase tracking-widest text-gray-400 text-center">
              Today&apos;s Plan & History
            </h2>

            {groupedExercises.lower.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider ml-1">
                  Lower Body
                </p>
                <div className="flex flex-wrap gap-2">
                  {groupedExercises.lower.map((ex, i) => (
                    <button
                      key={`lower-${i}`}
                      onClick={() => handleSelectPastExercise(ex, "lower")}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center space-x-1.5 ${
                        exercisesToday.has(ex)
                          ? "bg-[#A9C2A3]/15 text-[#6B8565] hover:bg-[#A9C2A3]/30"
                          : "bg-[#A9C2A3] text-white shadow-sm hover:bg-[#98b392]"
                      }`}
                    >
                      <span>{getEquipmentIcon(equipmentMap.get(ex))}</span>
                      <span>{ex}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {groupedExercises.upper.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider ml-1">
                  Upper Body
                </p>
                <div className="flex flex-wrap gap-2">
                  {groupedExercises.upper.map((ex, i) => (
                    <button
                      key={`upper-${i}`}
                      onClick={() => handleSelectPastExercise(ex, "upper")}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center space-x-1.5 ${
                        exercisesToday.has(ex)
                          ? "bg-[#A9C2A3]/15 text-[#6B8565] hover:bg-[#A9C2A3]/30"
                          : "bg-[#A9C2A3] text-white shadow-sm hover:bg-[#98b392]"
                      }`}
                    >
                      <span>{getEquipmentIcon(equipmentMap.get(ex))}</span>
                      <span>{ex}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {groupedExercises.core.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider ml-1">
                  Core
                </p>
                <div className="flex flex-wrap gap-2">
                  {groupedExercises.core.map((ex, i) => (
                    <button
                      key={`core-${i}`}
                      onClick={() => handleSelectPastExercise(ex, "core")}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center space-x-1.5 ${
                        exercisesToday.has(ex)
                          ? "bg-[#A9C2A3]/15 text-[#6B8565] hover:bg-[#A9C2A3]/30"
                          : "bg-[#A9C2A3] text-white shadow-sm hover:bg-[#98b392]"
                      }`}
                    >
                      <span>{getEquipmentIcon(equipmentMap.get(ex))}</span>
                      <span>{ex}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-12 flex justify-center space-x-4 opacity-50 hover:opacity-100 transition-opacity">
          <button
            onClick={injectTestData}
            className="text-[10px] text-gray-500 border border-gray-200 px-3 py-1 rounded hover:bg-gray-50"
          >
            🔧 Inject Mock Data
          </button>
          <button
            onClick={clearHistory}
            className="text-[10px] text-red-400 border border-red-100 px-3 py-1 rounded hover:bg-red-50"
          >
            🗑️ Clear History
          </button>
        </div>
      </div>
    </div>
  );
}
