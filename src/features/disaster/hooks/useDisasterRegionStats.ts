import { useMemo } from "react";
import type {
    DisasterAlert,
    DisasterRegionStats,
    DisasterYearlyBreakdown,
    DisasterMonthlyBreakdown,
    DisasterType,
} from "../lib/disaster-types";
import { GYEONGNAM_REGIONS } from "../lib/disaster-region-codes";

export function useDisasterRegionStats(
    alerts: DisasterAlert[] | undefined,
    yearRange: [number, number]
): Map<string, DisasterRegionStats> {
    return useMemo(() => {
        const statsMap = new Map<string, DisasterRegionStats>();

        for (const region of GYEONGNAM_REGIONS) {
            const [startYear, endYear] = yearRange;
            const yearlyBreakdown: DisasterYearlyBreakdown[] = [];
            for (let y = startYear; y <= endYear; y++) {
                yearlyBreakdown.push({
                    year: y,
                    typhoonCount: 0,
                    floodCount: 0,
                    earthquakeCount: 0,
                    landslideRiskCount: 0,
                    totalCount: 0,
                });
            }

            const monthlyBreakdown: DisasterMonthlyBreakdown[] = [];
            for (let m = 1; m <= 12; m++) {
                monthlyBreakdown.push({
                    month: m,
                    typhoonCount: 0,
                    floodCount: 0,
                    earthquakeCount: 0,
                    landslideRiskCount: 0,
                    totalCount: 0,
                });
            }

            statsMap.set(region, {
                region,
                typhoonCount: 0,
                floodCount: 0,
                earthquakeCount: 0,
                landslideRiskCount: 0,
                totalCount: 0,
                yearlyBreakdown,
                monthlyBreakdown,
                recentAlerts: [],
            });
        }

        if (!alerts || alerts.length === 0) return statsMap;

        for (const alert of alerts) {
            const stats = statsMap.get(alert.regionName);
            if (!stats) continue;

            stats.totalCount++;
            switch (alert.disasterType) {
                case "typhoon": stats.typhoonCount++; break;
                case "flood": stats.floodCount++; break;
                case "earthquake": stats.earthquakeCount++; break;
                case "landslide_risk": stats.landslideRiskCount++; break;
            }

            const yearEntry = stats.yearlyBreakdown.find(y => y.year === alert.year);
            if (yearEntry) {
                yearEntry.totalCount++;
                switch (alert.disasterType) {
                    case "typhoon": yearEntry.typhoonCount++; break;
                    case "flood": yearEntry.floodCount++; break;
                    case "earthquake": yearEntry.earthquakeCount++; break;
                    case "landslide_risk": yearEntry.landslideRiskCount++; break;
                }
            }

            const monthEntry = stats.monthlyBreakdown[alert.month - 1];
            if (monthEntry) {
                monthEntry.totalCount++;
                switch (alert.disasterType) {
                    case "typhoon": monthEntry.typhoonCount++; break;
                    case "flood": monthEntry.floodCount++; break;
                    case "earthquake": monthEntry.earthquakeCount++; break;
                    case "landslide_risk": monthEntry.landslideRiskCount++; break;
                }
            }

            if (stats.recentAlerts.length < 20) {
                stats.recentAlerts.push(alert);
            }
        }

        for (const stats of statsMap.values()) {
            stats.recentAlerts.sort((a, b) => b.date.localeCompare(a.date));
        }

        return statsMap;
    }, [alerts, yearRange]);
}

// 목업 데이터 생성 (API 키 없을 때 사용)
export function generateMockDisasterAlerts(startYear: number, endYear: number): DisasterAlert[] {
    const alerts: DisasterAlert[] = [];

    let seed = 77;
    const random = () => {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
    };

    for (let year = startYear; year <= endYear; year++) {
        for (const region of GYEONGNAM_REGIONS) {
            // 태풍 (7~10월) - 지역별 0~3건
            const typhoonCount = Math.floor(random() * 4);
            for (let i = 0; i < typhoonCount; i++) {
                const month = [7, 8, 9, 10][Math.floor(random() * 4)];
                const day = Math.floor(random() * 28) + 1;
                alerts.push({
                    regionName: region,
                    disasterType: "typhoon",
                    alertLevel: random() > 0.6 ? "warning" : "advisory",
                    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                    year,
                    month,
                });
            }

            // 홍수/호우 (6~9월) - 지역별 1~6건
            const floodCount = Math.floor(random() * 6) + 1;
            for (let i = 0; i < floodCount; i++) {
                const month = [6, 7, 8, 9][Math.floor(random() * 4)];
                const day = Math.floor(random() * 28) + 1;
                const isWarning = random() > 0.7;
                alerts.push({
                    regionName: region,
                    disasterType: "flood",
                    alertLevel: isWarning ? "warning" : "advisory",
                    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                    year,
                    month,
                });

                // 호우 경보 시 산사태 위험 추가
                if (isWarning) {
                    alerts.push({
                        regionName: region,
                        disasterType: "landslide_risk",
                        alertLevel: "warning",
                        date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                        year,
                        month,
                    });
                }
            }

            // 지진 (연중) - 지역별 0~2건
            const eqkCount = Math.floor(random() * 3);
            for (let i = 0; i < eqkCount; i++) {
                const month = Math.floor(random() * 12) + 1;
                const day = Math.floor(random() * 28) + 1;
                const mag = Math.round((random() * 4 + 1.5) * 10) / 10;
                alerts.push({
                    regionName: region,
                    disasterType: "earthquake",
                    alertLevel: mag >= 5.0 ? "warning" : "advisory",
                    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                    year,
                    month,
                    magnitude: mag,
                });
            }
        }
    }

    return alerts;
}
