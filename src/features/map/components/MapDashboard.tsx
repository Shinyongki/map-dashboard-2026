import { useState, useCallback, useEffect, useMemo } from "react";
import { Loader2, WifiOff } from "lucide-react";
import GyeongnamMap from "./GyeongnamMap";
import MapTooltip from "./MapTooltip";
import MapSidePanel from "./MapSidePanel";
import MapHeader from "./MapHeader";
import MapLegend from "./MapLegend";
import MapMetricCards from "./MapMetricCards";
import MapAnalytics from "./MapAnalytics";
import AllocationMismatchPanel from "./AllocationMismatchPanel";
import {
    useAvailableMonths,
    useSurveys,
    useDiscrepancies,
    useAssignmentChanges,
} from "../hooks/useMapData";
import { getInstitutionStatuses, getInstitutionDetail, getInstitutionDetails, useRegionStats } from "../hooks/useRegionStats";
import { useInstitutionProfiles, useInstitutionProfile } from "../hooks/useInstitutionProfiles";
import type { TooltipData, MapMode, MapTheme } from "../lib/map-types";

export default function MapDashboard() {
    const [selectedMonth, setSelectedMonth] = useState<string>("");
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const [selectedInstitutionCode, setSelectedInstitutionCode] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [mapMode, setMapMode] = useState<MapMode>("submission");
    const [mapTheme, setMapTheme] = useState<MapTheme>("sky");

    const { data: availableMonths = [], isLoading: isLoadingMonths } = useAvailableMonths();
    const { data: surveys, isLoading: isLoadingSurveys, isFallback } = useSurveys(selectedMonth);
    const { data: discrepancies = [] } = useDiscrepancies(selectedMonth);
    const { data: assignmentChanges = [] } = useAssignmentChanges(selectedMonth);
    const { data: institutionProfiles } = useInstitutionProfiles();

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
    // 차트용 상세 데이터
    const selectedInstitutionDetails = useMemo(
        () => (selectedRegion ? getInstitutionDetails(selectedRegion, surveys) : []),
        [selectedRegion, surveys]
    );

    const selectedInstitution = useMemo(
        () => (selectedInstitutionCode ? getInstitutionDetail(selectedInstitutionCode, surveys) : null),
        [selectedInstitutionCode, surveys]
    );
    const selectedProfile = useInstitutionProfile(selectedInstitutionCode, institutionProfiles);

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

    const isDark = mapTheme === "infographic";

    return (
        <div className={`min-h-screen py-8 px-4 transition-colors duration-500 flex flex-col ${isDark ? "bg-[#0a0b1e] text-white" : "bg-gray-50 text-gray-900"}`}>
            <div className="max-w-7xl mx-auto w-full">
                {isFallback && (
                    <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-sm font-medium">
                        <WifiOff className="h-4 w-4 flex-shrink-0" />
                        ⚠️ 서버 연결 없음 — 최근 저장된 데이터를 표시 중입니다
                    </div>
                )}
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

                <MapMetricCards totalStats={totalStats} regionStatsMap={regionStatsMap} />

                <div className="flex flex-col lg:flex-row gap-6 mb-6">
                    {/* Map Section */}
                    <div className={`flex-1 bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 relative ${isDark ? "bg-white/5 border-white/10" : "bg-white"}`}>
                        <div className="absolute top-4 left-4 z-10">
                            <MapLegend mapMode={mapMode} mapTheme={mapTheme} />
                        </div>
                        <div className="h-[600px] relative">
                            {isLoadingSurveys && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-sm z-20">
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

                    {/* Sidebar or Analytics */}
                    <div className="lg:w-[400px] flex flex-col gap-6">
                        {selectedRegion ? (
                            <div className="h-[600px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                                <MapSidePanel
                                    regionStats={selectedRegionStats}
                                    institutions={selectedInstitutions}
                                    onClose={handleClosePanel}
                                    onSelectInstitution={handleSelectInstitution}
                                    selectedInstitution={selectedInstitution}
                                    institutionProfile={selectedProfile}
                                    onBackToRegion={handleBackToRegion}
                                    discrepancies={discrepancies}
                                    assignmentChanges={assignmentChanges}
                                    mapMode={mapMode}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className={`p-6 rounded-2xl border ${isDark ? "bg-white/5 border-white/10 text-gray-400" : "bg-blue-50 border-blue-100 text-blue-700"}`}>
                                    <h3 className="font-bold mb-1">시군별 상세 정보</h3>
                                    <p className="text-sm opacity-90">지도의 시군을 클릭하면 해당 지역의 제출 내역과 상세 통계, 그리고 개별 기관의 데이터를 실시간으로 확인할 수 있습니다.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-2">
                    <MapAnalytics
                        regionStatsMap={regionStatsMap}
                        theme={mapTheme}
                        mode={mapMode}
                        selectedRegion={selectedRegion}
                        institutionDetails={selectedInstitutionDetails}
                    />
                </div>

                <div className="mt-6">
                    <AllocationMismatchPanel
                        surveys={surveys}
                        institutionProfiles={institutionProfiles}
                        isDark={isDark}
                    />
                </div>
            </div>
            <MapTooltip data={tooltip} />
        </div>
    );
}
