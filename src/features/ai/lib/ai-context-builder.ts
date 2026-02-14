import type { RegionStats } from "@/features/map/lib/map-types";
import type { ClimateRegionStats } from "@/features/climate/lib/climate-types";
import type { DisasterRegionStats } from "@/features/disaster/lib/disaster-types";

export function buildSystemPrompt(
    careStats: Map<string, RegionStats>,
    climateStats: Map<string, ClimateRegionStats>,
    disasterStats: Map<string, DisasterRegionStats>
): string {
    const careTable = buildCareTable(careStats);
    const climateTable = buildClimateTable(climateStats);
    const disasterTable = buildDisasterTable(disasterStats);

    return `당신은 경상남도 돌봄 데이터 분석 전문 AI 어시스턴트입니다.
아래 데이터를 참고하여 사용자의 질문에 한국어로 답변하세요.
답변은 구체적인 수치를 포함하고, 마크다운 형식으로 구조화해주세요.

## 돌봄 현황 데이터 (시군별)
${careTable}

## 기후 특보 데이터 (시군별 누적)
${climateTable}

## 자연재난 데이터 (시군별 누적)
${disasterTable}

분석 시 주의사항:
- 데이터에 없는 내용은 추측하지 마세요
- 여러 분야를 교차 분석하는 복합 질문에 적극 대응하세요
- 수치를 비교할 때는 표 형태로 정리하세요`;
}

function buildCareTable(stats: Map<string, RegionStats>): string {
    if (stats.size === 0) return "(데이터 없음)";

    const header = "| 시군 | 기관수 | 제출률 | 종사자(남/여) | 이용자(남/여) | 신규(남/여) | 종결(남/여) |";
    const sep = "|------|--------|--------|---------------|---------------|-------------|-------------|";
    const rows: string[] = [];

    for (const [, s] of stats) {
        const staffM = s.sw_m + s.cg_m + s.short_sw_m + s.short_cg_m;
        const staffF = s.sw_f + s.cg_f + s.short_sw_f + s.short_cg_f;
        const userM = s.gen_m_gen + s.gen_m_int + s.special_m + s.short_m;
        const userF = s.gen_f_gen + s.gen_f_int + s.special_f + s.short_f;
        const newM = s.new_m + s.short_new_m;
        const newF = s.new_f + s.short_new_f;
        const termM = s.term_m_death + s.term_m_refuse + s.term_m_etc;
        const termF = s.term_f_death + s.term_f_refuse + s.term_f_etc;

        rows.push(
            `| ${s.region} | ${s.totalOrganizations} | ${s.submissionRate}% | ${staffM}/${staffF} | ${userM}/${userF} | ${newM}/${newF} | ${termM}/${termF} |`
        );
    }

    return [header, sep, ...rows].join("\n");
}

function buildClimateTable(stats: Map<string, ClimateRegionStats>): string {
    if (stats.size === 0) return "(데이터 없음)";

    const header = "| 시군 | 한파주의보 | 한파경보 | 폭염주의보 | 폭염경보 | 합계 |";
    const sep = "|------|-----------|---------|-----------|---------|------|";
    const rows: string[] = [];

    for (const [, s] of stats) {
        rows.push(
            `| ${s.region} | ${s.coldAdvisoryCount} | ${s.coldWarningCount} | ${s.heatAdvisoryCount} | ${s.heatWarningCount} | ${s.totalAlertCount} |`
        );
    }

    return [header, sep, ...rows].join("\n");
}

function buildDisasterTable(stats: Map<string, DisasterRegionStats>): string {
    if (stats.size === 0) return "(데이터 없음)";

    const header = "| 시군 | 태풍 | 홍수 | 지진 | 산사태위험 | 합계 |";
    const sep = "|------|------|------|------|-----------|------|";
    const rows: string[] = [];

    for (const [, s] of stats) {
        rows.push(
            `| ${s.region} | ${s.typhoonCount} | ${s.floodCount} | ${s.earthquakeCount} | ${s.landslideRiskCount} | ${s.totalCount} |`
        );
    }

    return [header, sep, ...rows].join("\n");
}
