import { useEffect, useState } from "react";
import type { ClimateRegionStats, ClimateMapMode } from "../lib/climate-types";

interface ClimateTooltipProps {
    data: {
        region: string;
        stats: ClimateRegionStats;
        mode: ClimateMapMode;
        x: number;
        y: number;
    } | null;
}

export default function ClimateTooltip({ data }: ClimateTooltipProps) {
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!data) return;
        const offsetX = data.x + 260 > window.innerWidth ? -220 : 16;
        const offsetY = data.y + 200 > window.innerHeight ? -160 : 16;
        setPosition({ x: data.x + offsetX, y: data.y + offsetY });
    }, [data]);

    if (!data) return null;

    const { stats, mode } = data;

    const getCountForMode = (): number => {
        switch (mode) {
            case "total": return stats.totalAlertCount;
            case "all_cold": return stats.coldAdvisoryCount + stats.coldWarningCount;
            case "all_heat": return stats.heatAdvisoryCount + stats.heatWarningCount;
            case "cold_advisory": return stats.coldAdvisoryCount;
            case "cold_warning": return stats.coldWarningCount;
            case "heat_advisory": return stats.heatAdvisoryCount;
            case "heat_warning": return stats.heatWarningCount;
        }
    };

    return (
        <div
            className="fixed z-[9999] pointer-events-none bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px]"
            style={{ left: position.x, top: position.y }}
        >
            <div className="font-bold text-sm text-gray-900 mb-2">{stats.region}</div>

            <div className="text-lg font-bold text-gray-800 mb-2">
                {getCountForMode()}건
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex justify-between">
                    <span className="text-sky-600">한파주의보</span>
                    <span className="font-semibold">{stats.coldAdvisoryCount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sky-800">한파경보</span>
                    <span className="font-semibold">{stats.coldWarningCount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-orange-500">폭염주의보</span>
                    <span className="font-semibold">{stats.heatAdvisoryCount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-red-600">폭염경보</span>
                    <span className="font-semibold">{stats.heatWarningCount}</span>
                </div>
            </div>
        </div>
    );
}
