import { MapTheme } from "./map-types";

// 수급 균형용 발산형 색상 스케일 (Diverging Scale)
// - 빨간색 계열: 종사자 부족 (이용자 대비)
// - 회색/흰색: 균형
// - 초록색 계열: 이용자 부족 (종사자 대비)
const BALANCE_SCALE = [
  { threshold: -15, color: "#e11d48", label: "종사자 부족(심각)" }, // rose-600
  { threshold: -5, color: "#fda4af", label: "종사자 부족" },      // rose-300
  { threshold: 5, color: "#f8fafc", label: "균형" },             // slate-50
  { threshold: 15, color: "#6ee7b7", label: "이용자 발굴 필요" },   // emerald-300
  { threshold: 100, color: "#059669", label: "이력 여유" },       // emerald-600
];

// 테마별 색상 설정
const THEMES: Record<MapTheme, any> = {
  sky: [
    { threshold: 0, color: "#f8fafc", label: "데이터 없음" },
    { threshold: 1, color: "#e0f2fe", label: "~25%" },
    { threshold: 25, color: "#bae6fd", label: "25~50%" },
    { threshold: 50, color: "#7dd3fc", label: "50~75%" },
    { threshold: 75, color: "#38bdf8", label: "75~99%" },
    { threshold: 100, color: "#0ea5e9", label: "100%" },
  ],
  forest: [
    { threshold: 0, color: "#f1f5f9", label: "데이터 없음" },
    { threshold: 1, color: "#ecfdf5", label: "~25%" },
    { threshold: 25, color: "#a7f3d0", label: "25~50%" },
    { threshold: 50, color: "#34d399", label: "50~75%" },
    { threshold: 75, color: "#10b981", label: "75~99%" },
    { threshold: 100, color: "#059669", label: "100%" },
  ],
  infographic: [
    { threshold: 0, color: "#1a1b3a", label: "데이터 없음" },
    { threshold: 1, color: "#004e92", label: "~25%" },
    { threshold: 25, color: "#0064c0", label: "25~50%" },
    { threshold: 50, color: "#0081d5", label: "50~75%" },
    { threshold: 75, color: "#00a6ed", label: "75~99%" },
    { threshold: 100, color: "#00f2fe", label: "100%" },
  ]
};

export const getColorForRate = (rate: number, theme: MapTheme = "sky", mode: string = ""): string => {
  if (mode === "balance") {
    if (rate <= -15) return BALANCE_SCALE[0].color;
    if (rate <= -5) return BALANCE_SCALE[1].color;
    if (rate < 5) return BALANCE_SCALE[2].color;
    if (rate < 15) return BALANCE_SCALE[3].color;
    return BALANCE_SCALE[4].color;
  }

  const scale = THEMES[theme];
  if (rate >= 100) return scale[5].color;
  if (rate >= 75) return scale[4].color;
  if (rate >= 50) return scale[3].color;
  if (rate >= 25) return scale[2].color;
  if (rate > 0) return scale[1].color;
  return scale[0].color;
};

export const getHoverColor = (rate: number, theme: MapTheme = "sky", mode: string = ""): string => {
  if (mode === "balance") {
    if (rate <= -15) return "#be123c"; // rose-700
    if (rate <= -5) return "#fb7185";  // rose-400
    if (rate < 5) return "#e2e8f0";    // slate-200
    if (rate < 15) return "#34d399";   // emerald-400
    return "#047857";                  // emerald-700
  }

  if (theme === "forest") {
    if (rate >= 100) return "#065f46"; // emerald-800
    if (rate >= 75) return "#059669";  // emerald-600
    if (rate >= 50) return "#10b981";  // emerald-500
    if (rate >= 25) return "#34d399";  // emerald-400
    if (rate > 0) return "#a7f3d0";     // emerald-200
    return "#cbd5e1";
  }
  // Sky Theme
  if (rate >= 100) return "#0369a1"; // sky-700
  if (rate >= 75) return "#0ea5e9";  // sky-500
  if (rate >= 50) return "#38bdf8";  // sky-400
  if (rate >= 25) return "#7dd3fc";  // sky-300
  if (rate > 0) return "#bae6fd";     // sky-200
  return "#f1f5f9";                   // slate-100
};

export const getLegendItems = (theme: MapTheme = "sky", mode: string = "") => {
  if (mode === "balance") {
    return [
      { color: BALANCE_SCALE[0].color, label: "종사자 부족" },
      { color: BALANCE_SCALE[2].color, label: "균형" },
      { color: BALANCE_SCALE[4].color, label: "매칭 여유" },
    ];
  }
  return THEMES[theme].map((item: any) => ({
    color: item.color,
    label: item.label,
  }));
};
