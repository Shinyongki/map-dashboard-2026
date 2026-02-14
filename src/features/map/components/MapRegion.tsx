import { useState, useCallback } from "react";
import type { RegionPath, RegionStats, MapMode } from "../lib/map-types";

interface MapRegionProps {
  region: RegionPath;
  stats?: RegionStats;
  mapMode: MapMode;
  fillColor: string;
  hoverColor: string;
  isSelected: boolean;
  onClick: (regionName: string) => void;
  onHover: (regionName: string, x: number, y: number) => void;
  onHoverEnd: () => void;
  customLabel?: string;
}

export default function MapRegion({
  region,
  stats,
  mapMode,
  fillColor,
  hoverColor,
  isSelected,
  onClick,
  onHover,
  onHoverEnd,
  customLabel,
}: MapRegionProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      setIsHovered(true);
      onHover(region.name, e.clientX, e.clientY);
    },
    [region.name, onHover]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      onHover(region.name, e.clientX, e.clientY);
    },
    [region.name, onHover]
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHoverEnd();
  }, [onHoverEnd]);

  const handleClick = useCallback(() => {
    onClick(region.name);
  }, [region.name, onClick]);

  return (
    <g className="cursor-pointer">
      <path
        d={region.path}
        fill={isHovered ? hoverColor : fillColor}
        stroke={isSelected ? "#1e40af" : "#fff"}
        strokeWidth={isSelected ? 2.5 : 1.2}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transition: "fill 0.2s ease, stroke-width 0.2s ease",
          filter: isSelected ? "drop-shadow(0 0 4px rgba(30,64,175,0.4))" : undefined,
        }}
      />
      {mapMode === "short_term" && stats?.baseInstitutionName && (
        <text
          x={region.labelX}
          y={region.labelY - 18}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="9"
          fontWeight="700"
          fill="#4f46e5"
          pointerEvents="none"
          style={{ userSelect: "none" }}
        >
          {stats.baseInstitutionName}
        </text>
      )}
      <text
        x={region.labelX}
        y={region.labelY - 5}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12"
        fontWeight="800"
        fill="#0f172a"
        pointerEvents="none"
        style={{ userSelect: "none" }}
      >
        {region.name}
      </text>

      {/* 데이터 라벨 */}
      {(stats || customLabel) && (
        <g pointerEvents="none" style={{ userSelect: "none" }}>
          <rect
            x={region.labelX - 25}
            y={region.labelY + 6}
            width="50"
            height="14"
            rx="4"
            fill="white"
            fillOpacity="0.7"
          />
          <text
            x={region.labelX}
            y={region.labelY + 13}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="10"
            fontWeight="bold"
            fill="#334155"
          >
            {customLabel ? customLabel : (
              <>
                {mapMode === "submission" && stats && `${stats.submissions}/${stats.totalOrganizations}`}
                {mapMode === "staff" && stats && `종 ${stats.sw_m + stats.sw_f + stats.cg_m + stats.cg_f}`}
                {mapMode === "user" && stats && `이 ${stats.gen_m_gen + stats.gen_f_gen + stats.gen_m_int + stats.gen_f_int + stats.special_m + stats.special_f}`}
                {mapMode === "new_term" && stats && `+${stats.new_m + stats.new_f}/-${stats.term_m_death + stats.term_f_death}`}
                {mapMode === "balance" && stats && (
                  (() => {
                    const as = stats.assigned_sw + stats.assigned_cg;
                    const st = stats.sw_m + stats.sw_f + stats.cg_m + stats.cg_f;
                    const us = stats.gen_m_gen + stats.gen_f_gen + stats.gen_m_int + stats.gen_f_int + stats.special_m + stats.special_f;
                    const au = stats.assigned_users;
                    const sR = as > 0 ? (st / as) * 100 : 0;
                    const uR = au > 0 ? (us / au) * 100 : 0;
                    const diff = Math.round(sR - uR);
                    return `${diff > 0 ? "+" : ""}${diff}p`;
                  })()
                )}
                {mapMode === "special" && stats && `특 ${stats.special_m + stats.special_f}`}
                {mapMode === "short_term" && stats && `단 ${stats.short_m + stats.short_f}`}
                {mapMode === "termination" && stats && `종 ${stats.term_m_death + stats.term_m_refuse + stats.term_m_etc + stats.term_f_death + stats.term_f_refuse + stats.term_f_etc}`}
              </>
            )}
          </text>
        </g>
      )}
    </g>
  );
}
