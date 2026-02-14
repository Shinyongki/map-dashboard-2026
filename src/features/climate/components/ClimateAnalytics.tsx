import { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Legend,
    LineChart,
    Line,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, ThermometerSun, Snowflake, MapPin, Calendar } from "lucide-react";
import type { ClimateRegionStats, ClimateMapMode } from "../lib/climate-types";

interface ClimateAnalyticsProps {
    climateStatsMap: Map<string, ClimateRegionStats>;
    selectedRegion: string | null;
    yearRange: [number, number];
    mode: ClimateMapMode;
}

export default function ClimateAnalytics({
    climateStatsMap,
    selectedRegion,
    yearRange,
    mode
}: ClimateAnalyticsProps) {
    // ─────────────────────────────────────────────────────────────
    // 1. 데이터 가공 (Global / Local)
    // ─────────────────────────────────────────────────────────────
    const analyticsData = useMemo(() => {
        // 전체 통계 집계
        const allStats = Array.from(climateStatsMap.values());

        // 연도별 추이 (전체)
        const globalYearly = new Map<number, { year: number, cold: number, heat: number, total: number }>();
        // 월별 분포 (전체)
        const globalMonthly = new Array(12).fill(0).map((_, i) => ({ month: i + 1, cold: 0, heat: 0, total: 0 }));
        // 지역별 순위
        const regionRanking = allStats
            .map(s => ({
                name: s.region,
                total: s.totalAlertCount,
                cold: s.coldAdvisoryCount + s.coldWarningCount,
                heat: s.heatAdvisoryCount + s.heatWarningCount
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10); // Top 10

        // 유형별 비율
        let totalCold = 0;
        let totalHeat = 0;

        allStats.forEach(stat => {
            // 연도별 집계
            stat.yearlyBreakdown.forEach(y => {
                const existing = globalYearly.get(y.year) || { year: y.year, cold: 0, heat: 0, total: 0 };
                existing.cold += (y.coldAdvisoryCount + y.coldWarningCount);
                existing.heat += (y.heatAdvisoryCount + y.heatWarningCount);
                existing.total += y.totalCount;
                globalYearly.set(y.year, existing);
            });

            // 월별 집계
            stat.monthlyBreakdown.forEach((m, idx) => {
                globalMonthly[idx].cold += (m.coldAdvisoryCount + m.coldWarningCount);
                globalMonthly[idx].heat += (m.heatAdvisoryCount + m.heatWarningCount);
                globalMonthly[idx].total += m.totalCount;
            });

            totalCold += (stat.coldAdvisoryCount + stat.coldWarningCount);
            totalHeat += (stat.heatAdvisoryCount + stat.heatWarningCount);
        });

        const globalYearlyData = Array.from(globalYearly.values()).sort((a, b) => a.year - b.year);

        return {
            globalYearlyData,
            globalMonthly,
            regionRanking,
            pieData: [
                { name: '한파', value: totalCold, color: '#3b82f6' },
                { name: '폭염', value: totalHeat, color: '#ef4444' }
            ]
        };
    }, [climateStatsMap]);

    // 선택된 지역 데이터
    const selectedStats = selectedRegion ? climateStatsMap.get(selectedRegion) : null;

    // ─────────────────────────────────────────────────────────────
    // 렌더링: 선택된 지역 상세 분석
    // ─────────────────────────────────────────────────────────────
    if (selectedRegion && selectedStats) {
        return (
            <div className="w-full p-6 bg-white rounded-3xl shadow-sm border border-gray-200 transition-all duration-500 mt-2">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            {selectedRegion} <span className="text-lg font-normal text-gray-500">기후 위기 상세 분석</span>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {yearRange[0]}년~{yearRange[1]}년 동안의 상세 기후 특보 이력입니다.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <div className="px-4 py-2 bg-sky-50 text-sky-700 rounded-lg text-xs font-bold flex flex-col items-center">
                            <span>한파 특보</span>
                            <span className="text-lg">{(selectedStats.coldAdvisoryCount + selectedStats.coldWarningCount).toLocaleString()}건</span>
                        </div>
                        <div className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold flex flex-col items-center">
                            <span>폭염 특보</span>
                            <span className="text-lg">{(selectedStats.heatAdvisoryCount + selectedStats.heatWarningCount).toLocaleString()}건</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* 1. 연도별 추이 (Bar + Line) */}
                    <Card className="border-none shadow-sm bg-gray-50">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                                연도별 특보 발생 추이
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={selectedStats.yearlyBreakdown} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="year" fontSize={11} />
                                    <YAxis fontSize={11} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="coldWarningCount" name="한파경보" stackId="a" fill="#1d4ed8" />
                                    <Bar dataKey="coldAdvisoryCount" name="한파주의보" stackId="a" fill="#60a5fa" />
                                    <Bar dataKey="heatWarningCount" name="폭염경보" stackId="a" fill="#b91c1c" />
                                    <Bar dataKey="heatAdvisoryCount" name="폭염주의보" stackId="a" fill="#fdba74" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 2. 월별 패턴 (Area/Bar) */}
                    <Card className="border-none shadow-sm bg-gray-50">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-green-500" />
                                월별 발생 패턴
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={selectedStats.monthlyBreakdown} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="month" fontSize={11} tickFormatter={(v) => `${v}월`} />
                                    <YAxis fontSize={11} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                        labelFormatter={(v) => `${v}월`}
                                    />
                                    <Bar dataKey="totalCount" name="특보 건수" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. 최근 특보 상세 리스트 */}
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        최근 특보 발령 이력
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-2 rounded-l-lg">발령일자</th>
                                    <th className="px-4 py-2">해제일자</th>
                                    <th className="px-4 py-2">유형</th>
                                    <th className="px-4 py-2 rounded-r-lg">기간</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {selectedStats.recentAlerts.slice(0, 10).map((alert, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-2 font-medium">{alert.startDate}</td>
                                        <td className="px-4 py-2 text-gray-500">{alert.endDate}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded textxs font-bold ${alert.alertType.includes('cold') ? 'bg-sky-100 text-sky-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {alert.alertType.includes('warning') ? '경보' : '주의보'}
                                                {alert.alertType.includes('cold') ? '(한파)' : '(폭염)'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-500">
                                            {Math.ceil((new Date(alert.endDate).getTime() - new Date(alert.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}일간
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 렌더링: 전체 지역 통합 분석 (Global Dashboard)
    // ─────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 요약 카드들 */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Total Alerts</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                {analyticsData.globalYearlyData.reduce((a, c) => a + c.total, 0).toLocaleString()}건
                            </h3>
                        </div>
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Heat Waves</p>
                            <h3 className="text-2xl font-bold text-orange-600 mt-1">
                                {analyticsData.pieData.find(d => d.name === '폭염')?.value.toLocaleString()}건
                            </h3>
                        </div>
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                            <ThermometerSun className="h-5 w-5" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Cold Waves</p>
                            <h3 className="text-2xl font-bold text-sky-600 mt-1">
                                {analyticsData.pieData.find(d => d.name === '한파')?.value.toLocaleString()}건
                            </h3>
                        </div>
                        <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                            <Snowflake className="h-5 w-5" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Most Frequent</p>
                            <h3 className="text-lg font-bold text-gray-900 mt-1 truncate">
                                {analyticsData.regionRanking[0]?.name || '-'}
                            </h3>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
                            <MapPin className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. 경남 전체 연도별 추이 */}
                <Card className="lg:col-span-2 border-none shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-gray-800">경남 전체 기후특보 연도별 추이</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData.globalYearlyData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis dataKey="year" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Line type="monotone" dataKey="heat" name="폭염" stroke="#ea580c" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="cold" name="한파" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 2. 시군별 발생 순위 */}
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-gray-800">지역별 발생 빈도 (Top 10)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={analyticsData.regionRanking} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f1f5f9' }}
                                />
                                <Bar dataKey="heat" name="폭염" stackId="a" fill="#fdba74" radius={[0, 0, 0, 0]} barSize={16} />
                                <Bar dataKey="cold" name="한파" stackId="a" fill="#93c5fd" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 3. 월별 분포 (계절성) */}
                <Card className="lg:col-span-3 border-none shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-gray-800">계절별 특보 발생 패턴 (월별 합계)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.globalMonthly} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis dataKey="month" fontSize={12} tickFormatter={(v) => `${v}월`} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    labelFormatter={(v) => `${v}월`}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Legend />
                                <Bar dataKey="cold" name="한파" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="heat" name="폭염" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
