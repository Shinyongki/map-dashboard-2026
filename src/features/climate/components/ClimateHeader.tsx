import type { ClimateMapMode } from "../lib/climate-types";
import { CLIMATE_MAP_MODES } from "../lib/climate-types";

interface ClimateHeaderProps {
    climateMode: ClimateMapMode;
    onClimateModeChange: (mode: ClimateMapMode) => void;
    yearRange: [number, number];
    onYearRangeChange: (range: [number, number]) => void;
}

const AVAILABLE_YEARS = [2021, 2022, 2023, 2024, 2025];

export default function ClimateHeader({
    climateMode,
    onClimateModeChange,
    yearRange,
    onYearRangeChange,
}: ClimateHeaderProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">경남 기후대응 현황</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        경남 18개 시군의 한파/폭염 특보 이력 ({yearRange[0]}~{yearRange[1]})
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
                {CLIMATE_MAP_MODES.map(({ mode, label }) => {
                    const isActive = climateMode === mode;
                    let activeClass = "bg-purple-100 text-purple-700 border-purple-300";
                    if (mode === "all_cold" || mode === "cold_advisory" || mode === "cold_warning") {
                        activeClass = "bg-sky-100 text-sky-700 border-sky-300";
                    } else if (mode === "all_heat" || mode === "heat_advisory" || mode === "heat_warning") {
                        activeClass = "bg-orange-100 text-orange-700 border-orange-300";
                    }

                    return (
                        <button
                            key={mode}
                            onClick={() => onClimateModeChange(mode)}
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
