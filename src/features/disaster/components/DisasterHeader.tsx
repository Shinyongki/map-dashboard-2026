import type { DisasterMapMode } from "../lib/disaster-types";
import { DISASTER_MAP_MODES } from "../lib/disaster-types";

interface DisasterHeaderProps {
    disasterMode: DisasterMapMode;
    onDisasterModeChange: (mode: DisasterMapMode) => void;
    yearRange: [number, number];
    onYearRangeChange: (range: [number, number]) => void;
}

const AVAILABLE_YEARS = [2021, 2022, 2023, 2024, 2025];

export default function DisasterHeader({
    disasterMode,
    onDisasterModeChange,
    yearRange,
    onYearRangeChange,
}: DisasterHeaderProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">경남 자연재난 현황</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        경남 18개 시군의 태풍/홍수/지진/산사태위험 이력 ({yearRange[0]}~{yearRange[1]})
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <label className="text-gray-600 font-medium">기간:</label>
                    <select
                        value={yearRange[0]}
                        onChange={(e) => onYearRangeChange([parseInt(e.target.value), yearRange[1]])}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                    >
                        {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y} disabled={y > yearRange[1]}>{y}년</option>
                        ))}
                    </select>
                    <span className="text-gray-400">~</span>
                    <select
                        value={yearRange[1]}
                        onChange={(e) => onYearRangeChange([yearRange[0], parseInt(e.target.value)])}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                    >
                        {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y} disabled={y < yearRange[0]}>{y}년</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {DISASTER_MAP_MODES.map(({ mode, label }) => {
                    const isActive = disasterMode === mode;
                    let activeClass = "bg-red-100 text-red-700 border-red-300";
                    if (mode === "typhoon") {
                        activeClass = "bg-indigo-100 text-indigo-700 border-indigo-300";
                    } else if (mode === "flood") {
                        activeClass = "bg-sky-100 text-sky-700 border-sky-300";
                    } else if (mode === "earthquake") {
                        activeClass = "bg-amber-100 text-amber-700 border-amber-300";
                    } else if (mode === "landslide_risk") {
                        activeClass = "bg-green-100 text-green-700 border-green-300";
                    }

                    return (
                        <button
                            key={mode}
                            onClick={() => onDisasterModeChange(mode)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                isActive
                                    ? activeClass
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
