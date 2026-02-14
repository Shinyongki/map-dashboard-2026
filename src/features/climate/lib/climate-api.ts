import type { AlertType, WeatherAlert } from "./climate-types";
import { CLIMATE_REGION_CODES } from "./climate-region-codes";

const API_KEY = import.meta.env.VITE_KMA_API_KEY ?? "";

// 기상청 API허브 기상특보 조회 엔드포인트
const BASE_URL = "/kma-api/api/typ01/url/wrn_met_data.php";

/**
 * KMA API Hub WRN/LVL 매핑 가이드
 * WRN (특보종류): C(한파), H(폭염)
 * LVL (특보레벨): 2(주의보), 3(경보)
 */
function mapToAlertType(wrn: string, lvl: string): AlertType | null {
    const w = wrn.trim();
    const l = lvl.trim();
    if (w === "C") {
        return l === "3" ? "cold_warning" : "cold_advisory";
    }
    if (w === "H") {
        return l === "3" ? "heat_warning" : "heat_advisory";
    }
    return null;
}

/**
 * REG_ID를 기반으로 경남 시군 매핑
 * KMA API Hub에서 경남 지역 번호는 'L108'로 시작함
 */
function mapToRegionName(regId: string): string[] {
    const rid = regId.trim();
    const matchedRegionNames: string[] = [];

    for (const [regionName, { code }] of Object.entries(CLIMATE_REGION_CODES)) {
        if (rid === code) {
            matchedRegionNames.push(regionName);
        }
    }

    return matchedRegionNames;
}

export async function fetchWeatherAlerts(year: number): Promise<WeatherAlert[]> {
    if (!API_KEY) {
        console.warn("VITE_KMA_API_KEY not set");
        return [];
    }

    const alerts: WeatherAlert[] = [];
    const params = new URLSearchParams({
        tmfc1: `${year}01010000`,
        tmfc2: `${year}12312359`,
        disp: "0",
        wrn: "A",
        reg: "0",
        authKey: API_KEY,
    });

    try {
        const url = `${BASE_URL}?${params.toString()}`;
        console.log(`Fetching KMA API Hub (Year: ${year})`);
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`KMA API Hub error: ${res.status}`);
            return [];
        }

        const text = await res.text();
        const lines = text.split("\n");

        // 헤더 인덱스 찾기
        let regIdIdx = -1;
        let wrnIdx = -1;
        let lvlIdx = -1;
        let tmFcIdx = -1;

        for (const line of lines) {
            if (line.startsWith("#")) {
                const header = line.substring(1).split(",").map(h => h.trim());
                if (header.includes("REG_ID")) {
                    regIdIdx = header.indexOf("REG_ID");
                    wrnIdx = header.indexOf("WRN");
                    lvlIdx = header.indexOf("LVL");
                    tmFcIdx = header.indexOf("TM_FC");
                }
                continue;
            }

            if (line.trim() === "" || regIdIdx === -1) continue;

            const cols = line.split(",");
            if (cols.length <= Math.max(regIdIdx, wrnIdx, lvlIdx)) continue;

            const regId = cols[regIdIdx].trim();
            const wrnCode = cols[wrnIdx].trim();
            const lvlCode = cols[lvlIdx].trim();
            const tmFc = cols[tmFcIdx].trim();

            // 1. 경남 지역(L108) 필터링
            if (!regId.startsWith("L108")) continue;

            // 2. 폭염/한파 특보 매핑
            const alertType = mapToAlertType(wrnCode, lvlCode);
            if (!alertType) continue;

            // 3. 지역 이름 매핑 (L108XXXX 코드 매칭)
            const regionNames = mapToRegionName(regId);
            const dateStr = tmFc.substring(0, 8);
            const startDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
            const alertMonth = parseInt(dateStr.substring(4, 6));

            for (const regionName of regionNames) {
                alerts.push({
                    regionName,
                    alertType,
                    startDate,
                    endDate: startDate,
                    year: year,
                    month: alertMonth,
                });
            }
        }

        console.log(`[${year}] Parsed ${alerts.length} region-specific alerts for Gyeongnam`);
        return alerts;

    } catch (e) {
        console.error("Failed to fetch climate data from API Hub:", e);
        return [];
    }
}
