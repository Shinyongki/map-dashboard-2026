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
import { TrendingUp, CloudRain, Wind, Zap, AlertTriangle, MapPin, Calendar, Waves } from "lucide-react";
import type { DisasterRegionStats, DisasterMapMode } from "../lib/disaster-types";

interface DisasterAnalyticsProps {
    disasterStatsMap: Map<string, DisasterRegionStats>;
    selectedRegion: string | null;
    yearRange: [number, number];
    mode: DisasterMapMode;
}

export default function DisasterAnalytics({
    disasterStatsMap,
    selectedRegion,
    yearRange,
    mode
}: DisasterAnalyticsProps) {
    // ─────────────────────────────────────────────────────────────
    // 1. 데이터 가공 (Global / Local)
    // ─────────────────────────────────────────────────────────────
    const analyticsData = useMemo(() => {
        // 전체 통계 집계
        const allStats = Array.from(disasterStatsMap.values());

        // 연도별 추이 (전체)
        const globalYearly = new Map<number, { year: number, typhoon: number, flood: number, earthquake: number, landslide: number, total: number }>();
        // 월별 분포 (전체)
        const globalMonthly = new Array(12).fill(0).map((_, i) => ({ month: i + 1, typhoon: 0, flood: 0, earthquake: 0, landslide: 0, total: 0 }));
        // 지역별 순위
        const regionRanking = allStats
            .map(s => ({
                name: s.region,
                total: s.totalCount,
                typhoon: s.typhoonCount,
                flood: s.floodCount,
                earthquake: s.earthquakeCount,
                landslide: s.landslideRiskCount
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10); // Top 10

        // 유형별 비율
        let totalTyphoon = 0;
        let totalFlood = 0;
        let totalEarthquake = 0;
        let totalLandslide = 0;

        allStats.forEach(stat => {
            // 연도별 집계
            stat.yearlyBreakdown.forEach(y => {
                const existing = globalYearly.get(y.year) || { year: y.year, typhoon: 0, flood: 0, earthquake: 0, landslide: 0, total: 0 };
                existing.typhoon += y.typhoonCount;
                existing.flood += y.floodCount;
                existing.earthquake += y.earthquakeCount;
                existing.landslide += y.landslideRiskCount;
                existing.total += y.totalCount;
                globalYearly.set(y.year, existing);
            });

            // 월별 집계
            stat.monthlyBreakdown.forEach((m, idx) => {
                globalMonthly[idx].typhoon += m.typhoonCount;
                globalMonthly[idx].flood += m.floodCount;
                globalMonthly[idx].earthquake += m.earthquakeCount;
                globalMonthly[idx].landslide += m.landslideRiskCount;
                globalMonthly[idx].total += m.totalCount;
            });

            totalTyphoon += stat.typhoonCount;
            totalFlood += stat.floodCount;
            totalEarthquake += stat.earthquakeCount;
            totalLandslide += stat.landslideRiskCount;
        });

        const globalYearlyData = Array.from(globalYearly.values()).sort((a, b) => a.year - b.year);

        return {
            globalYearlyData,
            globalMonthly,
            regionRanking,
            pieData: [
                { name: '태풍', value: totalTyphoon, color: '#0ea5e9' },
                { name: '호우/홍수', value: totalFlood, color: '#3b82f6' },
                { name: '지진', value: totalEarthquake, color: '#eab308' },
                { name: '산사태', value: totalLandslide, color: '#22c55e' }
            ]
        };
    }, [disasterStatsMap]);

    // 선택된 지역 데이터
    const selectedStats = selectedRegion ? disasterStatsMap.get(selectedRegion) : null;

    // ─────────────────────────────────────────────────────────────
    // 렌더링: 선택된 지역 상세 분석
    // ─────────────────────────────────────────────────────────────
    if (selectedRegion && selectedStats) {
        return (
            <div className="w-full p-6 bg-white rounded-3xl shadow-sm border border-gray-200 transition-all duration-500 mt-2">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            {selectedRegion} <span className="text-lg font-normal text-gray-500">자연재난 상세 분석</span>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {yearRange[0]}년~{yearRange[1]}년 동안의 상세 재난 발생 이력입니다.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <div className="px-4 py-2 bg-sky-50 text-sky-700 rounded-lg text-xs font-bold flex flex-col items-center">
                            <span>태풍/호우</span>
                            <span className="text-lg">{(selectedStats.typhoonCount + selectedStats.floodCount).toLocaleString()}건</span>
                        </div>
                        <div className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-bold flex flex-col items-center">
                            <span>지진/기타</span>
                            <span className="text-lg">{(selectedStats.earthquakeCount + selectedStats.landslideRiskCount).toLocaleString()}건</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* 1. 연도별 추이 (Bar + Line) */}
                    <Card className="border-none shadow-sm bg-gray-50">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                                연도별 재난 발생 추이
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
                                    <Bar dataKey="typhoonCount" name="태풍" stackId="a" fill="#0ea5e9" />
                                    <Bar dataKey="floodCount" name="호우" stackId="a" fill="#3b82f6" />
                                    <Bar dataKey="earthquakeCount" name="지진" stackId="a" fill="#eab308" />
                                    <Bar dataKey="landslideRiskCount" name="산사태" stackId="a" fill="#22c55e" />
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
                                    <Bar dataKey="totalCount" name="재난 건수" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. 최근 재난 상세 리스트 */}
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        최근 재난 발생 이력
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-2 rounded-l-lg">발생일자</th>
                                    <th className="px-4 py-2">유형</th>
                                    <th className="px-4 py-2">단계</th>
                                    <th className="px-4 py-2 rounded-r-lg">비고</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {selectedStats.recentAlerts.slice(0, 10).map((alert, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-2 font-medium">{alert.date}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${alert.disasterType === 'typhoon' ? 'bg-sky-100 text-sky-700' :
                                                    alert.disasterType === 'flood' ? 'bg-blue-100 text-blue-700' :
                                                        alert.disasterType === 'earthquake' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-green-100 text-green-700'
                                                }`}>
                                                {alert.disasterType === 'typhoon' ? '태풍' :
                                                    alert.disasterType === 'flood' ? '호우' :
                                                        alert.disasterType === 'earthquake' ? '지진' : '산사태'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-500">
                                            <span className={`font-medium ${alert.alertLevel === 'warning' ? 'text-red-500' : 'text-orange-500'}`}>
                                                {alert.alertLevel === 'warning' ? '경보' : '주의보'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-500">
                                            {alert.magnitude ? `규모 ${alert.magnitude}` : '-'}
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
                            <p className="text-xs text-gray-500 font-bold uppercase">Total Disasters</p>
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
                            <p className="text-xs text-gray-500 font-bold uppercase">Typhoon & Water</p>
                            <h3 className="text-2xl font-bold text-blue-600 mt-1">
                                {(analyticsData.pieData.find(d => d.name === '태풍')?.value || 0 + (analyticsData.pieData.find(d => d.name === '호우/홍수')?.value || 0)).toLocaleString()}건
                            </h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <CloudRain className="h-5 w-5" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Earthquake</p>
                            <h3 className="text-2xl font-bold text-yellow-600 mt-1">
                                {analyticsData.pieData.find(d => d.name === '지진')?.value.toLocaleString()}건
                            </h3>
                        </div>
                        <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                            <Zap className="h-5 w-5" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Risk Region</p>
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
                        <CardTitle className="text-base font-bold text-gray-800">경남 자연재난 발생 추이</CardTitle>
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
                                <Line type="monotone" dataKey="typhoon" name="태풍" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="flood" name="호우" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="earthquake" name="지진" stroke="#eab308" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 2. 시군별 발생 순위 */}
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-gray-800">지역별 재난 빈도 (Top 10)</CardTitle>
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
                                <Bar dataKey="total" name="총 발생건수" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 3. 월별 분포 (계절성) */}
                <Card className="lg:col-span-3 border-none shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-gray-800">월별 재난 발생 패턴</CardTitle>
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
                                <Bar dataKey="typhoon" name="태풍" stackId="a" fill="#0ea5e9" />
                                <Bar dataKey="flood" name="호우" stackId="a" fill="#3b82f6" />
                                <Bar dataKey="earthquake" name="지진" stackId="a" fill="#eab308" />
                                <Bar dataKey="landslide" name="산사태" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
