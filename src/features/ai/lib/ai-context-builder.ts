import type { RegionStats } from "@/features/map/lib/map-types";
import type { ClimateRegionStats } from "@/features/climate/lib/climate-types";
import type { DisasterRegionStats } from "@/features/disaster/lib/disaster-types";
import type { RegionCareStatus } from "@/features/climate/hooks/useCareStatusByRegion";
import type { AiContextInput } from "./ai-types";

// ─── Main builder ──────────────────────────────────────────

export function buildSystemPrompt(
    careStats: Map<string, RegionStats>,
    climateStats: Map<string, ClimateRegionStats>,
    disasterStats: Map<string, DisasterRegionStats>,
    careStatusByRegion?: RegionCareStatus[],
    contextInput?: AiContextInput
): string {
    const tab = contextInput?.activeTab ?? "care";

    const basePrompt = `당신은 경상남도 광역지원기관의 노인맞춤돌봄서비스 통합 인텔리전스 시스템 AI 어시스턴트입니다.

현재 시스템 현황 데이터를 기반으로 답변하세요.
데이터에 없는 내용은 추측하지 말고 '현재 데이터에서 확인되지 않습니다'라고 안내하세요.
답변은 간결하게, 수치는 구체적으로 제시하세요.
마크다운 형식으로 구조화해주세요.`;

    // 탭별 컨텍스트 구성
    const sections: string[] = [basePrompt];

    // 돌봄 현황은 항상 포함 (핵심 데이터)
    sections.push("## 돌봄 현황 데이터 (시군별)");
    sections.push(buildCareTable(careStats));

    // 탭별 추가 컨텍스트
    if (tab === "care") {
        sections.push(buildCareDetailContext(careStats));
    }

    if (tab === "welfare" && careStatusByRegion) {
        sections.push("## 복지자원 현황 (시군별 돌봄 인프라)");
        sections.push(buildWelfareContext(careStatusByRegion));
    }

    if (tab === "climate" || tab === "disaster") {
        sections.push("## 기후 특보 데이터 (시군별 누적)");
        sections.push(buildClimateTable(climateStats));

        sections.push("## 자연재난 데이터 (시군별 누적)");
        sections.push(buildDisasterTable(disasterStats));

        if (careStatusByRegion) {
            sections.push("## 시군별 돌봄 인프라 현황");
            sections.push(buildWelfareContext(careStatusByRegion));
        }

        // 활성 특보/재난 시군 명시
        if (contextInput?.climateAlerts?.length) {
            sections.push(
                `## 현재 활성 기상특보 시군\n${contextInput.climateAlerts.join(", ")}`
            );
        }
        if (contextInput?.disasterAlerts?.length) {
            sections.push(
                `## 현재 활성 재난 시군\n${contextInput.disasterAlerts.join(", ")}`
            );
        }
    }

    if (tab !== "climate" && tab !== "disaster") {
        // 다른 탭에서도 기후/재난 요약은 포함 (간략하게)
        sections.push("## 기후/재난 요약");
        sections.push(buildClimateSummary(climateStats, disasterStats));
    }

    sections.push(`\n분석 시 주의사항:
- 데이터에 없는 내용은 추측하지 마세요
- 여러 분야를 교차 분석하는 복합 질문에 적극 대응하세요
- 수치를 비교할 때는 표 형태로 정리하세요
- 현재 사용자가 보고 있는 탭: ${getTabLabel(tab)}`);

    return sections.join("\n\n");
}

// ─── Tab label ─────────────────────────────────────────────

function getTabLabel(tab: string): string {
    const labels: Record<string, string> = {
        care: "돌봄현황",
        welfare: "복지자원",
        climate: "기후대응",
        disaster: "자연재난",
        qna: "Q&A",
    };
    return labels[tab] ?? tab;
}

// ─── Care detail context ───────────────────────────────────

function buildCareDetailContext(stats: Map<string, RegionStats>): string {
    if (stats.size === 0) return "";

    const lines: string[] = ["## 돌봄 상세 분석"];

    // 미제출 기관
    const lowSubmission: string[] = [];
    let totalOrgs = 0;
    let totalSubmitted = 0;

    for (const [, s] of stats) {
        totalOrgs += s.totalOrganizations;
        totalSubmitted += s.submissions;
        if (s.submissionRate < 100) {
            lowSubmission.push(
                `${s.region} (${s.submissionRate}%, ${s.totalOrganizations - s.submissions}곳 미제출)`
            );
        }
    }

    lines.push(`전체 기관: ${totalOrgs}곳, 제출 완료: ${totalSubmitted}곳`);
    if (lowSubmission.length > 0) {
        lines.push(`미제출 시군: ${lowSubmission.join(", ")}`);
    }

    return lines.join("\n");
}

// ─── Welfare context ───────────────────────────────────────

function buildWelfareContext(statuses: RegionCareStatus[]): string {
    if (!statuses.length) return "(데이터 없음)";

    const header =
        "| 시군 | 기관수 | 사회복지사 | 돌봄제공인력 | 이용자 | 독거노인(추정) | 1인당 담당 |";
    const sep =
        "|------|--------|-----------|-------------|--------|---------------|-----------|";
    const rows: string[] = [];

    for (const s of statuses) {
        const overload = s.staffPerUser > 10 ? " ⚠" : "";
        rows.push(
            `| ${s.sigun} | ${s.agencyCount} | ${s.socialWorkers} | ${s.careProviders} | ${s.users} | ${s.estimatedSolitary} | ${s.staffPerUser}${overload} |`
        );
    }

    return [header, sep, ...rows].join("\n");
}

// ─── Climate/Disaster Summary ──────────────────────────────

function buildClimateSummary(
    climateStats: Map<string, ClimateRegionStats>,
    disasterStats: Map<string, DisasterRegionStats>
): string {
    if (climateStats.size === 0 && disasterStats.size === 0) return "(데이터 없음)";

    const lines: string[] = [];

    if (climateStats.size > 0) {
        let totalClimate = 0;
        let maxRegion = "";
        let maxCount = 0;
        for (const [, s] of climateStats) {
            totalClimate += s.totalAlertCount;
            if (s.totalAlertCount > maxCount) {
                maxCount = s.totalAlertCount;
                maxRegion = s.region;
            }
        }
        lines.push(
            `기상특보 총 ${totalClimate}건, 최다 지역: ${maxRegion} (${maxCount}건)`
        );
    }

    if (disasterStats.size > 0) {
        let totalDisaster = 0;
        let maxRegion = "";
        let maxCount = 0;
        for (const [, s] of disasterStats) {
            totalDisaster += s.totalCount;
            if (s.totalCount > maxCount) {
                maxCount = s.totalCount;
                maxRegion = s.region;
            }
        }
        lines.push(
            `자연재난 총 ${totalDisaster}건, 최다 지역: ${maxRegion} (${maxCount}건)`
        );
    }

    return lines.join("\n");
}

// ─── Table builders (existing) ─────────────────────────────

function buildCareTable(stats: Map<string, RegionStats>): string {
    if (stats.size === 0) return "(데이터 없음)";

    const header =
        "| 시군 | 기관수 | 제출률 | 종사자(남/여) | 이용자(남/여) | 신규(남/여) | 종결(남/여) |";
    const sep =
        "|------|--------|--------|---------------|---------------|-------------|-------------|";
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
