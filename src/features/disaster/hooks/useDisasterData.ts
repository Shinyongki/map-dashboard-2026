import { useQuery } from "@tanstack/react-query";
import { fetchDisasterAlerts } from "../lib/disaster-api";
import type { DisasterAlert } from "../lib/disaster-types";
import { generateMockDisasterAlerts } from "./useDisasterRegionStats";

export function useDisasterData(yearRange: [number, number]) {
    const [startYear, endYear] = yearRange;

    return useQuery<DisasterAlert[]>({
        queryKey: ["disaster-alerts", startYear, endYear],
        queryFn: async () => {
            const years = Array.from(
                { length: endYear - startYear + 1 },
                (_, i) => startYear + i
            );

            // API 키가 없으면 목업 데이터 사용
            const apiKey = import.meta.env.VITE_KMA_API_KEY;
            if (!apiKey) {
                return generateMockDisasterAlerts(startYear, endYear);
            }

            const results = await Promise.all(years.map(fetchDisasterAlerts));
            return results.flat();
        },
        staleTime: 1000 * 60 * 30, // 30분 캐시
        gcTime: 1000 * 60 * 60,    // 1시간 GC
    });
}
