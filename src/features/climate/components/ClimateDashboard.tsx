import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import type { ClimateMapMode } from "../lib/climate-types";
import { useClimateData } from "../hooks/useClimateData";
import { useClimateRegionStats } from "../hooks/useClimateRegionStats";
import ClimateHeader from "./ClimateHeader";
import ClimateMap from "./ClimateMap";
import ClimateLegend from "./ClimateLegend";
import ClimateTooltip from "./ClimateTooltip";
import ClimateAnalytics from "./ClimateAnalytics";
import ClimateSidePanel from "./ClimateSidePanel";

export default function ClimateDashboard() {
    const [climateMode, setClimateMode] = useState<ClimateMapMode>("total");
    const [yearRange, setYearRange] = useState<[number, number]>([2021, 2025]);
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{
        region: string;
        stats: any;
        mode: ClimateMapMode;
        x: number;
        y: number;
    } | null>(null);

    const { data: alerts, isLoading, isError } = useClimateData(yearRange);
    const climateStatsMap = useClimateRegionStats(alerts, yearRange);

    const selectedStats = selectedRegion ? climateStatsMap.get(selectedRegion) ?? null : null;

    const handleRegionClick = useCallback((regionName: string) => {
        setSelectedRegion((prev) => (prev === regionName ? null : regionName));
    }, []);

    const handleRegionHover = useCallback(
        (regionName: string, x: number, y: number) => {
            const stats = climateStatsMap.get(regionName);
            if (!stats) return;
            setTooltip({ region: regionName, stats, mode: climateMode, x, y });
        },
        [climateStatsMap, climateMode]
    );

    const handleHoverEnd = useCallback(() => setTooltip(null), []);
    const handleClosePanel = useCallback(() => setSelectedRegion(null), []);

    return (
        <div className="min-h-screen py-8 px-4 bg-gray-50 text-gray-900 flex flex-col">
            <div className="max-w-7xl mx-auto w-full">
                <ClimateHeader
                    climateMode={climateMode}
                    onClimateModeChange={setClimateMode}
                    yearRange={yearRange}
                    onYearRangeChange={setYearRange}
                />
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl mx-auto w-full mt-4 gap-6">
                <div className={`flex-1 flex flex-col transition-all duration-300`}>
                    <div className="px-4 sm:px-6 py-2">
                        <ClimateLegend mode={climateMode} />
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
                                    기상청 데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.
                                </div>
                            </div>
                        )}
                        <ClimateMap
                            climateStatsMap={climateStatsMap}
                            selectedRegion={selectedRegion}
                            onRegionClick={handleRegionClick}
                            onRegionHover={handleRegionHover}
                            onRegionHoverEnd={handleHoverEnd}
                            climateMode={climateMode}
                        />
                    </div>

                    {/* 하단 상세 분석 영역 */}
                    <ClimateAnalytics
                        climateStatsMap={climateStatsMap}
                        selectedRegion={selectedRegion}
                        yearRange={yearRange}
                        mode={climateMode}
                    />
                </div>

                {selectedRegion && (
                    <div className="w-full lg:w-[320px] shrink-0">
                        <div className="sticky top-4">
                            <ClimateSidePanel
                                stats={selectedStats}
                                onClose={handleClosePanel}
                            />
                        </div>
                    </div>
                )}
            </div>

            <ClimateTooltip data={tooltip} />
        </div>
    );
}
