import { useRef, useLayoutEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import type { TooltipData } from "../lib/map-types";

interface MapTooltipProps {
  data: TooltipData | null;
}

export default function MapTooltip({ data }: MapTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0, opacity: 0 });

  useLayoutEffect(() => {
    if (!data || !tooltipRef.current) return;

    const width = tooltipRef.current.offsetWidth;
    const height = tooltipRef.current.offsetHeight;
    const margin = 20;

    let left = data.x + margin;
    let top = data.y - 10; // 기존 top: data.y - 40보다 조금 더 아래로 시작

    // 우측 경계 체크
    if (left + width > window.innerWidth) {
      left = data.x - width - margin;
    }

    // 하단 경계 체크 (가장 중요)
    if (top + height > window.innerHeight) {
      // 아래로 공간이 없으면 위로 올림
      top = data.y - height - margin;
    }

    // 화면 상단으로 나가는 경우 방지
    if (top < margin) {
      top = margin;
    }

    setPos({ left, top, opacity: 1 });
  }, [data]);

  if (!data) return null;

  const { stats, mode } = data;
  const totalStaff = stats.sw_m + stats.sw_f + stats.cg_m + stats.cg_f;
  const totalUsers = stats.gen_m_gen + stats.gen_f_gen + stats.gen_m_int + stats.gen_f_int + stats.special_m + stats.special_f;
  const totalNew = stats.new_m + stats.new_f + stats.short_new_m + stats.short_new_f;
  const totalTerm = stats.term_m_death + stats.term_m_refuse + stats.term_m_etc + stats.term_f_death + stats.term_f_refuse + stats.term_f_etc;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 pointer-events-none bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-2xl p-4 w-72 transition-all duration-100 animate-in fade-in zoom-in-95"
      style={{
        left: pos.left,
        top: pos.top,
        opacity: pos.opacity,
      }}
    >
      <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
        <div className="text-lg font-black text-gray-900">{data.region}</div>
        <div className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${data.theme === "forest"
          ? "bg-emerald-50 text-emerald-600"
          : "bg-blue-50 text-blue-600"
          }`}>
          {mode === "submission" ? "제출현황" : mode === "staff" ? "종사자" : mode === "user" ? "이용자" : "신규/종결"}
        </div>
      </div>

      <div className="space-y-4">
        {/* 제출률 섹션 */}
        <div>
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-xs font-bold text-gray-500">제출률 ({stats.submissions}/{stats.totalOrganizations})</span>
            <span className="text-sm font-black text-blue-600">{stats.submissionRate}%</span>
          </div>
          <Progress value={stats.submissionRate} className="h-2 bg-gray-100" />
        </div>

        {/* 그리드 정보 섹션 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-2 rounded-lg">
            <div className="text-[10px] font-bold text-gray-400 mb-0.5">종사자 수</div>
            <div className="text-sm font-black text-gray-700">{totalStaff}명</div>
            <div className="text-[9px] text-gray-400">사회 {stats.sw_m + stats.sw_f} / 지원 {stats.cg_m + stats.cg_f}</div>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg">
            <div className="text-[10px] font-bold text-gray-400 mb-0.5">이용자 수</div>
            <div className="text-sm font-black text-gray-700">{totalUsers}명</div>
            <div className="text-[9px] text-gray-400">중점 {stats.gen_m_int + stats.gen_f_int} / 일반 {stats.gen_m_gen + stats.gen_f_gen}</div>
          </div>
        </div>

        {/* 하단 상세 (모드별 강조) */}
        <div className="pt-2 border-t border-gray-100">
          {mode === "new_term" ? (
            <div className="flex justify-between text-xs">
              <span className="text-emerald-600 font-bold">신규 +{totalNew}</span>
              <span className="text-rose-500 font-bold">종결 -{totalTerm}</span>
            </div>
          ) : mode === "balance" ? (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-gray-500">종사자 채용률</span>
                <span className="text-gray-900">{stats.assigned_sw + stats.assigned_cg > 0
                  ? Math.round(((stats.sw_m + stats.sw_f + stats.cg_m + stats.cg_f) / (stats.assigned_sw + stats.assigned_cg)) * 100)
                  : 0}%</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-gray-500">이용자 매칭률</span>
                <span className="text-gray-900">{stats.assigned_users > 0
                  ? Math.round((totalUsers / stats.assigned_users) * 100)
                  : 0}%</span>
              </div>
              <div className="pt-1 border-t border-dashed border-gray-100 flex justify-between text-[11px] font-black">
                <span className="text-gray-500">수급 격차</span>
                <span className={((stats.sw_m + stats.sw_f + stats.cg_m + stats.cg_f) / (stats.assigned_sw + stats.assigned_cg || 1) * 100) - (totalUsers / (stats.assigned_users || 1) * 100) >= 0
                  ? "text-emerald-600" : "text-rose-600"}>
                  {Math.round(((stats.sw_m + stats.sw_f + stats.cg_m + stats.cg_f) / (stats.assigned_sw + stats.assigned_cg || 1) * 100) - (totalUsers / (stats.assigned_users || 1) * 100))}%p
                </span>
              </div>
            </div>
          ) : mode === "special" ? (
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-bold text-gray-400 mb-1 border-b border-gray-50 pb-0.5">특화지원 이용자 성별</div>
              <StatRow label="남성" value={`${stats.special_m}명`} />
              <StatRow label="여성" value={`${stats.special_f}명`} />
            </div>
          ) : mode === "short_term" ? (
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-bold text-gray-400 mb-1 border-b border-gray-50 pb-0.5">단기집중 상세</div>
              <StatRow label="남성" value={`${stats.short_m}명`} />
              <StatRow label="여성" value={`${stats.short_f}명`} />
              <div className="flex gap-2 mt-1 text-[9px] text-gray-400 bg-gray-50 p-1 rounded">
                <span>1개월: {stats.short_1month}</span>
                <span>2개월: {stats.short_2month}</span>
                <span>기타: {stats.short_etc}</span>
              </div>
            </div>
          ) : mode === "termination" ? (
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-bold text-gray-400 mb-1 border-b border-gray-50 pb-0.5">종결 사유 (일반/중점)</div>
              <StatRow label="사망" value={`${stats.term_m_death + stats.term_f_death}명`} red />
              <StatRow label="서비스거부" value={`${stats.term_m_refuse + stats.term_f_refuse}명`} />
              <StatRow label="기타사유" value={`${stats.term_m_etc + stats.term_f_etc}명`} />
            </div>
          ) : (
            <div className="flex justify-between items-center text-[10px] text-gray-400 italic">
              <span>클릭하여 상세보기 →</span>
              <span className="font-medium">기관별 정보 포함</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className={`font-bold ${red ? "text-rose-600" : "text-gray-700"}`}>{value}</span>
    </div>
  );
}
