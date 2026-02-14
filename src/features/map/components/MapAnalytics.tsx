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
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, UserCheck, AlertCircle, Monitor } from "lucide-react";
import type { RegionStats, MapTheme, MapMode, InstitutionDetail } from "../lib/map-types";

interface MapAnalyticsProps {
    regionStatsMap: Map<string, RegionStats>;
    theme: MapTheme;
    mode: MapMode;
    selectedRegion?: string | null;
    institutionDetails?: InstitutionDetail[];
}

export default function MapAnalytics({ regionStatsMap, theme, mode, selectedRegion, institutionDetails = [] }: MapAnalyticsProps) {
    const isDark = theme === "infographic";
    const bgColor = isDark ? "bg-[#1e1e2e]" : "bg-white";
    const textColor = isDark ? "text-white" : "text-gray-900";
    const subTextColor = isDark ? "text-gray-400" : "text-gray-500";
    const borderColor = isDark ? "border-gray-700" : "border-gray-200";

    // ─────────────────────────────────────────────────────────────
    // 1. 전체 시군 통계 데이터 (기존 로직)
    // ─────────────────────────────────────────────────────────────
    const commonChartData = useMemo(() => {
        return Array.from(regionStatsMap.entries())
            .map(([name, stats]) => {
                const totalRegular = stats.sw_m + stats.sw_f + stats.cg_m + stats.cg_f;
                const provincialSw = name === "의령군" ? (stats.short_sw_m + stats.short_sw_f) : 0;

                return {
                    name,
                    submissionRate: stats.submissionRate,
                    submissions: stats.submissions,
                    totalOrgs: stats.totalOrganizations,
                    workers: totalRegular + provincialSw,
                    sw: stats.sw_m + stats.sw_f + provincialSw,
                    cg: stats.cg_m + stats.cg_f,
                    assigned_sw: stats.assigned_sw,
                    assigned_cg: stats.assigned_cg,
                    users: stats.gen_m_gen + stats.gen_f_gen + stats.gen_m_int + stats.gen_f_int + stats.short_m + stats.short_f,
                    genUsers: stats.gen_m_gen + stats.gen_f_gen + stats.gen_m_int + stats.gen_f_int,
                    specialUsers: stats.special_m + stats.special_f,
                    shortUsers: stats.short_m + stats.short_f,
                    newUsers: stats.new_m + stats.new_f + stats.short_new_m + stats.short_new_f,
                    termUsers: (stats.term_m_death + stats.term_m_refuse + stats.term_m_etc +
                        stats.term_f_death + stats.term_f_refuse + stats.term_f_etc),
                };
            })
            .sort((a, b) => b.submissionRate - a.submissionRate);
    }, [regionStatsMap]);

    // ─────────────────────────────────────────────────────────────
    // 2. 선택된 시군의 기관별 상세 데이터 (신규 로직)
    // ─────────────────────────────────────────────────────────────
    const institutionChartData = useMemo(() => {
        if (!selectedRegion || !institutionDetails.length) return [];
        return institutionDetails.map(d => ({
            name: d.기관명.replace("노인통합지원센터", "").replace("종합사회복지관", "").trim(),
            full_name: d.기관명,
            // 종사자 (현원 vs 배정)
            workers: (d.전담사회복지사_남 + d.전담사회복지사_여 + d.생활지원사_남 + d.생활지원사_여),
            sw: (d.전담사회복지사_남 + d.전담사회복지사_여),
            cg: (d.생활지원사_남 + d.생활지원사_여),
            assigned_sw: d.배정_전담사회복지사 || 0,
            assigned_cg: d.배정_생활지원사 || 0,
            assigned_workers: (d.배정_전담사회복지사 || 0) + (d.배정_생활지원사 || 0),

            // 이용자 (현원 vs 배정)
            users: (d.일반중점_남_일반 + d.일반중점_남_중점 + d.일반중점_여_일반 + d.일반중점_여_중점 + d.특화_남 + d.특화_여 + d.단기_남 + d.단기_여),
            assigned_users: d.배정_이용자 || 0,

            // 이용자 구성
            gen: (d.일반중점_남_일반 + d.일반중점_남_중점 + d.일반중점_여_일반 + d.일반중점_여_중점),
            special: (d.특화_남 + d.특화_여),
            short: (d.단기_남 + d.단기_여),

            // 신규/종결
            new: (d.신규대상자_남 + d.신규대상자_여 + d.단기_당월신규_남 + d.단기_당월신규_여),
            term: (d.종결자_남_사망 || 0) + (d.종결자_남_서비스거부 || 0) + (d.종결자_남_기타 || 0) +
                (d.종결자_여_사망 || 0) + (d.종결자_여_서비스거부 || 0) + (d.종결자_여_기타 || 0),
        })).sort((a, b) => {
            if (mode === 'staff') return b.workers - a.workers;
            if (mode === 'user') return b.users - a.users;
            return b.users - a.users;
        }).slice(0, 15); // 상위 15개 기관 표시
    }, [selectedRegion, institutionDetails, mode]);

    // ─────────────────────────────────────────────────────────────
    // 렌더링: 선택된 지역이 있을 때 (상세 심층 분석 모드)
    // ─────────────────────────────────────────────────────────────
    if (selectedRegion) {
        return (
            <div className={`w-full p-6 rounded-3xl shadow-sm border ${bgColor} ${borderColor} transition-colors duration-500`}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className={`text-2xl font-bold ${textColor} flex items-center gap-2`}>
                            {selectedRegion} <span className="text-lg font-normal opacity-70">심층 분석 보고서</span>
                        </h2>
                        <p className={`text-sm ${subTextColor} mt-1`}>
                            {institutionDetails.length}개 수행기관의 채용 효율성, 서비스 도달률, 이용자 구성을 종합적으로 분석합니다.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold flex flex-col items-center">
                            <span>총 종사자</span>
                            <span className="text-lg">{institutionDetails.reduce((a, c) => a + c.전담사회복지사_남 + c.전담사회복지사_여 + c.생활지원사_남 + c.생활지원사_여, 0).toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-2 bg-pink-50 text-pink-700 rounded-lg text-xs font-bold flex flex-col items-center">
                            <span>총 이용자</span>
                            <span className="text-lg">{institutionDetails.reduce((a, c) => a + c.일반중점_남_일반 + c.일반중점_남_중점 + c.일반중점_여_일반 + c.일반중점_여_중점 + c.특화_남 + c.특화_여 + c.단기_남 + c.단기_여, 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* 1. 목표 대비 달성률 (Target vs Actual) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <Card className={`border-none shadow-sm ${isDark ? 'bg-white/5 border-white/10' : ''}`}>
                        <CardHeader>
                            <CardTitle className={`text-base flex items-center gap-2 ${textColor}`}>
                                <Users className="h-4 w-4 text-blue-500" />
                                인력 채용 달성률 (배정 vs 현원)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={institutionChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="name" fontSize={11} interval={0} tick={{ fill: isDark ? '#aaa' : '#666' }} />
                                    <YAxis fontSize={11} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '12px' }} />
                                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="assigned_workers" name="배정 인원" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="workers" name="현재 인원" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className={`border-none shadow-sm ${isDark ? 'bg-white/5 border-white/10' : ''}`}>
                        <CardHeader>
                            <CardTitle className={`text-base flex items-center gap-2 ${textColor}`}>
                                <UserCheck className="h-4 w-4 text-green-500" />
                                서비스 제공 달성률 (목표 vs 실제)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={institutionChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="name" fontSize={11} interval={0} tick={{ fill: isDark ? '#aaa' : '#666' }} />
                                    <YAxis fontSize={11} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '12px' }} />
                                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="assigned_users" name="목표 인원" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="users" name="실제 이용자" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. 이용자 구성 및 순환 (Composition & Flow) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* 구성 분석 (Pie/Donut) */}
                    <Card className={`col-span-1 border-none shadow-sm ${isDark ? 'bg-white/5 border-white/10' : ''}`}>
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Monitor className="h-4 w-4 text-purple-500" />
                                전체 이용자 서비스 유형 구성
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: '일반/중점', value: institutionChartData.reduce((a, c) => a + c.gen, 0), color: '#6366f1' },
                                            { name: '특화', value: institutionChartData.reduce((a, c) => a + c.special, 0), color: '#ec4899' },
                                            { name: '단기', value: institutionChartData.reduce((a, c) => a + c.short, 0), color: '#f59e0b' },
                                        ]}
                                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}
                                        dataKey="value"
                                    >
                                        <Cell key="gen" fill="#6366f1" />
                                        <Cell key="special" fill="#ec4899" />
                                        <Cell key="short" fill="#f59e0b" />
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{institutionDetails.reduce((a, c) => a + c.일반중점_남_일반 + c.일반중점_남_중점 + c.일반중점_여_일반 + c.일반중점_여_중점 + c.특화_남 + c.특화_여 + c.단기_남 + c.단기_여, 0).toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">Total</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 신규/종결 흐름 (Stacked Bar) */}
                    <Card className={`col-span-1 lg:col-span-2 border-none shadow-sm ${isDark ? 'bg-white/5 border-white/10' : ''}`}>
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-orange-500" />
                                기관별 이용자 순환 (신규 유입 vs 서비스 종료)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={institutionChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="name" fontSize={11} interval={0} tick={{ fill: isDark ? '#aaa' : '#666' }} />
                                    <YAxis fontSize={11} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '12px' }} />
                                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="new" name="신규 유입" stackId="a" fill="#22c55e" barSize={30} />
                                    <Bar dataKey="term" name="서비스 종료" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. 관할 권역 및 기관 리스트 (Map Placeholder) */}
                <Card className={`border-none shadow-sm ${isDark ? 'bg-white/5 border-white/10' : ''}`}>
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-gray-500" />
                            관할 구역 및 기관 현황
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {institutionChartData.map((inst, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx < 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className={`font-semibold text-sm ${textColor}`}>{inst.full_name}</div>
                                            <div className="text-[10px] text-gray-500">
                                                {inst.assigned_workers > 0 ? `배정: ${inst.assigned_workers}명 / 현원: ${inst.workers}명` : `현원: ${inst.workers}명`}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-lg font-bold ${inst.users >= inst.assigned_users ? 'text-green-600' : 'text-orange-500'}`}>
                                            {inst.users.toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-gray-400">이용자</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 렌더링: 전체 시군 통계 모드 (기존 로직)
    // ─────────────────────────────────────────────────────────────
    const renderModeSpecificView = () => {
        switch (mode) {
            case "submission":
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className={`lg:col-span-2 border-none shadow-sm ${isDark ? "bg-white/5 border-white/10" : ""}`}>
                            <CardHeader className="pb-2">
                                <CardTitle className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-700"}`}>시군별 데이터 제출 현황 (%)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] w-full mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={commonChartData} margin={{ top: 5, right: 30, left: -20, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.1)" : "#f1f5f9"} />
                                            <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} fontSize={10} stroke={isDark ? "#94a3b8" : "#64748b"} />
                                            <YAxis domain={[0, 100]} fontSize={10} stroke={isDark ? "#94a3b8" : "#64748b"} />
                                            <Tooltip contentStyle={{ backgroundColor: isDark ? "#1e1b4b" : "#fff", borderColor: isDark ? "#312e81" : "#e2e8f0", fontSize: "12px", borderRadius: "8px" }} />
                                            <Bar dataKey="submissionRate" radius={[4, 4, 0, 0]}>
                                                {commonChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.submissionRate >= 100 ? "#10b981" : entry.submissionRate >= 80 ? "#3b82f6" : "#f59e0b"} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={`border-none shadow-sm ${isDark ? "bg-white/5 border-white/10" : ""}`}>
                            <CardHeader>
                                <CardTitle className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-700"}`}>전체 제출 요약</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                {commonChartData.filter(d => d.submissionRate < 100).length > 0 ? (
                                    <div className="space-y-3">
                                        <p className="text-xs text-orange-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> 미제출 기관 존재 ({commonChartData.reduce((acc, curr) => acc + (curr.totalOrgs - curr.submissions), 0)}개)</p>
                                        <div className="max-h-[200px] overflow-auto space-y-2 pr-2 custom-scrollbar">
                                            {commonChartData.filter(d => d.submissionRate < 100).map(d => (
                                                <div key={d.name} className="flex justify-between items-center text-xs p-2 bg-black/5 rounded-lg border border-black/5">
                                                    <span className={isDark ? "text-gray-300" : "text-gray-600"}>{d.name}</span>
                                                    <span className="font-bold text-orange-500">{d.submissions}/{d.totalOrgs}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full py-10 opacity-70">
                                        <UserCheck className="h-12 w-12 text-emerald-500 mb-2" />
                                        <p className="text-sm font-medium">모든 기관 제출 완료</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                );

            case "staff":
                const totalSw = commonChartData.reduce((acc, curr) => acc + curr.sw, 0);
                const totalCg = commonChartData.reduce((acc, curr) => acc + curr.cg, 0);
                const staffPieData = [
                    { name: "사회복지사", value: totalSw, color: "#4f46e5" },
                    { name: "생활지원사", value: totalCg, color: "#10b981" }
                ];
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className={`border-none shadow-sm ${isDark ? "bg-white/5 border-white/10" : ""}`}>
                            <CardHeader><CardTitle className="text-sm font-bold">시군별 인력 구성 (SW vs CG)</CardTitle></CardHeader>
                            <CardContent>
                                <div className="h-[280px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={commonChartData} margin={{ top: 5, right: 30, left: -20, bottom: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                            <XAxis dataKey="name" fontSize={10} interval={0} angle={-30} textAnchor="end" />
                                            <YAxis fontSize={10} />
                                            <Tooltip />
                                            <Legend verticalAlign="top" wrapperStyle={{ fontSize: '10px', marginBottom: '10px' }} />
                                            <Bar dataKey="sw" name="사회복지사" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="cg" name="생활지원사" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={`border-none shadow-sm ${isDark ? "bg-white/5 border-white/10" : ""}`}>
                            <CardHeader><CardTitle className="text-sm font-bold">전체 종사자 비율</CardTitle></CardHeader>
                            <CardContent className="flex flex-col items-center">
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={staffPieData} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                                                {staffPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex gap-4 text-xs">
                                    {staffPieData.map(e => (
                                        <div key={e.name} className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                                            <span className="opacity-70">{e.name}: {e.value.toLocaleString()}명</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            case "user":
            case "short_term":
                const userViewData = [
                    { name: "일반/중점", value: commonChartData.reduce((acc, curr) => acc + curr.genUsers, 0), color: "#4f46e5" },
                    { name: "특화서비스", value: commonChartData.reduce((acc, curr) => acc + curr.specialUsers, 0), color: "#10b981" },
                    { name: "단기집중", value: commonChartData.reduce((acc, curr) => acc + curr.shortUsers, 0), color: "#f59e0b" },
                ];
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className={`border-none shadow-sm ${isDark ? "bg-white/5 border-white/10" : ""}`}>
                            <CardHeader><CardTitle className="text-sm font-bold">시군별 이용자 규모</CardTitle></CardHeader>
                            <CardContent>
                                <div className="h-[280px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={commonChartData} margin={{ top: 5, right: 30, left: -20, bottom: 40 }}>
                                            <XAxis dataKey="name" fontSize={10} interval={0} angle={-30} textAnchor="end" />
                                            <YAxis fontSize={10} />
                                            <Tooltip />
                                            <Bar dataKey="users" name="총 이용자" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={`border-none shadow-sm ${isDark ? "bg-white/5 border-white/10" : ""}`}>
                            <CardHeader><CardTitle className="text-sm font-bold">서비스 유형별 분포</CardTitle></CardHeader>
                            <CardContent className="flex flex-col items-center">
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={userViewData} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                                                {userViewData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-wrap justify-center gap-3 text-xs">
                                    {userViewData.map(e => (
                                        <div key={e.name} className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                                            <span className="opacity-70">{e.name}: {e.value.toLocaleString()}명</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            case "new_term":
            case "termination":
                return (
                    <Card className={`border-none shadow-sm ${isDark ? "bg-white/5 border-white/10" : ""}`}>
                        <CardHeader><CardTitle className="text-sm font-bold">시군별 신규 유입 vs 서비스 종료 비교</CardTitle></CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={commonChartData} margin={{ top: 5, right: 30, left: -20, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                        <XAxis dataKey="name" fontSize={10} interval={0} angle={-30} textAnchor="end" />
                                        <YAxis fontSize={10} />
                                        <Tooltip />
                                        <Legend verticalAlign="top" wrapperStyle={{ fontSize: '10px', marginBottom: '10px' }} />
                                        <Bar dataKey="newUsers" name="신규 대상자" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="termUsers" name="종결 대상자" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                );

            default:
                return (
                    <div className="flex items-center justify-center min-h-[300px] text-gray-400 text-sm italic">
                        해당 섹션의 상세 시각화를 준비 중입니다.
                    </div>
                );
        }
    };

    return (
        <div className="space-y-4">
            {renderModeSpecificView()}

            {/* 하단 요약 그리드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className={`p-4 rounded-xl border ${isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-sm"}`}>
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <span className="text-[10px] uppercase font-bold text-gray-400">전체 성장</span>
                    </div>
                    <div className="text-lg font-bold">+{commonChartData.reduce((a, c) => a + c.newUsers, 0).toLocaleString()}</div>
                    <div className="text-[10px] opacity-70">당월 총 신규 유입</div>
                </div>
                <div className={`p-4 rounded-xl border ${isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-sm"}`}>
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="text-[10px] uppercase font-bold text-gray-400">인당 관리</span>
                    </div>
                    <div className="text-lg font-bold">
                        {(commonChartData.reduce((a, c) => a + c.users, 0) / commonChartData.reduce((a, c) => a + c.workers, 0)).toFixed(1)}명
                    </div>
                    <div className="text-[10px] opacity-70">종사자 1인당 이용자</div>
                </div>
            </div>
        </div>
    );
}
