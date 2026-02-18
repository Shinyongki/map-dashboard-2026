// ─── Welfare Resource Types ─────────────────────────────────

export type WelfareGroup =
    | "medical"     // 의료/건강
    | "care"        // 요양/돌봄시설
    | "living"      // 생활지원
    | "housing"     // 주거/안전
    | "transport"   // 교통/이동
    | "social"      // 사회참여
    | "admin"       // 행정/법률
    | "public"      // 공공·행정
    | "performer"   // 수행기관
    | "other";      // 기타

export interface WelfareFacility {
    id: string;
    name: string;
    address: string;
    eupmyeondong?: string;       // 읍면동
    sigun: string;               // 시군
    phone: string;
    category: string;            // 자유 텍스트 (취합 원본값)
    group: WelfareGroup;         // 코드에서 매핑
    serviceTypes?: string[];     // 제공 서비스
    capacity?: number;           // 정원
    operatingHours?: string;     // 운영시간
    linkedAgencies?: string[];   // 연계 수행기관 코드
    source: "public" | "institution" | "csv";
    lat?: number;
    lng?: number;
}

// ─── Category → WelfareGroup 매핑 테이블 ────────────────────

export const CATEGORY_GROUP_MAP: Record<string, WelfareGroup> = {
    // 의료/건강
    "병·의원": "medical",
    "한의원": "medical",
    "치과": "medical",
    "약국": "medical",
    "정신건강복지센터": "medical",
    "정신건강": "medical",

    // 요양/돌봄
    "노인요양시설": "care",
    "주야간보호센터": "care",
    "노인요양공동생활가정": "care",
    "단기보호시설": "care",
    "방문요양기관": "care",
    "노인맞춤돌봄": "care",

    // 생활지원
    "푸드뱅크": "living",
    "경로당": "living",
    "무료급식소": "living",

    // 주거/안전
    "임대주택": "housing",
    "주거환경개선": "housing",
    "응급안전": "housing",

    // 교통/이동
    "복지택시": "transport",
    "의료기관이송": "transport",

    // 사회참여
    "노인복지관": "social",
    "자원봉사센터": "social",
    "자원봉사": "social",
    "종교단체": "social",
    "종합복지관": "social",
    "장애인복지관": "social",

    // 행정/법률
    "치매안심센터": "admin",
    "법률구조공단": "admin",
    "노인보호": "admin",

    // 공공·행정
    "시군구청": "public",
    "소방서": "public",
    "보건소": "public",
    "경찰서": "public",
    "행정복지센터": "public",

    // 의료기관 (전문·보호)
    "의료기관": "medical",

    // 수행기관
    "수행기관": "performer",
};

export function getCategoryGroup(category: string): WelfareGroup {
    return CATEGORY_GROUP_MAP[category] ?? "other";
}

// ─── WelfareGroup 표시 정보 ─────────────────────────────────

export interface WelfareGroupInfo {
    id: WelfareGroup;
    label: string;
    color: string;
    categories: string[];
}

export const WELFARE_GROUPS: WelfareGroupInfo[] = [
    {
        id: "public",
        label: "공공·행정",
        categories: ["시군구청", "소방서", "경찰서", "보건소", "행정복지센터"],
        color: "#ef4444",
    },
    {
        id: "medical",
        label: "의료/건강",
        categories: ["정신건강", "의료기관", "병·의원", "한의원", "치과", "약국", "정신건강복지센터"],
        color: "#f59e0b",
    },
    {
        id: "care",
        label: "요양/돌봄",
        categories: ["노인요양시설", "주야간보호센터", "노인맞춤돌봄", "방문요양기관"],
        color: "#8b5cf6",
    },
    {
        id: "social",
        label: "사회참여",
        categories: ["종합복지관", "노인복지관", "장애인복지관", "자원봉사"],
        color: "#10b981",
    },
    {
        id: "performer",
        label: "수행기관",
        categories: ["수행기관"],
        color: "#3b82f6",
    },
    {
        id: "housing",
        label: "주거/안전",
        categories: ["응급안전", "임대주택", "주거환경개선"],
        color: "#06b6d4",
    },
    {
        id: "living",
        label: "생활지원",
        categories: ["푸드뱅크", "경로당", "무료급식소"],
        color: "#ec4899",
    },
    {
        id: "admin",
        label: "행정/법률",
        categories: ["노인보호", "치매안심센터", "법률구조공단"],
        color: "#64748b",
    },
    {
        id: "transport",
        label: "교통/이동",
        categories: ["복지택시", "의료기관이송"],
        color: "#f97316",
    },
    {
        id: "other",
        label: "기타",
        categories: [],
        color: "#9ca3af",
    },
];

export function getGroupInfo(group: WelfareGroup): WelfareGroupInfo {
    return WELFARE_GROUPS.find((g) => g.id === group) ?? WELFARE_GROUPS[WELFARE_GROUPS.length - 1];
}

// ─── 시군 목록 ──────────────────────────────────────────────

export const SIGUN_LIST = [
    "창원시", "진주시", "통영시", "사천시", "김해시",
    "밀양시", "거제시", "양산시", "의령군", "함안군",
    "창녕군", "고성군", "남해군", "하동군", "산청군",
    "함양군", "거창군", "합천군",
] as const;

export type Sigun = (typeof SIGUN_LIST)[number];

// ─── 시군 추출 유틸 ─────────────────────────────────────────

export function extractSigun(address: string, region?: string): string {
    // region 필드에서 시군 추출 (institution_profiles)
    if (region) {
        const m = SIGUN_LIST.find((s) => region.includes(s.replace("시", "").replace("군", "")));
        if (m) return m;
    }
    // address에서 추출
    const parts = address.split(/\s+/);
    for (const part of parts) {
        const m = SIGUN_LIST.find(
            (s) => part === s || part.startsWith(s.replace("시", "").replace("군", ""))
        );
        if (m) return m;
    }
    return "";
}

// ─── CSV 민간자원 파싱 (데이터 들어오면 사용) ─────────────────

export function parseCsvToFacilities(csvText: string): WelfareFacility[] {
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line, i) => {
        const values = line.split(",").map((v) => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => {
            obj[h] = values[idx] ?? "";
        });
        return {
            id: `csv_${i}`,
            name: obj["기관명"] ?? "",
            address: obj["주소"] ?? "",
            sigun: obj["시군"] ?? "",
            eupmyeondong: obj["읍면동"],
            phone: obj["전화번호"] ?? "",
            category: obj["분류"] ?? "기타",
            group: getCategoryGroup(obj["분류"] ?? "기타"),
            serviceTypes: obj["제공서비스"] ? obj["제공서비스"].split("|") : [],
            operatingHours: obj["운영시간"],
            source: "csv" as const,
            lat: obj["위도"] ? parseFloat(obj["위도"]) : undefined,
            lng: obj["경도"] ? parseFloat(obj["경도"]) : undefined,
        };
    });
}
