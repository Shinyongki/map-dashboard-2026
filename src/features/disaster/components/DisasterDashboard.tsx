import { useState, useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { DisasterMapMode } from "../lib/disaster-types";
import { useDisasterData } from "../hooks/useDisasterData";
import { useDisasterRegionStats } from "../hooks/useDisasterRegionStats";
import DisasterHeader from "./DisasterHeader";
import DisasterMap from "./DisasterMap";
import DisasterLegend from "./DisasterLegend";
import DisasterTooltip from "./DisasterTooltip";
import DisasterSidePanel from "./DisasterSidePanel";
import DisasterAnalytics from "./DisasterAnalytics";
import ClimateCareBriefing from "@/features/climate/components/ClimateCareBriefing";

export default function DisasterDashboard() {
    const [disasterMode, setDisasterMode] = useState<DisasterMapMode>("total");
    const [yearRange, setYearRange] = useState<[number, number]>([2021, 2025]);
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{
        region: string;
        stats: any;
        mode: DisasterMapMode;
        x: number;
        y: number;
    } | null>(null);

    const { data: alerts, isLoading, isError } = useDisasterData(yearRange);
    const disasterStatsMap = useDisasterRegionStats(alerts, yearRange);

    const selectedStats = selectedRegion ? disasterStatsMap.get(selectedRegion) ?? null : null;

    // 최근 연도 재난 발생 시군 추출
    const alertRegions = useMemo(() => {
        const currentYear = yearRange[1];
        const regions: string[] = [];
        disasterStatsMap.forEach((stats, region) => {
            const yearData = stats.yearlyBreakdown.find(
                (y) => y.year === currentYear
            );
            if (yearData && yearData.totalCount > 0) {
                regions.push(region);
            }
        });
        return regions;
    }, [disasterStatsMap, yearRange]);

    // 현재 모드에서 alertType 결정
    const alertType = useMemo(() => {
        if (disasterMode === "typhoon") return "태풍" as const;
        if (disasterMode === "earthquake") return "지진" as const;
        return "호우" as const;
    }, [disasterMode]);

    const handleRegionClick = useCallback((regionName: string) => {
        setSelectedRegion((prev) => (prev === regionName ? null : regionName));
    }, []);

    const handleRegionHover = useCallback(
        (regionName: string, x: number, y: number) => {
            const stats = disasterStatsMap.get(regionName);
            if (!stats) return;
            setTooltip({ region: regionName, stats, mode: disasterMode, x, y });
        },
        [disasterStatsMap, disasterMode]
    );

    const handleHoverEnd = useCallback(() => setTooltip(null), []);
    const handleClosePanel = useCallback(() => setSelectedRegion(null), []);

    return (
        <div className="min-h-screen py-8 px-4 bg-gray-50 text-gray-900 flex flex-col">
            <div className="max-w-7xl mx-auto w-full">
                <DisasterHeader
                    disasterMode={disasterMode}
                    onDisasterModeChange={setDisasterMode}
                    yearRange={yearRange}
                    onYearRangeChange={setYearRange}
                />
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl mx-auto w-full mt-4 gap-6">
                <div className={`flex-1 flex flex-col transition-all duration-300`}>
                    <div className="px-4 sm:px-6 py-2">
                        <DisasterLegend mode={disasterMode} />
                    </div>
                    <div className="relative h-[600px] w-full bg-blue-50/30 rounded-3xl border border-blue-100/50 overflow-hidden shadow-sm">
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-sm z-10">
                                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                            </div>
                        )}
                        {isError && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                                    재난 데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.
                                </div>
                            </div>
                        )}
                        <DisasterMap
                            disasterStatsMap={disasterStatsMap}
                            selectedRegion={selectedRegion}
                            onRegionClick={handleRegionClick}
                            onRegionHover={handleRegionHover}
                            onRegionHoverEnd={handleHoverEnd}
                            disasterMode={disasterMode}
                        />
                    </div>

                    {/* 하단 상세 분석 영역 */}
                    <DisasterAnalytics
                        disasterStatsMap={disasterStatsMap}
                        selectedRegion={selectedRegion}
                        yearRange={yearRange}
                        mode={disasterMode}
                    />

                    {/* 재난 발생 시군 돌봄 현황 브리핑 (최하단) */}
                    <ClimateCareBriefing
                        alertRegions={alertRegions}
                        alertType={alertType}
                    />
                </div>

                {selectedRegion && (
                    <div className="w-full lg:w-[320px] shrink-0">
                        <div className="sticky top-4">
                            <DisasterSidePanel
                                stats={selectedStats}
                                onClose={handleClosePanel}
                            />
                        </div>
                    </div>
                )}
            </div>

            <DisasterTooltip data={tooltip} />
        </div>
    );
}

