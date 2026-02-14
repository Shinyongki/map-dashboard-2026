import { useCallback } from "react";
import { regionPaths, VIEWBOX } from "../lib/gyeongnam-paths";
import { getColorForRate, getHoverColor } from "../lib/map-colors";
import type { RegionStats, MapMode, MapTheme } from "../lib/map-types";
import MapRegion from "./MapRegion";

interface GyeongnamMapProps {
  regionStatsMap: Map<string, RegionStats>;
  selectedRegion: string | null;
  onRegionClick: (regionName: string) => void;
  onRegionHover: (regionName: string, x: number, y: number) => void;
  onRegionHoverEnd: () => void;
  mapMode: MapMode;
  mapTheme: MapTheme;
  // 외부에서 주입 가능한 커스텀 함수 (기후대응 등에서 사용)
  getRateForRegion?: (name: string) => number;
  getColorForRateFn?: (rate: number) => string;
  getHoverColorForRateFn?: (rate: number) => string;
  getLabelText?: (name: string) => string;
  mapTitle?: string;
}

export default function GyeongnamMap({
  regionStatsMap,
  selectedRegion,
  onRegionClick,
  onRegionHover,
  onRegionHoverEnd,
  mapMode,
  mapTheme = "sky",
  getRateForRegion,
  getColorForRateFn,
  getHoverColorForRateFn,
  getLabelText,
  mapTitle,
}: GyeongnamMapProps) {
  const getDefaultRate = useCallback(
    (regionName: string) => {
      const stats = regionStatsMap.get(regionName);
      if (!stats) return 0;

      switch (mapMode) {
        case "staff":
          const totalStaff = stats.sw_m + stats.sw_f + stats.cg_m + stats.cg_f;
          const assignedStaff = stats.assigned_sw + stats.assigned_cg;
          return assignedStaff > 0
            ? Math.min(100, (totalStaff / assignedStaff) * 100)
            : Math.min(100, (totalStaff / 500) * 100);
        case "user":
          const totalUsers = stats.gen_m_gen + stats.gen_f_gen + stats.gen_m_int + stats.gen_f_int + stats.special_m + stats.special_f;
          return stats.assigned_users > 0
            ? Math.min(100, (totalUsers / stats.assigned_users) * 100)
            : Math.min(100, (totalUsers / 2000) * 100);
        case "new_term":
          const totalNew = stats.new_m + stats.new_f + stats.short_new_m + stats.short_new_f;
          return Math.min(100, (totalNew / 50) * 100);
        case "balance":
          const st = stats.sw_m + stats.sw_f + stats.cg_m + stats.cg_f;
          const as = stats.assigned_sw + stats.assigned_cg;
          const us = stats.gen_m_gen + stats.gen_f_gen + stats.gen_m_int + stats.gen_f_int + stats.special_m + stats.special_f;
          const au = stats.assigned_users;
          const sRate = as > 0 ? (st / as) * 100 : 0;
          const uRate = au > 0 ? (us / au) * 100 : 0;
          return sRate - uRate;
        case "special":
          const totalSpecial = stats.special_m + stats.special_f;
          return Math.min(100, (totalSpecial / 50) * 100);
        case "short_term":
          const totalShort = stats.short_m + stats.short_f;
          return Math.min(100, (totalShort / 30) * 100);
        case "termination":
          const totalTermGen = stats.term_m_death + stats.term_m_refuse + stats.term_m_etc + stats.term_f_death + stats.term_f_refuse + stats.term_f_etc;
          return Math.min(100, (totalTermGen / 40) * 100);
        case "submission":
        default:
          return stats.submissionRate ?? 0;
      }
    },
    [regionStatsMap, mapMode]
  );

  const getRate = getRateForRegion ?? getDefaultRate;

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <svg
        viewBox={VIEWBOX}
        className="w-full h-full max-h-[calc(100vh-200px)]"
        style={{ maxWidth: "100%" }}
      >
        {/* 배경 */}
        <rect width="820" height="680" fill="#f8fafc" rx="8" />

        {/* 제목 */}
        <text
          x="410"
          y="665"
          textAnchor="middle"
          fontSize="11"
          fill="#94a3b8"
        >
          {mapTitle ?? "경상남도 시군별 현황"}
        </text>

        {/* 18개 시군 렌더링 */}
        {regionPaths.map((region) => {
          const rate = getRate(region.name);
          const stats = regionStatsMap.get(region.name);
          const fillColor = getColorForRateFn
            ? getColorForRateFn(rate)
            : getColorForRate(rate, mapTheme, mapMode);
          const hoverFillColor = getHoverColorForRateFn
            ? getHoverColorForRateFn(rate)
            : getHoverColor(rate, mapTheme, mapMode);
          return (
            <MapRegion
              key={region.id}
              region={region}
              stats={stats}
              mapMode={mapMode}
              fillColor={fillColor}
              hoverColor={hoverFillColor}
              isSelected={selectedRegion === region.name}
              onClick={onRegionClick}
              onHover={onRegionHover}
              onHoverEnd={onRegionHoverEnd}
              customLabel={getLabelText ? getLabelText(region.name) : undefined}
            />
          );
        })}
      </svg>
    </div>
  );
}
