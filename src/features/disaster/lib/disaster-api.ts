import type { DisasterAlert } from "./disaster-types";
import { CLIMATE_REGION_CODES } from "./disaster-region-codes";

const API_KEY = import.meta.env.VITE_KMA_API_KEY ?? "";

const WRN_BASE_URL = "/kma-api/api/typ01/url/wrn_met_data.php";
const EQK_BASE_URL = "/kma-api/api/typ09/url/eqk/urlNewNotiEqk.do";

/**
 * REG_ID를 기반으로 경남 시군 매핑
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

/**
 * 기상특보 데이터에서 태풍(T), 호우(R) 필터링
 * - WRN=T → typhoon
 * - WRN=R, LVL=2 → flood (advisory)
 * - WRN=R, LVL=3 → flood (warning) + landslide_risk (warning)
 */
export async function fetchDisasterAlerts(year: number): Promise<DisasterAlert[]> {
    if (!API_KEY) {
        console.warn("VITE_KMA_API_KEY not set");
        return [];
    }

    const alerts: DisasterAlert[] = [];

    // 기상특보 (태풍, 호우)
    try {
        const params = new URLSearchParams({
            tmfc1: `${year}01010000`,
            tmfc2: `${year}12312359`,
            disp: "0",
            wrn: "A",
            reg: "0",
            authKey: API_KEY,
        });

        console.log(`Fetching KMA disaster alerts (Year: ${year})`);
        const res = await fetch(`${WRN_BASE_URL}?${params.toString()}`);
        if (!res.ok) {
            console.error(`KMA API Hub error: ${res.status}`);
            return [];
        }

        const text = await res.text();
        const lines = text.split("\n");

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

            if (!regId.startsWith("L108")) continue;

            // 태풍(T) 또는 호우(R)만 필터링
            if (wrnCode !== "T" && wrnCode !== "R") continue;

            const regionNames = mapToRegionName(regId);
            const dateStr = tmFc.substring(0, 8);
            const date = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
            const alertMonth = parseInt(dateStr.substring(4, 6));
            const alertLevel = lvlCode === "3" ? "warning" : "advisory" as const;

            for (const regionName of regionNames) {
                if (wrnCode === "T") {
                    alerts.push({
                        regionName,
                        disasterType: "typhoon",
                        alertLevel,
                        date,
                        year,
                        month: alertMonth,
                    });
                } else if (wrnCode === "R") {
                    alerts.push({
                        regionName,
                        disasterType: "flood",
                        alertLevel,
                        date,
                        year,
                        month: alertMonth,
                    });

                    // 호우 경보(LVL=3)를 산사태 위험으로 추가 분류
                    if (lvlCode === "3") {
                        alerts.push({
                            regionName,
                            disasterType: "landslide_risk",
                            alertLevel: "warning",
                            date,
                            year,
                            month: alertMonth,
                        });
                    }
                }
            }
        }
    } catch (e) {
        console.error("Failed to fetch disaster WRN data:", e);
    }

    // 지진 데이터 (typ09 urlNewNotiEqk API — IP 제한 없음)
    try {
        const eqkParams = new URLSearchParams({
            orderTy: "xml",
            frDate: `${year}0101`,
            laDate: `${year}1231`,
            msgCode: "102,212",  // 지진정보 + 지진속보
            cntDiv: "Y",         // 국내
            eqArCd: "A13",       // 경남
            nkDiv: "N",          // 북한 제외
            authKey: API_KEY,
        });

        console.log(`Fetching KMA earthquake data (Year: ${year})`);
        const res = await fetch(`${EQK_BASE_URL}?${eqkParams.toString()}`);
        if (res.ok) {
            const text = await res.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");
            const infos = xmlDoc.querySelectorAll("earthqueakNoti info");

            for (const info of infos) {
                const eqDate = info.querySelector("eqDate")?.textContent ?? "";
                const magMl = parseFloat(info.querySelector("magMl")?.textContent ?? "0");
                const eqPt = info.querySelector("eqPt")?.textContent ?? "";

                if (!eqDate || isNaN(magMl)) continue;

                const dateStr = eqDate.substring(0, 8);
                const date = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
                const alertMonth = parseInt(dateStr.substring(4, 6));

                let matchedRegion = "창원시";
                for (const regionName of Object.keys(CLIMATE_REGION_CODES)) {
                    const shortName = regionName.replace(/[시군]/g, "");
                    if (eqPt.includes(shortName)) {
                        matchedRegion = regionName;
                        break;
                    }
                }

                alerts.push({
                    regionName: matchedRegion,
                    disasterType: "earthquake",
                    alertLevel: magMl >= 5.0 ? "warning" : "advisory",
                    date,
                    year,
                    month: alertMonth,
                    magnitude: magMl,
                });
            }
        }
    } catch (e) {
        console.error("Failed to fetch earthquake data:", e);
    }

    console.log(`[${year}] Parsed ${alerts.length} disaster alerts for Gyeongnam`);
    return alerts;
}
