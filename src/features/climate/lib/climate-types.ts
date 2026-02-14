export type AlertType = "cold_advisory" | "cold_warning" | "heat_advisory" | "heat_warning";

export type ClimateMapMode = "total" | "all_cold" | "all_heat" | AlertType;

export const CLIMATE_MAP_MODES: { mode: ClimateMapMode; label: string; description: string }[] = [
    { mode: "total", label: "전체특보", description: "모든 특보 합산 빈도" },
    { mode: "all_cold", label: "한파(전체)", description: "한파주의보+경보 합산" },
    { mode: "all_heat", label: "폭염(전체)", description: "폭염주의보+경보 합산" },
    { mode: "cold_advisory", label: "한파주의보", description: "한파주의보만" },
    { mode: "cold_warning", label: "한파경보", description: "한파경보만" },
    { mode: "heat_advisory", label: "폭염주의보", description: "폭염주의보만" },
    { mode: "heat_warning", label: "폭염경보", description: "폭염경보만" },
];

export interface WeatherAlert {
    regionName: string;
    alertType: AlertType;
    startDate: string;
    endDate: string;
    year: number;
    month: number;
}

export interface YearlyBreakdown {
    year: number;
    coldAdvisoryCount: number;
    coldWarningCount: number;
    heatAdvisoryCount: number;
    heatWarningCount: number;
    totalCount: number;
}

export interface MonthlyBreakdown {
    month: number;
    coldAdvisoryCount: number;
    coldWarningCount: number;
    heatAdvisoryCount: number;
    heatWarningCount: number;
    totalCount: number;
}

export interface ClimateRegionStats {
    region: string;
    coldAdvisoryCount: number;
    coldWarningCount: number;
    heatAdvisoryCount: number;
    heatWarningCount: number;
    totalAlertCount: number;
    yearlyBreakdown: YearlyBreakdown[];
    monthlyBreakdown: MonthlyBreakdown[];
    recentAlerts: WeatherAlert[];
}
