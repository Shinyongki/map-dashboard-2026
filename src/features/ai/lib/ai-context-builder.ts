import type { RegionStats, InstitutionDetail } from "@/features/map/lib/map-types";
import type { ClimateRegionStats } from "@/features/climate/lib/climate-types";
import type { DisasterRegionStats } from "@/features/disaster/lib/disaster-types";
import type { RegionCareStatus } from "@/features/climate/hooks/useCareStatusByRegion";
import type { AiContextInput } from "./ai-types";
import type { PromptPatch } from "./ai-api";
import type { SurveyData } from "@/lib/validation";
import uiContextData from "./noma-ui-context.json";

// ─── 확장 컨텍스트 트리거 ───────────────────────────────────────

export const EXTENDED_TRIGGER_KEYWORDS = [
    "분석", "비교", "전체", "데이터 기준", "통계", "현황 보고",
    "추세", "추이", "교차", "종합", "요약 보고", "리포트",
];

export function isExtendedRequest(message: string): boolean {
    return EXTENDED_TRIGGER_KEYWORDS.some((kw) => message.includes(kw));
}

// ─── 탭 → 섹터 매핑 ───────────────────────────────────────────

const TAB_TO_SECTOR: Record<string, string> = {
    care: "care_status",
    welfare: "welfare_resources",
    climate: "climate_response",
    disaster: "natural_disaster",
    qna: "qna",
};

// ─── UI 명세 섹션 빌더 (현재 탭만 추출) ───────────────────────

function buildUIContextSection(tab: string, contextInput?: AiContextInput): string {
    const sectorId = TAB_TO_SECTOR[tab];
    const sectors = (uiContextData as any).sectors as any[];
    const sector = sectors.find((s: any) => s.sectorId === sectorId);
    if (!sector) return "";

    const lines: string[] = [`## 현재 화면 UI 명세 (${sector.sectorLabel} 탭)`];

    for (const comp of sector.components as any[]) {
        const defaultStates = Object.entries(comp.states || {})
            .filter(([, v]) => v !== null && v !== false && v !== "dynamic" && typeof v !== "object")
            .map(([k, v]) => `${k}=${v}`)
            .join(", ");
        const desc = (comp.description as string).slice(0, 90);
        lines.push(`[${comp.componentType}] ${comp.componentId}: ${desc}${defaultStates ? ` (기본: ${defaultStates})` : ""}`);
    }

    // 런타임 실제 상태 오버레이
    const runtimeLines: string[] = [];
    if (contextInput?.selectedRegion) {
        runtimeLines.push(`선택 시군: ${contextInput.selectedRegion}`);
    }
    if (contextInput?.activeFilters) {
        const filterEntries = Object.entries(contextInput.activeFilters)
            .filter(([, v]) => v !== null && v !== undefined)
            .map(([k, v]) => `  ${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
        if (filterEntries.length) runtimeLines.push(`활성 필터:\n${filterEntries.join("\n")}`);
    }
    if (runtimeLines.length) {
        lines.push(`\n[현재 실제 상태]\n${runtimeLines.join("\n")}`);
    }

    return lines.join("\n");
}

// ─── Base prompt sections (세나가 직접 수정 가능한 섹션) ────────────

export const PROMPT_SECTION_IDS = [
    "identity",
    "user-context",
    "sectors",
    "proactive-role",
    "operation-principles",
    "response-format",
    "data-analysis",
] as const;

export type PromptSectionId = typeof PROMPT_SECTION_IDS[number];

export const DEFAULT_SECTIONS: Record<PromptSectionId, string> = {
    "identity":
        `당신의 이름은 노마(NOMA, NOde Management Assistant)입니다.
경상남도 광역지원기관 노인맞춤돌봄서비스 통합관리시스템의 책임 AI 컨트롤러이자 선임 분석가입니다.
단순한 데이터 조회를 넘어 비판적 사고, 적극적인 데이터 교차 분석, 문제 해결 통찰력을 제공합니다.`,

    "user-context":
        `## 사용자 및 운영 체계 이해

**사용자 역할**
- 경상남도 광역지원기관 담당자 및 팀원
- 노인맞춤돌봄서비스 전체 사업을 이 시스템으로 통합 운영하고 고도화하는 것이 목표
- 현재: 광역지원기관 내부 팀원용 / 향후: QnA 기능을 수행기관 사회복지사에게 공개 예정

**사업 운영 체계**
- 경상남도 광역지원기관 → 18개 시군 → 59개 수행기관 → 이용자(취약 노인)
- 광역: 배정인원 결정, 예산 배분, 전체 모니터링, 지침 수립
- 수행기관: 실제 서비스 제공, 월별 현황 보고, 인력·이용자 관리
- 이용자: 독거노인 등 취약계층, 기후특보·재난 발생 시 우선 보호 대상

**핵심 업무 흐름**
- 매월: 수행기관 현황 제출 → 광역 검토 → 미제출 기관 독촉
- 비정기: 기후특보·재난 발생 → 취약 지역 수행기관 긴급 점검
- 연간: 배정인원 조정, 성과 평가, 사업지침 개정 → QnA 반영`,

    "sectors":
        `## 노마의 5개 섹터

1. 돌봄현황 — 경남 18개 시군 수행기관별 종사자·이용자·제출 현황
2. 복지자원 — 시군별 돌봄 인프라, 사회복지사·생활지원사 배치 현황
3. 기후대응 — 한파·폭염 특보 현황 및 취약 지역 분석
4. 자연재난 — 태풍·홍수·지진·산사태 위험 현황
5. Q&A — 수행기관 사회복지사의 질문 및 공문 답변 관리`,

    "proactive-role":
        `## 주도적 및 비판적 제안 역할 (핵심)

노마는 질문에 답하는 것을 넘어, 데이터에서 발견한 문제와 기회를 **비판적인 시각으로 먼저 논의**해야 합니다.

**즉시 경보해야 할 상황**
- 미제출 기관 발견 시: 기관명·담당자 연락처 포함하여 ⚠️ 즉시 경보
- 제출률 전월 대비 10% 이상 하락 시: 원인 추정과 함께 알림
- 기후특보 발령 지역 × 취약 수행기관(이용자 많고 인력 적음) 교차 발견 시: 선제 경보

**비판적 사고 및 제안 영역**
- 논의의 방향이 올바른지 검토하고 더 나은 방향을 제시합니다.
- 담당자가 놓쳤거나 간과한 데이터 간의 모순, 쟁점, 리스크를 지적합니다.
- 담당자가 수동으로 반복하는 업무를 자동화하도록 제안합니다.

**제안 형식 (반드시 준수)**
[💡 노마 인사이트]
- 문제/쟁점: 발견한 이상 또는 논의할 쟁점
- 근거: 관련 데이터 수치
- 제안: 구체적 권고 또는 시스템 수정 제안`,

    "operation-principles":
        `## 운영 원칙 및 행동 지침

- 현재 시스템에 로드된 실제 데이터를 기반으로 정확히 답변하세요. 데이터에 없는 내용은 "현재 데이터에서 확인되지 않습니다"라고 명확히 안내합니다.
- 오류 지적 시 변명 금지: 틀린 응답을 지적받았을 때 변명하지 않습니다. 틀렸으면 명확히 인정하고, 무엇이 왜 틀렸는지 짧게 설명한 뒤 올바른 응답으로 교정합니다.
- 미확인 사실 단정 금지: 직접 조작/확인하지 않은 상태(배포 결과, 실행 등)를 "완료됐습니다"라고 단정하지 말고 "화면에서 확인이 필요합니다"로 표현합니다.
- 자가학습 오설명 금지: "스스로 자가 학습한다"고 말하지 마세요. 대화 이력과 지침에 따라 행동할 뿐입니다.
- 기능 파악: 사용자가 시스템의 특정 기능 존재 여부나 사용법을 물어보면 능숙하게 안내합니다.`,

    "response-format":
        `## 응답 형식 지침 (항상 마크다운 사용)

- **데이터 분석 질문**: 1. 표(필수) → 2. 핵심 인사이트 → 3. 주의 필요 지역 명시
- **이상 패턴 발견 시**: ⚠️ **주의**: 문제 상황 / 원인 지적 / 해결 방안
- **일반 대화**: 항상 선임 분석가답게 명확하고 논리정연한 말투를 사용합니다.
- **교차 분석 질문**: 섹터 간 융합 결과(예: 재난 지역의 돌봄 인력 부족)를 인과관계 중심으로 서술합니다.
- 수치는 항상 구체적(증감, 순위 등)으로 제시하세요.`,

    "data-analysis":
        `## 데이터 분석 심화 지침 (비판적 분석)

**재난 데이터 ↔ 수행기관 운영 연계 해석**
- 자연재난(태풍·홍수·지진 등) 데이터를 분석할 때는 단순 통계 발표에서 끝나서는 절대 안 됩니다. 반드시 해당 시군의 수행기관 현황(돌봄 인력, 취약계층 수)과 교차 분석하여 "돌봄 서비스 공백 리스크"를 제기해야 합니다.

**집계 기준 선확인 및 출처 명확화**
- 수치를 인용하기 전 집계 기준(기간, 단위)을 명시하세요.
- 동일한 이름의 데이터라도 출처가 다르면 명확히 구분하세요. (예: 배정인원은 ① 광역 지원기관이 시스템에 배정한 값, ② 수행기관이 문서로 제출한 값 중 어떤 것인지 구별 필수)

**이상값 발견 시 데이터 품질 의심**
- 지진 0건, 제출률 0%, 이용자 급증 등 통계적으로 의심되는 이상치가 발견되면 ⚠️ **데이터 품질 주의** 경보를 가장 먼저 알리세요.`,
};

// ─── Main builder ──────────────────────────────────────────────

export function buildSystemPrompt(
    careStats: Map<string, RegionStats>,
    climateStats: Map<string, ClimateRegionStats>,
    disasterStats: Map<string, DisasterRegionStats>,
    careStatusByRegion?: RegionCareStatus[],
    contextInput?: AiContextInput,
    surveys?: SurveyData[],
    patches?: PromptPatch[],
    isExtended?: boolean,
    promptSections?: Record<string, string>
): string {
    const tab = contextInput?.activeTab ?? "care";
    const sec = (id: PromptSectionId): string => promptSections?.[id] ?? DEFAULT_SECTIONS[id];

    const basePrompt = [
        sec("identity"),
        sec("user-context"),
        sec("sectors"),
        sec("proactive-role"),
        sec("operation-principles"),
        sec("response-format"),
    ].join("\n\n");

    const sections: string[] = [basePrompt];

    // ① UI 명세 — 항상 현재 탭만
    sections.push(buildUIContextSection(tab, contextInput));

    // ② 데이터 섹션 — 기본(탭별) vs 확장(전체)
    if (!isExtended) {
        // 기본 컨텍스트: 현재 탭 데이터만
        switch (tab) {
            case "care":
                sections.push("## 돌봄 현황 데이터 (시군별)");
                sections.push(buildCareTable(careStats));
                sections.push(buildCareDetailContext(careStats));
                if (surveys && surveys.length > 0 && contextInput?.selectedRegion) {
                    const filteredSurveys = surveys.filter(
                        (s) => s.시군 === contextInput.selectedRegion
                    );
                    if (filteredSurveys.length > 0) {
                        sections.push(`## 개별 기관 현황 데이터 (${contextInput.selectedRegion})`);
                        sections.push(buildOrganizationContext(filteredSurveys));
                    }
                }
                break;
            case "welfare":
                if (careStatusByRegion?.length) {
                    sections.push("## 복지자원 현황 (시군별 돌봄 인프라)");
                    sections.push(buildWelfareContext(careStatusByRegion));
                }
                break;
            case "climate":
                sections.push("## 기후 특보 데이터 (시군별 누적)");
                sections.push(buildClimateTable(climateStats));
                if (contextInput?.climateAlerts?.length) {
                    sections.push(`## 현재 활성 기상특보 시군\n${contextInput.climateAlerts.join(", ")}`);
                }
                break;
            case "disaster":
                sections.push("## 자연재난 데이터 (시군별 누적)");
                sections.push(buildDisasterTable(disasterStats));
                if (contextInput?.disasterAlerts?.length) {
                    sections.push(`## 현재 활성 재난 시군\n${contextInput.disasterAlerts.join(", ")}`);
                }
                break;
            case "qna":
                // QnA 탭: 데이터 테이블 불필요 (UI 명세 + 운영 원칙으로 충분)
                break;
        }
    } else {
        // 확장 컨텍스트: 전체 섹터 데이터 + 행동 이력
        sections.push("## 돌봄 현황 데이터 (시군별)");
        sections.push(buildCareTable(careStats));
        sections.push(buildCareDetailContext(careStats));

        if (careStatusByRegion?.length) {
            sections.push("## 복지자원 현황 (시군별 돌봄 인프라)");
            sections.push(buildWelfareContext(careStatusByRegion));
        }

        sections.push("## 기후 특보 데이터 (시군별 누적)");
        sections.push(buildClimateTable(climateStats));

        sections.push("## 자연재난 데이터 (시군별 누적)");
        sections.push(buildDisasterTable(disasterStats));

        if (contextInput?.climateAlerts?.length) {
            sections.push(`## 현재 활성 기상특보 시군\n${contextInput.climateAlerts.join(", ")}`);
        }
        if (contextInput?.disasterAlerts?.length) {
            sections.push(`## 현재 활성 재난 시군\n${contextInput.disasterAlerts.join(", ")}`);
        }

        if (surveys && surveys.length > 0 && contextInput?.selectedRegion) {
            const filteredSurveys = surveys.filter(
                (s) => s.시군 === contextInput.selectedRegion
            );
            if (filteredSurveys.length > 0) {
                sections.push(`## 개별 기관 현황 데이터 (${contextInput.selectedRegion})`);
                sections.push(buildOrganizationContext(filteredSurveys));
            }
        }

        if (contextInput?.actionHistory?.length) {
            const historyLines = contextInput.actionHistory
                .slice(-3)
                .map((a, i) => `${i + 1}. ${a}`)
                .join("\n");
            sections.push(`## 최근 사용자 행동 이력\n${historyLines}`);
        }
    }

    // ③ 시스템 구성 안내 (항상 포함)
    sections.push(`## 현재 시스템 구성 (노마가 파악하고 있는 시스템 현황)

구현된 기능:
- 경남 18개 시군 돌봄현황 월별 통계 시각화 (제출률, 종사자·이용자 현황)
- 복지자원 인프라 시군별 현황 (요양시설, 돌봄 인프라)
- 기후대응: 한파·폭염 특보 이력 분석 및 지역별 비교
- 자연재난: 태풍·홍수·지진·산사태 이력 분석
- QnA 시스템: 질문 등록→AI 초안 생성(RAG+Gemini)→관리자 승인→답변 전달
- 지식베이스: 사업지침·매뉴얼·규정 문서 RAG 임베딩 검색
- 노마: 대화 이력 저장, 개별 기관 데이터 조회
- 통찰 및 관리 도구: 시스템 기록(액션/결정) 등록, 프롬프트 업데이트, 코드 작업 요청

미구현 / 고도화 가능 영역 (노마가 필요 시 우선순위와 함께 제안):
- 미제출 기관 자동 알림 및 독촉 기능
- 월별 추이 이상값 자동 탐지·경보
- 기관별 성과 비교 리포트 자동 생성`);

    sections.push(`분析 시 주의사항:
- 데이터에 없는 내용은 추측하지 마세요
- 여러 분야를 교차 분석하는 복합 질문에 적극 대응하세요
- 수치를 비교할 때는 표 형태로 정리하세요
- 현재 사용자가 보고 있는 탭: ${getTabLabel(tab)}
- 확장 컨텍스트 모드: ${isExtended ? "활성화 (전체 섹터 데이터 포함)" : "기본 (현재 탭 데이터만)"}`);

    sections.push(sec("data-analysis"));

    // ④ 행동 지침 패치 — 항상 마지막 (최고 우선순위)
    if (patches && patches.length > 0) {
        const patchText = patches
            .map((p) => `### ${p.title}\n${p.content}`)
            .join("\n\n");
        sections.push(`## 🔧 영구 행동 지침 패치 (자동 반영, 반드시 준수할 것)\n\n${patchText}`);
    }

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
        "| 시군 | 기관수 | 사회복지사 | 돌봄제공인력 | 서비스 이용자 | 1인당 담당 |";
    const sep =
        "|------|--------|-----------|-------------|--------------|-----------|";
    const rows: string[] = [];

    for (const s of statuses) {
        const overload = s.staffPerUser >= 17 ? " ⚠" : "";
        rows.push(
            `| ${s.sigun} | ${s.agencyCount} | ${s.socialWorkers} | ${s.careProviders} | ${s.users} | ${s.staffPerUser}${overload} |`
        );
    }

    return [header, sep, ...rows].join("\n");
}

// ─── Table builders ────────────────────────────────────────

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

function buildOrganizationContext(surveys: SurveyData[]): string {
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
            (s.종결자_남_사망 || 0) + (s.종결자_남_서비스거부 || 0) + (s.종결자_남_기타 || 0) +
            (s.종결자_여_사망 || 0) + (s.종결자_여_서비스거부 || 0) + (s.종결자_여_기타 || 0);

        lines.push(
            `[${s.시군}] ${s.기관명} (${s.기관코드})` +
            ` | 전담SW ${sw}명(남${s.전담사회복지사_남}/여${s.전담사회복지사_여})` +
            ` 생활지원사 ${cg}명(남${s.생활지원사_남}/여${s.생활지원사_여})` +
            ` | 이용자 ${users}명(일반남${s.일반중점_남_일반}/일반여${s.일반중점_여_일반}/중점남${s.일반중점_남_중점}/중점여${s.일반중점_여_중점}/특화남${s.특화_남}/특화여${s.특화_여})` +
            ` | 신규 ${newUsers}명 종결 ${termUsers}명` +
            ` | 배정(SW${s.배정_전담사회복지사 || 0}/생활지원사${s.배정_생활지원사 || 0}/이용자${s.배정_이용자 || 0})` +
            ` | 담당자 ${s.담당자_이름} ${s.담당자_연락처}` +
            ` | 제출 ${s.제출일시 ? s.제출일시.slice(0, 10) : "미제출"}`
        );
    }

    return lines.join("\n");
}
