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
}

export default function GyeongnamMap({
  regionStatsMap,
  selectedRegion,
  onRegionClick,
  onRegionHover,
  onRegionHoverEnd,
  mapMode,
  mapTheme = "sky",
}: GyeongnamMapProps) {
  const getRate = useCallback(
    (regionName: string) => {
      const stats = regionStatsMap.get(regionName);
      if (!stats) return 0;

      switch (mapMode) {
        case "staff":
          const totalStaff = stats.sw_m + stats.sw_f + stats.cg_m + stats.cg_f;
          const assignedStaff = stats.assigned_sw + stats.assigned_cg;
          // 배정 인원이 있으면 충족률, 없으면 대략적인 최대치(500) 기준
          return assignedStaff > 0
            ? Math.min(100, (totalStaff / assignedStaff) * 100)
            : Math.min(100, (totalStaff / 500) * 100);
        case "user":
          const totalUsers = stats.gen_m_gen + stats.gen_f_gen + stats.gen_m_int + stats.gen_f_int + stats.special_m + stats.special_f;
          // 배정 인원 대비 충족률, 없으면 최대치(2000) 기준
          return stats.assigned_users > 0
            ? Math.min(100, (totalUsers / stats.assigned_users) * 100)
            : Math.min(100, (totalUsers / 2000) * 100);
        case "new_term":
          const totalNew = stats.new_m + stats.new_f + stats.short_new_m + stats.short_new_f;
          // 신규 대상자는 상대적 분포 확인을 위해 최대치(50) 기준
          return Math.min(100, (totalNew / 50) * 100);
        case "balance":
          const st = stats.sw_m + stats.sw_f + stats.cg_m + stats.cg_f;
          const as = stats.assigned_sw + stats.assigned_cg;
          const us = stats.gen_m_gen + stats.gen_f_gen + stats.gen_m_int + stats.gen_f_int + stats.special_m + stats.special_f;
          const au = stats.assigned_users;

          const sRate = as > 0 ? (st / as) * 100 : 0;
          const uRate = au > 0 ? (us / au) * 100 : 0;
          // 종사자가 부족하면 마이너스, 이용자가 부족하면 플러스
          return sRate - uRate;
        case "special":
          const totalSpecial = stats.special_m + stats.special_f;
          // 특화서비스는 분포 확인을 위해 최대치(50명) 기준 정규화
          return Math.min(100, (totalSpecial / 50) * 100);
        case "short_term":
          const totalShort = stats.short_m + stats.short_f;
          // 단기집중은 분포 확인을 위해 최대치(30명) 기준 정규화
          return Math.min(100, (totalShort / 30) * 100);
        case "termination":
          const totalTermGen = stats.term_m_death + stats.term_m_refuse + stats.term_m_etc + stats.term_f_death + stats.term_f_refuse + stats.term_f_etc;
          // 종결자는 분포 확인을 위해 최대치(40명) 기준 정규화
          return Math.min(100, (totalTermGen / 40) * 100);
        case "submission":
        default:
          return stats.submissionRate ?? 0;
      }
    },
    [regionStatsMap, mapMode]
  );

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
          경상남도 시군별 현황
        </text>

        {/* 18개 시군 렌더링 */}
        {regionPaths.map((region) => {
          const rate = getRate(region.name);
          const stats = regionStatsMap.get(region.name);
          return (
            <MapRegion
              key={region.id}
              region={region}
              stats={stats}
              mapMode={mapMode}
              fillColor={getColorForRate(rate, mapTheme, mapMode)}
              hoverColor={getHoverColor(rate, mapTheme, mapMode)}
              isSelected={selectedRegion === region.name}
              onClick={onRegionClick}
              onHover={onRegionHover}
              onHoverEnd={onRegionHoverEnd}
            />
          );
        })}
      </svg>
    </div>
  );
}
