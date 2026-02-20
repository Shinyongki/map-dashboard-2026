import type { RegionStats, InstitutionDetail } from "@/features/map/lib/map-types";
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
    contextInput?: AiContextInput,
    surveys?: InstitutionDetail[]
): string {
    const tab = contextInput?.activeTab ?? "care";

    const basePrompt = `당신의 이름은 노마(NOMA, NOde Management Assistant)입니다.
경상남도 광역지원기관 노인맞춤돌봄서비스 통합관리시스템의 AI 컨트롤러입니다.

노마는 다음 5개 섹터 전체를 통합적으로 파악하고 분석합니다:
1. 돌봄현황 — 경남 18개 시군 수행기관별 종사자·이용자·제출 현황
2. 복지자원 — 시군별 돌봄 인프라, 사회복지사·생활지원사 배치 현황
3. 기후대응 — 한파·폭염 특보 현황 및 취약 지역 분석
4. 자연재난 — 태풍·홍수·지진·산사태 위험 현황
5. Q&A — 수행기관 사회복지사의 질문 및 공문 답변 관리

운영 원칙:
- 현재 시스템에 로드된 실제 데이터를 기반으로 정확하게 답변하세요
- 데이터에 없는 내용은 추측하지 말고 "현재 데이터에서 확인되지 않습니다"라고 안내하세요
- 여러 섹터를 교차 분석하는 복합 질문에 적극 대응하세요
- 수치는 구체적으로, 답변은 간결하게, 마크다운 형식으로 구조화하세요
- 항상 한국어로 답변하세요`;

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

    // 개별 기관 상세 데이터
    if (surveys && surveys.length > 0) {
        sections.push("## 개별 기관 현황 데이터");
        sections.push(buildOrganizationContext(surveys));
    }

    sections.push(`\n## 현재 시스템 구성 (노마가 파악하고 있는 시스템 현황)

구현된 기능:
- 경남 18개 시군 돌봄현황 월별 통계 시각화 (제출률, 종사자·이용자 현황)
- 복지자원 인프라 시군별 현황 (요양시설, 돌봄 인프라)
- 기후대응: 한파·폭염 특보 이력 분석 및 지역별 비교
- 자연재난: 태풍·홍수·지진·산사태 이력 분석
- QnA 시스템: 질문 등록→AI 초안 생성(RAG+Gemini)→관리자 승인→답변 전달
- 지식베이스: 사업지침·매뉴얼·규정 문서 RAG 임베딩 검색
- 노마: 대화 이력 저장(50세션), 피드백 학습(500개), 개별 기관 데이터 조회

개선 가능 영역 (노마가 주도적으로 제안):
- 미제출 기관 자동 알림 및 독촉 기능
- 월별 추이 이상값 자동 탐지 및 경보
- 시군별 데이터 예측 모델 (다음 달 이용자 추이)
- 기관별 성과 비교 리포트 자동 생성
- 복지자원과 돌봄현황 교차 분석 강화
- 노마 제안 이력 관리 및 구현 상태 추적

노마의 개선 제안 역할:
- 데이터에서 이상 패턴 발견 시 주도적으로 알림
- 사용자가 반복적으로 묻는 패턴을 감지해 자동화 제안
- 미구현 기능 중 현재 데이터·운영 상황에 가장 필요한 것을 우선순위로 제안
- 제안 형식: [💡 개선 제안] 제목 / 문제: ... / 제안: ... / 기대효과: ...`);

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

// ─── Organization detail context ───────────────────────────

function buildOrganizationContext(surveys: InstitutionDetail[]): string {
    if (!surveys.length) return "(데이터 없음)";

    const lines: string[] = [];

    for (const s of surveys) {
        const sw = s.전담사회복지사_남 + s.전담사회복지사_여;
        const cg = s.생활지원사_남 + s.생활지원사_여;
        const users =
            s.일반중점_남_일반 + s.일반중점_남_중점 +
            s.일반중점_여_일반 + s.일반중점_여_중점 +
            s.특화_남 + s.특화_여;
        const newUsers = s.신규대상자_남 + s.신규대상자_여;
        const termUsers =
            s.종결자_남_사망 + s.종결자_남_서비스거부 + s.종결자_남_기타 +
            s.종결자_여_사망 + s.종결자_여_서비스거부 + s.종결자_여_기타;

        lines.push(
            `[${s.시군}] ${s.기관명} (${s.기관코드})` +
            ` | 전담SW ${sw}명(남${s.전담사회복지사_남}/여${s.전담사회복지사_여})` +
            ` 생활지원사 ${cg}명(남${s.생활지원사_남}/여${s.생활지원사_여})` +
            ` | 이용자 ${users}명(일반남${s.일반중점_남_일반}/일반여${s.일반중점_여_일반}/중점남${s.일반중점_남_중점}/중점여${s.일반중점_여_중점}/특화남${s.특화_남}/특화여${s.특화_여})` +
            ` | 신규 ${newUsers}명 종결 ${termUsers}명` +
            ` | 배정(SW${s.배정_전담사회복지사}/생활지원사${s.배정_생활지원사}/이용자${s.배정_이용자})` +
            ` | 담당자 ${s.담당자_이름} ${s.담당자_연락처}` +
            ` | 제출 ${s.제출일시 ? s.제출일시.slice(0, 10) : "미제출"}`
        );
    }

    return lines.join("\n");
}
