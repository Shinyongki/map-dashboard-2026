import { useState, useCallback, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

import GyeongnamMap from "@/features/map/components/GyeongnamMap";
import MapTooltip from "@/features/map/components/MapTooltip";
import MapSidePanel from "@/features/map/components/MapSidePanel";
import MapHeader from "@/features/map/components/MapHeader";
import MapLegend from "@/features/map/components/MapLegend";
import {
    useAvailableMonths,
    useSurveys,
    useDiscrepancies,
    useAssignmentChanges,
} from "@/features/map/hooks/useMapData";
import { getInstitutionStatuses, getInstitutionDetail, useRegionStats } from "@/features/map/hooks/useRegionStats";
import type { TooltipData, MapMode, MapTheme } from "@/features/map/lib/map-types";

function MapDashboard() {
    const [selectedMonth, setSelectedMonth] = useState<string>("");
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const [selectedInstitutionCode, setSelectedInstitutionCode] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [mapMode, setMapMode] = useState<MapMode>("submission");
    const [mapTheme, setMapTheme] = useState<MapTheme>("sky");

    const { data: availableMonths = [], isLoading: isLoadingMonths } = useAvailableMonths();
    const { data: surveys, isLoading: isLoadingSurveys } = useSurveys(selectedMonth);
    const { data: discrepancies = [] } = useDiscrepancies(selectedMonth);
    const { data: assignmentChanges = [] } = useAssignmentChanges(selectedMonth);

    useEffect(() => {
        if (!selectedMonth && availableMonths.length > 0) {
            const sorted = [...availableMonths].sort((a, b) => {
                const parseSheet = (s: string) => {
                    const match = s.match(/^(\d{4})_(\d{1,2})월$/);
                    if (!match) return { year: 0, month: 0 };
                    return { year: parseInt(match[1]), month: parseInt(match[2]) };
                };
                const pa = parseSheet(a);
                const pb = parseSheet(b);
                if (pa.year !== pb.year) return pb.year - pa.year;
                return pb.month - pa.month;
            });
            setSelectedMonth(sorted[0]);
        }
    }, [availableMonths, selectedMonth]);

    const { regionStatsMap, totalStats } = useRegionStats(surveys);

    const selectedRegionStats = selectedRegion ? regionStatsMap.get(selectedRegion) ?? null : null;
    const selectedInstitutions = useMemo(
        () => (selectedRegion ? getInstitutionStatuses(selectedRegion, surveys) : []),
        [selectedRegion, surveys]
    );
    const selectedInstitution = useMemo(
        () => (selectedInstitutionCode ? getInstitutionDetail(selectedInstitutionCode, surveys) : null),
        [selectedInstitutionCode, surveys]
    );

    const handleRegionClick = useCallback((regionName: string) => {
        setSelectedRegion((prev) => (prev === regionName ? null : regionName));
        setSelectedInstitutionCode(null);
    }, []);

    const handleRegionHover = useCallback(
        (regionName: string, x: number, y: number) => {
            const stats = regionStatsMap.get(regionName);
            if (!stats) return;
            setTooltip({ region: regionName, stats, mode: mapMode, theme: mapTheme, x, y });
        },
        [regionStatsMap, mapMode, mapTheme]
    );

    const handleHoverEnd = useCallback(() => setTooltip(null), []);
    const handleClosePanel = useCallback(() => {
        setSelectedRegion(null);
        setSelectedInstitutionCode(null);
    }, []);
    const handleSelectInstitution = useCallback((code: string) => setSelectedInstitutionCode(code), []);
    const handleBackToRegion = useCallback(() => setSelectedInstitutionCode(null), []);

    if (isLoadingMonths) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex items-center gap-3 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>데이터를 불러오는 중...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen py-8 px-4 transition-colors duration-500 flex flex-col ${mapTheme === "infographic" ? "bg-[#0a0b1e] text-white" : "bg-gray-50 text-gray-900"}`}>
            <div className="max-w-7xl mx-auto w-full">
                <MapHeader
                    selectedMonth={selectedMonth}
                    availableMonths={availableMonths}
                    onMonthChange={setSelectedMonth}
                    totalSubmissions={totalStats.submissions}
                    totalOrganizations={totalStats.totalOrganizations}
                    submissionRate={totalStats.submissionRate}
                    mapMode={mapMode}
                    onMapModeChange={setMapMode}
                    mapTheme={mapTheme}
                    onMapThemeChange={setMapTheme}
                />
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl mx-auto w-full">
                <div className={`flex-1 flex flex-col transition-all duration-300 ${selectedRegion ? "lg:w-[65%]" : "w-full"}`}>
                    <div className="px-4 sm:px-6 py-2">
                        <MapLegend mapMode={mapMode} mapTheme={mapTheme} />
                    </div>
                    <div className="flex-1 relative min-h-[500px]">
                        {isLoadingSurveys && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-sm z-10">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            </div>
                        )}
                        <GyeongnamMap
                            regionStatsMap={regionStatsMap}
                            selectedRegion={selectedRegion}
                            onRegionClick={handleRegionClick}
                            onRegionHover={handleRegionHover}
                            onRegionHoverEnd={handleHoverEnd}
                            mapMode={mapMode}
                            mapTheme={mapTheme}
                        />
                    </div>
                </div>

                {selectedRegion && (
                    <div className="w-[35%] max-w-[480px] border-l border-gray-200 bg-white hidden lg:block">
                        <MapSidePanel
                            regionStats={selectedRegionStats}
                            institutions={selectedInstitutions}
                            onClose={handleClosePanel}
                            onSelectInstitution={handleSelectInstitution}
                            selectedInstitution={selectedInstitution}
                            onBackToRegion={handleBackToRegion}
                            discrepancies={discrepancies}
                            assignmentChanges={assignmentChanges}
                            mapMode={mapMode}
                        />
                    </div>
                )}
            </div>
            <MapTooltip data={tooltip} />
        </div>
    );
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <Toaster />
                <MapDashboard />
            </TooltipProvider>
        </QueryClientProvider>
    );
}
