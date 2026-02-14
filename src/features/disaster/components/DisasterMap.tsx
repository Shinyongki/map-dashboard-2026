import { useCallback } from "react";
import GyeongnamMap from "@/features/map/components/GyeongnamMap";
import type { RegionStats } from "@/features/map/lib/map-types";
import type { DisasterRegionStats, DisasterMapMode } from "../lib/disaster-types";
import { getDisasterColorForCount, getDisasterHoverColor } from "../lib/disaster-colors";

interface DisasterMapProps {
    disasterStatsMap: Map<string, DisasterRegionStats>;
    selectedRegion: string | null;
    onRegionClick: (regionName: string) => void;
    onRegionHover: (regionName: string, x: number, y: number) => void;
    onRegionHoverEnd: () => void;
    disasterMode: DisasterMapMode;
}

function getDisasterCount(stats: DisasterRegionStats, mode: DisasterMapMode): number {
    switch (mode) {
        case "total": return stats.totalCount;
        case "typhoon": return stats.typhoonCount;
        case "flood": return stats.floodCount;
        case "earthquake": return stats.earthquakeCount;
        case "landslide_risk": return stats.landslideRiskCount;
    }
}

export default function DisasterMap({
    disasterStatsMap,
    selectedRegion,
    onRegionClick,
    onRegionHover,
    onRegionHoverEnd,
    disasterMode,
}: DisasterMapProps) {
    const emptyStatsMap = new Map<string, RegionStats>();

    const getRateForRegion = useCallback(
        (name: string): number => {
            const stats = disasterStatsMap.get(name);
            if (!stats) return 0;
            return getDisasterCount(stats, disasterMode);
        },
        [disasterStatsMap, disasterMode]
    );

    const getColorFn = useCallback(
        (count: number) => getDisasterColorForCount(count, disasterMode),
        [disasterMode]
    );

    const getHoverColorFn = useCallback(
        (count: number) => getDisasterHoverColor(count, disasterMode),
        [disasterMode]
    );

    const getLabelText = useCallback(
        (name: string): string => {
            const stats = disasterStatsMap.get(name);
            if (!stats) return "0건";
            const count = getDisasterCount(stats, disasterMode);
            return `${count}건`;
        },
        [disasterStatsMap, disasterMode]
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
            mapTitle="경상남도 자연재난 현황"
        />
    );
}
