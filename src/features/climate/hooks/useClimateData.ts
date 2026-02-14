import { useQuery } from "@tanstack/react-query";
import { fetchWeatherAlerts } from "../lib/climate-api";
import type { WeatherAlert } from "../lib/climate-types";
import { generateMockAlerts } from "./useClimateRegionStats";

export function useClimateData(yearRange: [number, number]) {
    const [startYear, endYear] = yearRange;

    return useQuery<WeatherAlert[]>({
        queryKey: ["climate-alerts", startYear, endYear],
        queryFn: async () => {
            const years = Array.from(
                { length: endYear - startYear + 1 },
                (_, i) => startYear + i
            );

            // API 키가 없으면 목업 데이터 사용
            const apiKey = import.meta.env.VITE_KMA_API_KEY;
            if (!apiKey) {
                return generateMockAlerts(startYear, endYear);
            }

            const results = await Promise.all(years.map(fetchWeatherAlerts));
            return results.flat();
        },
        staleTime: 1000 * 60 * 30, // 30분 캐시
        gcTime: 1000 * 60 * 60,    // 1시간 GC
    });
}
