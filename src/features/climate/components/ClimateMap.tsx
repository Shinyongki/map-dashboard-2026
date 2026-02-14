import { useCallback } from "react";
import GyeongnamMap from "@/features/map/components/GyeongnamMap";
import type { RegionStats } from "@/features/map/lib/map-types";
import type { ClimateRegionStats, ClimateMapMode } from "../lib/climate-types";
import { getClimateColorForCount, getClimateHoverColor } from "../lib/climate-colors";

interface ClimateMapProps {
    climateStatsMap: Map<string, ClimateRegionStats>;
    selectedRegion: string | null;
    onRegionClick: (regionName: string) => void;
    onRegionHover: (regionName: string, x: number, y: number) => void;
    onRegionHoverEnd: () => void;
    climateMode: ClimateMapMode;
}

function getAlertCount(stats: ClimateRegionStats, mode: ClimateMapMode): number {
    switch (mode) {
        case "total": return stats.totalAlertCount;
        case "all_cold": return stats.coldAdvisoryCount + stats.coldWarningCount;
        case "all_heat": return stats.heatAdvisoryCount + stats.heatWarningCount;
        case "cold_advisory": return stats.coldAdvisoryCount;
        case "cold_warning": return stats.coldWarningCount;
        case "heat_advisory": return stats.heatAdvisoryCount;
        case "heat_warning": return stats.heatWarningCount;
    }
}

export default function ClimateMap({
    climateStatsMap,
    selectedRegion,
    onRegionClick,
    onRegionHover,
    onRegionHoverEnd,
    climateMode,
}: ClimateMapProps) {
    // GyeongnamMap needs a regionStatsMap, but we pass an empty one since
    // we override all rendering via custom functions
    const emptyStatsMap = new Map<string, RegionStats>();

    const getRateForRegion = useCallback(
        (name: string): number => {
            const stats = climateStatsMap.get(name);
            if (!stats) return 0;
            return getAlertCount(stats, climateMode);
        },
        [climateStatsMap, climateMode]
    );

    const getColorFn = useCallback(
        (count: number) => getClimateColorForCount(count, climateMode),
        [climateMode]
    );

    const getHoverColorFn = useCallback(
        (count: number) => getClimateHoverColor(count, climateMode),
        [climateMode]
    );

    const getLabelText = useCallback(
        (name: string): string => {
            const stats = climateStatsMap.get(name);
            if (!stats) return "0건";
            const count = getAlertCount(stats, climateMode);
            return `${count}건`;
        },
        [climateStatsMap, climateMode]
    );

    return (
        <GyeongnamMap
            regionStatsMap={emptyStatsMap}
            selectedRegion={selectedRegion}
            onRegionClick={onRegionClick}
            onRegionHover={onRegionHover}
            onRegionHoverEnd={onRegionHoverEnd}
            mapMode="submission"
            mapTheme="sky"
            getRateForRegion={getRateForRegion}
            getColorForRateFn={getColorFn}
            getHoverColorForRateFn={getHoverColorFn}
            getLabelText={getLabelText}
            mapTitle="경상남도 기후특보 현황"
        />
    );
}
