import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle, Filter, ArrowUpDown } from "lucide-react";
import type { InstitutionProfile } from "../lib/map-types";
import type { SurveyData } from "@/lib/validation";

interface AllocationMismatchPanelProps {
    surveys: SurveyData[] | undefined;
    institutionProfiles: InstitutionProfile[] | undefined;
    isDark?: boolean;
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

type SortKey = "default" | "diff_sw" | "diff_cg" | "diff_users" | "totalAbsDiff";

export default function AllocationMismatchPanel({
    surveys,
    institutionProfiles,
    isDark = false,
}: AllocationMismatchPanelProps) {
    const [mismatchOnly, setMismatchOnly] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>("totalAbsDiff");
    const [selectedSigun, setSelectedSigun] = useState<string>("전체");

    const rows = useMemo<MismatchRow[]>(() => {
        if (!institutionProfiles) return [];

        // survey를 기관코드로 맵핑 (selectedMonth 기준 이미 필터링된 데이터)
        const surveyMap = new Map<string, SurveyData>();
        if (surveys) {
            for (const s of surveys) {
                surveyMap.set(s.기관코드, s);
            }
        }

        return institutionProfiles
            .filter((p) => p.region !== "*광역지원기관") // 광역 자체는 제외
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
                const hasMismatch = totalAbsDiff > 0 && !!survey;

                return {
                    code: p.code,
                    name: p.name,
                    sigun: p.region,
                    mow_sw,
                    sub_sw,
                    diff_sw,
                    mow_cg,
                    sub_cg,
                    diff_cg,
                    mow_users,
                    sub_users,
                    diff_users,
                    hasMismatch,
                    totalAbsDiff,
                    submitted: !!survey,
                };
            });
    }, [surveys, institutionProfiles]);

    const sigunList = useMemo(() => {
        const set = new Set(rows.map((r) => r.sigun));
        return ["전체", ...Array.from(set).sort()];
    }, [rows]);

    const filtered = useMemo(() => {
        let result = rows;
        if (selectedSigun !== "전체") result = result.filter((r) => r.sigun === selectedSigun);
        if (mismatchOnly) result = result.filter((r) => r.hasMismatch);

        result = [...result].sort((a, b) => {
            if (sortKey === "diff_sw") return Math.abs(b.diff_sw) - Math.abs(a.diff_sw);
            if (sortKey === "diff_cg") return Math.abs(b.diff_cg) - Math.abs(a.diff_cg);
            if (sortKey === "diff_users") return Math.abs(b.diff_users) - Math.abs(a.diff_users);
            // totalAbsDiff 또는 default: 차이 큰 순
            return b.totalAbsDiff - a.totalAbsDiff;
        });

        return result;
    }, [rows, mismatchOnly, selectedSigun, sortKey]);

    const mismatchCount = rows.filter((r) => r.hasMismatch).length;
    const totalCount = rows.filter((r) => r.submitted).length;

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

    return (
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${bg}`}>
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-inherit flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                    <h3 className="font-bold text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        배정인원 불일치 탐지
                    </h3>
                    <p className={`text-xs mt-0.5 ${subText}`}>
                        광역 배정값(mow) vs 수행기관 제출값 비교 — 제출 기관 {totalCount}개 중{" "}
                        <span className={mismatchCount > 0 ? "text-red-500 font-semibold" : "text-green-600 font-semibold"}>
                            {mismatchCount}개 불일치
                        </span>
                    </p>
                </div>

                {/* 컨트롤 */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* 시군 필터 */}
                    <select
                        value={selectedSigun}
                        onChange={(e) => setSelectedSigun(e.target.value)}
                        className={`text-xs px-2 py-1.5 rounded-lg border ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-200 text-gray-700"}`}
                    >
                        {sigunList.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    {/* 정렬 */}
                    <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as SortKey)}
                        className={`text-xs px-2 py-1.5 rounded-lg border ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-200 text-gray-700"}`}
                    >
                        <option value="totalAbsDiff">차이 큰 순</option>
                        <option value="diff_sw">SW 차이 순</option>
                        <option value="diff_cg">생활지원사 차이 순</option>
                        <option value="diff_users">이용자 차이 순</option>
                    </select>

                    {/* 불일치만 보기 토글 */}
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
                </div>
            </div>

            {/* 테이블 */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                    <thead>
                        <tr className={`text-xs ${headerBg}`}>
                            <th className="px-3 py-2 text-left font-medium">기관명</th>
                            <th className="px-3 py-2 text-left font-medium">시군</th>
                            <th className="px-3 py-2 text-center font-medium">
                                <button
                                    onClick={() => setSortKey("diff_sw")}
                                    className="flex items-center gap-1 mx-auto hover:opacity-70"
                                >
                                    전담SW <ArrowUpDown className="h-3 w-3" />
                                </button>
                                <span className={`text-[10px] font-normal ${subText}`}>광역/제출(차이)</span>
                            </th>
                            <th className="px-3 py-2 text-center font-medium">
                                <button
                                    onClick={() => setSortKey("diff_cg")}
                                    className="flex items-center gap-1 mx-auto hover:opacity-70"
                                >
                                    생활지원사 <ArrowUpDown className="h-3 w-3" />
                                </button>
                                <span className={`text-[10px] font-normal ${subText}`}>광역/제출(차이)</span>
                            </th>
                            <th className="px-3 py-2 text-center font-medium">
                                <button
                                    onClick={() => setSortKey("diff_users")}
                                    className="flex items-center gap-1 mx-auto hover:opacity-70"
                                >
                                    이용자 <ArrowUpDown className="h-3 w-3" />
                                </button>
                                <span className={`text-[10px] font-normal ${subText}`}>광역/제출(차이)</span>
                            </th>
                            <th className="px-3 py-2 text-center font-medium">상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className={`px-4 py-8 text-center text-sm ${subText}`}>
                                    {mismatchOnly ? "불일치 기관이 없습니다 ✅" : "데이터가 없습니다"}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((row) => (
                                <tr
                                    key={row.code}
                                    className={`border-t transition-colors ${rowBg} ${row.hasMismatch ? mismatchRowBg : ""}`}
                                >
                                    <td className="px-3 py-2">
                                        <div className="font-medium text-xs leading-tight">{row.name}</div>
                                        <div className={`text-[10px] ${subText}`}>{row.code}</div>
                                    </td>
                                    <td className={`px-3 py-2 text-xs ${subText}`}>{row.sigun}</td>
                                    <DiffCell diff={row.diff_sw} mow={row.mow_sw} sub={row.sub_sw} />
                                    <DiffCell diff={row.diff_cg} mow={row.mow_cg} sub={row.sub_cg} />
                                    <DiffCell diff={row.diff_users} mow={row.mow_users} sub={row.sub_users} />
                                    <td className="px-3 py-2 text-center">
                                        {!row.submitted ? (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 ${subText}`}>미제출</span>
                                        ) : row.hasMismatch ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                                                불일치
                                            </span>
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

            {filtered.length > 0 && (
                <div className={`px-4 py-2 text-xs ${subText} border-t border-inherit`}>
                    {filtered.length}개 기관 표시
                    {mismatchOnly && ` (불일치 ${mismatchCount}개)`}
                </div>
            )}
        </div>
    );
}
