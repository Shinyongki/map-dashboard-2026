import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle, Filter, ChevronRight, ChevronLeft, ArrowUpDown } from "lucide-react";
import type { InstitutionProfile } from "../lib/map-types";
import type { SurveyData } from "@/lib/validation";

interface AllocationMismatchPanelProps {
    surveys: SurveyData[] | undefined;
    institutionProfiles: InstitutionProfile[] | undefined;
    isDark?: boolean;
    onSelectSigun?: (sigun: string | null) => void;
}

interface MismatchRow {
    code: string;
    name: string;
    sigun: string;
    mow_sw: number;
    sub_sw: number;
    diff_sw: number;
    mow_cg: number;
    sub_cg: number;
    diff_cg: number;
    mow_users: number;
    sub_users: number;
    diff_users: number;
    hasMismatch: boolean;
    totalAbsDiff: number;
    submitted: boolean;
}

interface SigunSummary {
    sigun: string;
    totalOrgs: number;
    submittedOrgs: number;
    mismatchOrgs: number;
    totalDiff_sw: number;
    totalDiff_cg: number;
    totalDiff_users: number;
    totalAbsDiff: number;
}

export default function AllocationMismatchPanel({
    surveys,
    institutionProfiles,
    isDark = false,
    onSelectSigun,
}: AllocationMismatchPanelProps) {
    const [mismatchOnly, setMismatchOnly] = useState(false);
    const [drilldownSigun, setDrilldownSigun] = useState<string | null>(null);

    // ── 기관별 행 계산 ──────────────────────────────────────────────
    const rows = useMemo<MismatchRow[]>(() => {
        if (!institutionProfiles) return [];
        const surveyMap = new Map<string, SurveyData>();
        if (surveys) {
            for (const s of surveys) surveyMap.set(s.기관코드, s);
        }
        return institutionProfiles
            .filter((p) => p.region !== "*광역지원기관")
            .map((p) => {
                const survey = surveyMap.get(p.code);
                const mow_sw = p.allocation.mow.socialWorker;
                const mow_cg = p.allocation.mow.careProvider;
                const mow_users = p.allocation.mow.users;
                const sub_sw = survey ? (survey.배정_전담사회복지사 ?? 0) : 0;
                const sub_cg = survey ? (survey.배정_생활지원사 ?? 0) : 0;
                const sub_users = survey ? (survey.배정_이용자 ?? 0) : 0;
                const diff_sw = sub_sw - mow_sw;
                const diff_cg = sub_cg - mow_cg;
                const diff_users = sub_users - mow_users;
                const totalAbsDiff = Math.abs(diff_sw) + Math.abs(diff_cg) + Math.abs(diff_users);
                return {
                    code: p.code, name: p.name, sigun: p.region,
                    mow_sw, sub_sw, diff_sw,
                    mow_cg, sub_cg, diff_cg,
                    mow_users, sub_users, diff_users,
                    hasMismatch: totalAbsDiff > 0 && !!survey,
                    totalAbsDiff,
                    submitted: !!survey,
                };
            });
    }, [surveys, institutionProfiles]);

    // ── 시군별 집계 요약 ────────────────────────────────────────────
    const sigunSummaries = useMemo<SigunSummary[]>(() => {
        const map = new Map<string, SigunSummary>();
        for (const row of rows) {
            if (!map.has(row.sigun)) {
                map.set(row.sigun, {
                    sigun: row.sigun,
                    totalOrgs: 0, submittedOrgs: 0, mismatchOrgs: 0,
                    totalDiff_sw: 0, totalDiff_cg: 0, totalDiff_users: 0, totalAbsDiff: 0,
                });
            }
            const s = map.get(row.sigun)!;
            s.totalOrgs++;
            if (row.submitted) {
                s.submittedOrgs++;
                s.totalDiff_sw += row.diff_sw;
                s.totalDiff_cg += row.diff_cg;
                s.totalDiff_users += row.diff_users;
                s.totalAbsDiff += row.totalAbsDiff;
            }
            if (row.hasMismatch) s.mismatchOrgs++;
        }
        let result = Array.from(map.values());
        if (mismatchOnly) result = result.filter((s) => s.mismatchOrgs > 0);
        return result.sort((a, b) => b.totalAbsDiff - a.totalAbsDiff);
    }, [rows, mismatchOnly]);

    // ── 드릴다운: 특정 시군 기관 목록 ──────────────────────────────
    const drilldownRows = useMemo(() => {
        if (!drilldownSigun) return [];
        return rows
            .filter((r) => r.sigun === drilldownSigun)
            .sort((a, b) => b.totalAbsDiff - a.totalAbsDiff);
    }, [rows, drilldownSigun]);

    const mismatchCount = rows.filter((r) => r.hasMismatch).length;
    const totalCount = rows.filter((r) => r.submitted).length;

    // ── 시군 선택 핸들러 ───────────────────────────────────────────
    const handleSigunClick = (sigun: string) => {
        setDrilldownSigun(sigun);
        onSelectSigun?.(sigun);
    };

    const handleBackToSummary = () => {
        setDrilldownSigun(null);
        onSelectSigun?.(null);
    };

    // ── 테마 ───────────────────────────────────────────────────────
    const bg = isDark ? "bg-[#1e1e2e] border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900";
    const subText = isDark ? "text-gray-400" : "text-gray-500";
    const headerBg = isDark ? "bg-gray-800 text-gray-300" : "bg-gray-50 text-gray-600";
    const rowBg = isDark ? "border-gray-700 hover:bg-gray-800/50" : "border-gray-100 hover:bg-gray-50";
    const mismatchRowBg = isDark ? "bg-red-900/20" : "bg-red-50";

    const DiffCell = ({ diff, mow, sub }: { diff: number; mow: number; sub: number }) => {
        const isMismatch = diff !== 0 && sub > 0;
        return (
            <td className={`px-3 py-2 text-center text-sm ${isMismatch ? "text-red-600 font-semibold" : subText}`}>
                <span className="block">{mow} / {sub}</span>
                {isMismatch && (
                    <span className={`text-xs ${diff > 0 ? "text-orange-500" : "text-red-500"}`}>
                        ({diff > 0 ? "+" : ""}{diff})
                    </span>
                )}
            </td>
        );
    };

    const SumDiffCell = ({ diff, total }: { diff: number; total: number }) => {
        const hasDiff = total > 0;
        return (
            <td className={`px-3 py-2 text-center text-sm ${hasDiff ? "text-red-600 font-semibold" : subText}`}>
                {hasDiff ? (
                    <>
                        <span className="block">{total}</span>
                        <span className={`text-xs ${diff > 0 ? "text-orange-500" : diff < 0 ? "text-red-500" : subText}`}>
                            {diff !== 0 ? `(${diff > 0 ? "+" : ""}${diff})` : ""}
                        </span>
                    </>
                ) : (
                    <span>—</span>
                )}
            </td>
        );
    };

    return (
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${bg}`}>
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-inherit flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                    <h3 className="font-bold text-base flex items-center gap-2">
                        {drilldownSigun ? (
                            <button
                                onClick={handleBackToSummary}
                                className={`flex items-center gap-1 text-sm font-medium hover:opacity-70 ${subText}`}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                시군 목록
                            </button>
                        ) : (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                        {drilldownSigun ? (
                            <span className="text-blue-600">{drilldownSigun} 상세</span>
                        ) : (
                            "배정인원 불일치 탐지"
                        )}
                    </h3>
                    <p className={`text-xs mt-0.5 ${subText}`}>
                        {drilldownSigun ? (
                            <>
                                {drilldownRows.length}개 기관 중{" "}
                                <span className={drilldownRows.filter(r => r.hasMismatch).length > 0 ? "text-red-500 font-semibold" : "text-green-600 font-semibold"}>
                                    {drilldownRows.filter(r => r.hasMismatch).length}개 불일치
                                </span>
                            </>
                        ) : (
                            <>
                                광역 배정값(mow) vs 수행기관 제출값 비교 — 제출 기관 {totalCount}개 중{" "}
                                <span className={mismatchCount > 0 ? "text-red-500 font-semibold" : "text-green-600 font-semibold"}>
                                    {mismatchCount}개 불일치
                                </span>
                            </>
                        )}
                    </p>
                </div>

                {/* 컨트롤 (요약 뷰에서만) */}
                {!drilldownSigun && (
                    <button
                        onClick={() => setMismatchOnly((v) => !v)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                            mismatchOnly
                                ? "bg-red-500 border-red-500 text-white"
                                : isDark
                                ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                        <Filter className="h-3 w-3" />
                        불일치만 보기
                    </button>
                )}
            </div>

            {/* ── 요약 뷰 (시군별 집계) ── */}
            {!drilldownSigun && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                        <thead>
                            <tr className={`text-xs ${headerBg}`}>
                                <th className="px-4 py-2 text-left font-medium">시군</th>
                                <th className="px-3 py-2 text-center font-medium">기관수</th>
                                <th className="px-3 py-2 text-center font-medium">불일치</th>
                                <th className="px-3 py-2 text-center font-medium">
                                    <div>전담SW</div>
                                    <span className={`text-[10px] font-normal ${subText}`}>절대차이합(순차이)</span>
                                </th>
                                <th className="px-3 py-2 text-center font-medium">
                                    <div>생활지원사</div>
                                    <span className={`text-[10px] font-normal ${subText}`}>절대차이합(순차이)</span>
                                </th>
                                <th className="px-3 py-2 text-center font-medium">
                                    <div>이용자</div>
                                    <span className={`text-[10px] font-normal ${subText}`}>절대차이합(순차이)</span>
                                </th>
                                <th className="px-3 py-2 text-center font-medium w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sigunSummaries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={`px-4 py-8 text-center text-sm ${subText}`}>
                                        {mismatchOnly ? "불일치 시군이 없습니다 ✅" : "데이터가 없습니다"}
                                    </td>
                                </tr>
                            ) : (
                                sigunSummaries.map((s) => (
                                    <tr
                                        key={s.sigun}
                                        onClick={() => handleSigunClick(s.sigun)}
                                        className={`border-t cursor-pointer transition-colors ${rowBg} ${s.mismatchOrgs > 0 ? mismatchRowBg : ""}`}
                                    >
                                        <td className="px-4 py-2.5 font-medium text-sm">{s.sigun}</td>
                                        <td className={`px-3 py-2.5 text-center text-sm ${subText}`}>
                                            {s.submittedOrgs}/{s.totalOrgs}
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            {s.mismatchOrgs > 0 ? (
                                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                                                    {s.mismatchOrgs}개
                                                </span>
                                            ) : (
                                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                            )}
                                        </td>
                                        <SumDiffCell diff={s.totalDiff_sw} total={Math.abs(s.totalDiff_sw)} />
                                        <SumDiffCell diff={s.totalDiff_cg} total={Math.abs(s.totalDiff_cg)} />
                                        <SumDiffCell diff={s.totalDiff_users} total={Math.abs(s.totalDiff_users)} />
                                        <td className={`px-3 py-2.5 text-center ${subText}`}>
                                            <ChevronRight className="h-4 w-4 mx-auto" />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── 드릴다운 뷰 (기관별 상세) ── */}
            {drilldownSigun && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[650px]">
                        <thead>
                            <tr className={`text-xs ${headerBg}`}>
                                <th className="px-3 py-2 text-left font-medium">기관명</th>
                                <th className="px-3 py-2 text-center font-medium">
                                    <div className="flex items-center gap-1 justify-center">전담SW <ArrowUpDown className="h-3 w-3" /></div>
                                    <span className={`text-[10px] font-normal ${subText}`}>광역/제출(차이)</span>
                                </th>
                                <th className="px-3 py-2 text-center font-medium">
                                    <div className="flex items-center gap-1 justify-center">생활지원사 <ArrowUpDown className="h-3 w-3" /></div>
                                    <span className={`text-[10px] font-normal ${subText}`}>광역/제출(차이)</span>
                                </th>
                                <th className="px-3 py-2 text-center font-medium">
                                    <div className="flex items-center gap-1 justify-center">이용자 <ArrowUpDown className="h-3 w-3" /></div>
                                    <span className={`text-[10px] font-normal ${subText}`}>광역/제출(차이)</span>
                                </th>
                                <th className="px-3 py-2 text-center font-medium">상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drilldownRows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className={`px-4 py-8 text-center text-sm ${subText}`}>
                                        데이터가 없습니다
                                    </td>
                                </tr>
                            ) : (
                                drilldownRows.map((row) => (
                                    <tr
                                        key={row.code}
                                        className={`border-t transition-colors ${rowBg} ${row.hasMismatch ? mismatchRowBg : ""}`}
                                    >
                                        <td className="px-3 py-2">
                                            <div className="font-medium text-xs leading-tight">{row.name}</div>
                                            <div className={`text-[10px] ${subText}`}>{row.code}</div>
                                        </td>
                                        <DiffCell diff={row.diff_sw} mow={row.mow_sw} sub={row.sub_sw} />
                                        <DiffCell diff={row.diff_cg} mow={row.mow_cg} sub={row.sub_cg} />
                                        <DiffCell diff={row.diff_users} mow={row.mow_users} sub={row.sub_users} />
                                        <td className="px-3 py-2 text-center">
                                            {!row.submitted ? (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 ${subText}`}>미제출</span>
                                            ) : row.hasMismatch ? (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">불일치</span>
                                            ) : (
                                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 푸터 */}
            {!drilldownSigun && sigunSummaries.length > 0 && (
                <div className={`px-4 py-2 text-xs ${subText} border-t border-inherit`}>
                    {sigunSummaries.length}개 시군 표시 · 시군 클릭 시 지도 하이라이트 + 기관 상세 확인
                </div>
            )}
            {drilldownSigun && drilldownRows.length > 0 && (
                <div className={`px-4 py-2 text-xs ${subText} border-t border-inherit`}>
                    {drilldownRows.length}개 기관
                </div>
            )}
        </div>
    );
}
