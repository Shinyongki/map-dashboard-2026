// 경남 18개 시군 → 기상청 특보구역 코드 매핑 (기상청 API허브 L108 계열)
export const CLIMATE_REGION_CODES: Record<string, { code: string; kmaName: string }> = {
    "창원시": { code: "L1080600", kmaName: "창원" },
    "진주시": { code: "L1081400", kmaName: "진주" },
    "통영시": { code: "L1082000", kmaName: "통영" },
    "사천시": { code: "L1082100", kmaName: "사천" },
    "김해시": { code: "L1080900", kmaName: "김해" },
    "밀양시": { code: "L1081000", kmaName: "밀양" },
    "거제시": { code: "L1082200", kmaName: "거제" },
    "양산시": { code: "L1080500", kmaName: "양산" },
    "의령군": { code: "L1081100", kmaName: "의령" },
    "함안군": { code: "L1081200", kmaName: "함안" },
    "창녕군": { code: "L1081300", kmaName: "창녕" },
    "고성군": { code: "L1082300", kmaName: "고성" },
    "남해군": { code: "L1082400", kmaName: "남해" },
    "하동군": { code: "L1081500", kmaName: "하동" },
    "산청군": { code: "L1081600", kmaName: "산청" },
    "함양군": { code: "L1081700", kmaName: "함양" },
    "거창군": { code: "L1081800", kmaName: "거창" },
    "합천군": { code: "L1081900", kmaName: "합천" },
};

export const GYEONGNAM_REGIONS = Object.keys(CLIMATE_REGION_CODES);
