import { useEffect, useState } from "react";
import type { DisasterRegionStats, DisasterMapMode } from "../lib/disaster-types";

interface DisasterTooltipProps {
    data: {
        region: string;
        stats: DisasterRegionStats;
        mode: DisasterMapMode;
        x: number;
        y: number;
    } | null;
}

export default function DisasterTooltip({ data }: DisasterTooltipProps) {
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
            case "total": return stats.totalCount;
            case "typhoon": return stats.typhoonCount;
            case "flood": return stats.floodCount;
            case "earthquake": return stats.earthquakeCount;
            case "landslide_risk": return stats.landslideRiskCount;
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
                    <span className="text-indigo-600">태풍</span>
                    <span className="font-semibold">{stats.typhoonCount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sky-600">홍수</span>
                    <span className="font-semibold">{stats.floodCount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-amber-600">지진</span>
                    <span className="font-semibold">{stats.earthquakeCount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-green-600">산사태위험</span>
                    <span className="font-semibold">{stats.landslideRiskCount}</span>
                </div>
            </div>
        </div>
    );
}
