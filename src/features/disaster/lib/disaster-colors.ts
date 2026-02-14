import type { DisasterMapMode } from "./disaster-types";

// 전체 (적색 계열 - 자연재난 위험/경고)
const TOTAL_SCALE = [
    { threshold: 0, color: "#fef2f2", label: "0건" },
    { threshold: 1, color: "#fecaca", label: "1~3건" },
    { threshold: 4, color: "#f87171", label: "4~8건" },
    { threshold: 9, color: "#ef4444", label: "9~15건" },
    { threshold: 16, color: "#dc2626", label: "16~25건" },
    { threshold: 26, color: "#991b1b", label: "26건 이상" },
];

// 태풍 (남색/인디고 계열)
const TYPHOON_SCALE = [
    { threshold: 0, color: "#eef2ff", label: "0건" },
    { threshold: 1, color: "#c7d2fe", label: "1~2건" },
    { threshold: 3, color: "#818cf8", label: "3~5건" },
    { threshold: 6, color: "#6366f1", label: "6~8건" },
    { threshold: 9, color: "#4338ca", label: "9~12건" },
    { threshold: 13, color: "#312e81", label: "13건 이상" },
];

// 홍수 (청색 계열)
const FLOOD_SCALE = [
    { threshold: 0, color: "#f0f9ff", label: "0건" },
    { threshold: 1, color: "#bae6fd", label: "1~3건" },
    { threshold: 4, color: "#7dd3fc", label: "4~7건" },
    { threshold: 8, color: "#38bdf8", label: "8~12건" },
    { threshold: 13, color: "#0284c7", label: "13~20건" },
    { threshold: 21, color: "#075985", label: "21건 이상" },
];

// 지진 (갈색/주황 계열)
const EARTHQUAKE_SCALE = [
    { threshold: 0, color: "#fffbeb", label: "0건" },
    { threshold: 1, color: "#fde68a", label: "1~2건" },
    { threshold: 3, color: "#fbbf24", label: "3~4건" },
    { threshold: 5, color: "#f59e0b", label: "5~7건" },
    { threshold: 8, color: "#d97706", label: "8~10건" },
    { threshold: 11, color: "#92400e", label: "11건 이상" },
];

// 산사태 위험 (녹갈색 계열)
const LANDSLIDE_SCALE = [
    { threshold: 0, color: "#f0fdf4", label: "0건" },
    { threshold: 1, color: "#bbf7d0", label: "1~2건" },
    { threshold: 3, color: "#86efac", label: "3~5건" },
    { threshold: 6, color: "#4ade80", label: "6~8건" },
    { threshold: 9, color: "#16a34a", label: "9~12건" },
    { threshold: 13, color: "#14532d", label: "13건 이상" },
];

function getScaleForMode(mode: DisasterMapMode) {
    switch (mode) {
        case "total": return TOTAL_SCALE;
        case "typhoon": return TYPHOON_SCALE;
        case "flood": return FLOOD_SCALE;
        case "earthquake": return EARTHQUAKE_SCALE;
        case "landslide_risk": return LANDSLIDE_SCALE;
    }
}

export function getDisasterColorForCount(count: number, mode: DisasterMapMode): string {
    const scale = getScaleForMode(mode);
    for (let i = scale.length - 1; i >= 0; i--) {
        if (count >= scale[i].threshold) return scale[i].color;
    }
    return scale[0].color;
}

export function getDisasterHoverColor(count: number, mode: DisasterMapMode): string {
    switch (mode) {
        case "total":
            if (count >= 26) return "#7f1d1d";
            if (count >= 16) return "#991b1b";
            if (count >= 9) return "#b91c1c";
            if (count >= 4) return "#dc2626";
            if (count >= 1) return "#fca5a5";
            return "#fee2e2";
        case "typhoon":
            if (count >= 13) return "#1e1b4b";
            if (count >= 9) return "#312e81";
            if (count >= 6) return "#4338ca";
            if (count >= 3) return "#4f46e5";
            if (count >= 1) return "#a5b4fc";
            return "#e0e7ff";
        case "flood":
            if (count >= 21) return "#0c4a6e";
            if (count >= 13) return "#075985";
            if (count >= 8) return "#0284c7";
            if (count >= 4) return "#0ea5e9";
            if (count >= 1) return "#7dd3fc";
            return "#e0f2fe";
        case "earthquake":
            if (count >= 11) return "#78350f";
            if (count >= 8) return "#92400e";
            if (count >= 5) return "#b45309";
            if (count >= 3) return "#d97706";
            if (count >= 1) return "#fcd34d";
            return "#fef3c7";
        case "landslide_risk":
            if (count >= 13) return "#052e16";
            if (count >= 9) return "#14532d";
            if (count >= 6) return "#166534";
            if (count >= 3) return "#22c55e";
            if (count >= 1) return "#86efac";
            return "#dcfce7";
    }
}

export function getDisasterLegendItems(mode: DisasterMapMode) {
    return getScaleForMode(mode).map((item) => ({
        color: item.color,
        label: item.label,
    }));
}
