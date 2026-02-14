export type DisasterType = "typhoon" | "flood" | "earthquake" | "landslide_risk";

export type DisasterAlertLevel = "advisory" | "warning";

export type DisasterMapMode = "total" | DisasterType;

export const DISASTER_MAP_MODES: { mode: DisasterMapMode; label: string; description: string }[] = [
    { mode: "total", label: "전체재난", description: "모든 재난 합산 빈도" },
    { mode: "typhoon", label: "태풍", description: "태풍 특보" },
    { mode: "flood", label: "홍수", description: "호우 특보" },
    { mode: "earthquake", label: "지진", description: "지진 발생" },
    { mode: "landslide_risk", label: "산사태위험", description: "호우경보 기반 산사태 위험" },
];

export interface DisasterAlert {
    regionName: string;
    disasterType: DisasterType;
    alertLevel: DisasterAlertLevel;
    date: string;
    year: number;
    month: number;
    magnitude?: number;
}

export interface DisasterYearlyBreakdown {
    year: number;
    typhoonCount: number;
    floodCount: number;
    earthquakeCount: number;
    landslideRiskCount: number;
    totalCount: number;
}

export interface DisasterMonthlyBreakdown {
    month: number;
    typhoonCount: number;
    floodCount: number;
    earthquakeCount: number;
    landslideRiskCount: number;
    totalCount: number;
}

export interface DisasterRegionStats {
    region: string;
    typhoonCount: number;
    floodCount: number;
    earthquakeCount: number;
    landslideRiskCount: number;
    totalCount: number;
    yearlyBreakdown: DisasterYearlyBreakdown[];
    monthlyBreakdown: DisasterMonthlyBreakdown[];
    recentAlerts: DisasterAlert[];
}
