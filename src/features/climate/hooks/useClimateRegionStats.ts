import { useMemo } from "react";
import type { WeatherAlert, ClimateRegionStats, YearlyBreakdown, MonthlyBreakdown, AlertType } from "../lib/climate-types";
import { GYEONGNAM_REGIONS } from "../lib/climate-region-codes";

export function useClimateRegionStats(
    alerts: WeatherAlert[] | undefined,
    yearRange: [number, number]
): Map<string, ClimateRegionStats> {
    return useMemo(() => {
        const statsMap = new Map<string, ClimateRegionStats>();

        // 모든 지역에 대해 빈 통계 초기화
        for (const region of GYEONGNAM_REGIONS) {
            const [startYear, endYear] = yearRange;
            const yearlyBreakdown: YearlyBreakdown[] = [];
            for (let y = startYear; y <= endYear; y++) {
                yearlyBreakdown.push({
                    year: y,
                    coldAdvisoryCount: 0,
                    coldWarningCount: 0,
                    heatAdvisoryCount: 0,
                    heatWarningCount: 0,
                    totalCount: 0,
                });
            }

            const monthlyBreakdown: MonthlyBreakdown[] = [];
            for (let m = 1; m <= 12; m++) {
                monthlyBreakdown.push({
                    month: m,
                    coldAdvisoryCount: 0,
                    coldWarningCount: 0,
                    heatAdvisoryCount: 0,
                    heatWarningCount: 0,
                    totalCount: 0,
                });
            }

            statsMap.set(region, {
                region,
                coldAdvisoryCount: 0,
                coldWarningCount: 0,
                heatAdvisoryCount: 0,
                heatWarningCount: 0,
                totalAlertCount: 0,
                yearlyBreakdown,
                monthlyBreakdown,
                recentAlerts: [],
            });
        }

        if (!alerts || alerts.length === 0) return statsMap;

        for (const alert of alerts) {
            const stats = statsMap.get(alert.regionName);
            if (!stats) continue;

            // 총 합산
            stats.totalAlertCount++;
            switch (alert.alertType) {
                case "cold_advisory": stats.coldAdvisoryCount++; break;
                case "cold_warning": stats.coldWarningCount++; break;
                case "heat_advisory": stats.heatAdvisoryCount++; break;
                case "heat_warning": stats.heatWarningCount++; break;
            }

            // 연도별
            const yearEntry = stats.yearlyBreakdown.find(y => y.year === alert.year);
            if (yearEntry) {
                yearEntry.totalCount++;
                switch (alert.alertType) {
                    case "cold_advisory": yearEntry.coldAdvisoryCount++; break;
                    case "cold_warning": yearEntry.coldWarningCount++; break;
                    case "heat_advisory": yearEntry.heatAdvisoryCount++; break;
                    case "heat_warning": yearEntry.heatWarningCount++; break;
                }
            }

            // 월별
            const monthEntry = stats.monthlyBreakdown[alert.month - 1];
            if (monthEntry) {
                monthEntry.totalCount++;
                switch (alert.alertType) {
                    case "cold_advisory": monthEntry.coldAdvisoryCount++; break;
                    case "cold_warning": monthEntry.coldWarningCount++; break;
                    case "heat_advisory": monthEntry.heatAdvisoryCount++; break;
                    case "heat_warning": monthEntry.heatWarningCount++; break;
                }
            }

            // 최근 특보 (최대 20건)
            if (stats.recentAlerts.length < 20) {
                stats.recentAlerts.push(alert);
            }
        }

        // 최근 특보를 날짜 역순 정렬
        for (const stats of statsMap.values()) {
            stats.recentAlerts.sort((a, b) => b.startDate.localeCompare(a.startDate));
        }

        return statsMap;
    }, [alerts, yearRange]);
}

// 목업 데이터 생성 (API 키 없을 때 사용)
export function generateMockAlerts(startYear: number, endYear: number): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];
    const alertTypes: AlertType[] = ["cold_advisory", "cold_warning", "heat_advisory", "heat_warning"];

    // 시드를 고정해서 일관된 목업 데이터 생성
    let seed = 42;
    const random = () => {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
    };

    for (let year = startYear; year <= endYear; year++) {
        for (const region of GYEONGNAM_REGIONS) {
            // 한파 (12~2월) - 지역별 2~8건
            const coldCount = Math.floor(random() * 7) + 2;
            for (let i = 0; i < coldCount; i++) {
                const month = [12, 1, 2][Math.floor(random() * 3)];
                const adjustedYear = month === 12 ? year - 1 : year;
                if (adjustedYear < startYear) continue;
                const day = Math.floor(random() * 28) + 1;
                const type = random() > 0.7 ? "cold_warning" : "cold_advisory";
                alerts.push({
                    regionName: region,
                    alertType: type as AlertType,
                    startDate: `${adjustedYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                    endDate: `${adjustedYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                    year: adjustedYear,
                    month,
                });
            }

            // 폭염 (6~8월) - 지역별 3~10건
            const heatCount = Math.floor(random() * 8) + 3;
            for (let i = 0; i < heatCount; i++) {
                const month = [6, 7, 8][Math.floor(random() * 3)];
                const day = Math.floor(random() * 28) + 1;
                const type = random() > 0.8 ? "heat_warning" : "heat_advisory";
                alerts.push({
                    regionName: region,
                    alertType: type as AlertType,
                    startDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                    endDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                    year,
                    month,
                });
            }
        }
    }

    return alerts;
}
