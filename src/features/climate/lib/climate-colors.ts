import type { ClimateMapMode } from "./climate-types";

// 한파 (청색 계열)
const COLD_SCALE = [
    { threshold: 0, color: "#f0f9ff", label: "0건" },
    { threshold: 1, color: "#bae6fd", label: "1~3건" },
    { threshold: 4, color: "#7dd3fc", label: "4~7건" },
    { threshold: 8, color: "#38bdf8", label: "8~12건" },
    { threshold: 13, color: "#0284c7", label: "13~20건" },
    { threshold: 21, color: "#075985", label: "21건 이상" },
];

// 폭염 (적색 계열)
const HEAT_SCALE = [
    { threshold: 0, color: "#fff7ed", label: "0건" },
    { threshold: 1, color: "#fed7aa", label: "1~3건" },
    { threshold: 4, color: "#fdba74", label: "4~7건" },
    { threshold: 8, color: "#fb923c", label: "8~12건" },
    { threshold: 13, color: "#ea580c", label: "13~20건" },
    { threshold: 21, color: "#9a3412", label: "21건 이상" },
];

// 전체 (보라 계열)
const TOTAL_SCALE = [
    { threshold: 0, color: "#faf5ff", label: "0건" },
    { threshold: 1, color: "#e9d5ff", label: "1~5건" },
    { threshold: 6, color: "#c084fc", label: "6~15건" },
    { threshold: 16, color: "#a855f7", label: "16~25건" },
    { threshold: 26, color: "#7e22ce", label: "26~40건" },
    { threshold: 41, color: "#581c87", label: "41건 이상" },
];

function getScaleForMode(mode: ClimateMapMode) {
    if (mode === "total") return TOTAL_SCALE;
    if (mode === "all_cold" || mode === "cold_advisory" || mode === "cold_warning") return COLD_SCALE;
    return HEAT_SCALE;
}

export function getClimateColorForCount(count: number, mode: ClimateMapMode): string {
    const scale = getScaleForMode(mode);
    for (let i = scale.length - 1; i >= 0; i--) {
        if (count >= scale[i].threshold) return scale[i].color;
    }
    return scale[0].color;
}

export function getClimateHoverColor(count: number, mode: ClimateMapMode): string {
    if (mode === "total") {
        if (count >= 41) return "#6b21a8";
        if (count >= 26) return "#7e22ce";
        if (count >= 16) return "#9333ea";
        if (count >= 6) return "#a855f7";
        if (count >= 1) return "#d8b4fe";
        return "#f3e8ff";
    }
    if (mode === "all_cold" || mode === "cold_advisory" || mode === "cold_warning") {
        if (count >= 21) return "#0c4a6e";
        if (count >= 13) return "#075985";
        if (count >= 8) return "#0284c7";
        if (count >= 4) return "#0ea5e9";
        if (count >= 1) return "#7dd3fc";
        return "#e0f2fe";
    }
    // heat
    if (count >= 21) return "#7c2d12";
    if (count >= 13) return "#9a3412";
    if (count >= 8) return "#c2410c";
    if (count >= 4) return "#ea580c";
    if (count >= 1) return "#fdba74";
    return "#ffedd5";
}

export function getClimateLegendItems(mode: ClimateMapMode) {
    return getScaleForMode(mode).map((item) => ({
        color: item.color,
        label: item.label,
    }));
}
