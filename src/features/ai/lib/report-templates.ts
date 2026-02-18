
import type { SurveyData } from "@/lib/validation";

export type ReportType = "monthly" | "monitoring" | "evaluation";

export interface ReportTemplate {
    id: ReportType;
    title: string;
    description: string;
    systemPrompt: string;
    userPrompt: (data: any) => string;
}

export const REPORT_TEMPLATES: Record<ReportType, ReportTemplate> = {
    monthly: {
        id: "monthly",
        title: "월간 결과 보고서",
        description: "전체 제출 현황 및 시군별 주요 이슈 요약",
        systemPrompt: `당신은 경상남도 노인맞춤돌봄서비스 광역지원기관의 행정 전문가입니다.
주어진 데이터를 바탕으로 월간 운영 결과 보고서의 '총평' 및 '주요 이슈' 섹션을 작성해주세요.
- 문체: 개조식(bullet points)과 정중한 보고서체 사용 ('~함', '~임' 등).
- 구조:
  1. 전체 현황 요약 (제출률, 주요 수치)
  2. 시군별 특이사항 (데이터에 있는 경우만)
  3. 종합 의견 및 제언
- 데이터에 없는 내용은 절대 지어내지 마세요.`,
        userPrompt: (data: { month: string; total: number; submitted: number; unsubmitted: number; regions: string[] }) => `
[${data.month} 노인맞춤돌봄서비스 수행기관 제출 현황]
- 전체 대상: ${data.total}개소
- 제출 완료: ${data.submitted}개소
- 미제출: ${data.unsubmitted}개소
- 미제출 지역: ${data.regions.join(", ") || "없음"}

위 데이터를 바탕으로 월간 보고서 초안을 작성해주세요.`,
    },
    monitoring: {
        id: "monitoring",
        title: "현장 모니터링 결과 보고서",
        description: "방문 기록(텍스트)을 공식 모니터링 양식으로 변환",
        systemPrompt: `당신은 현장 모니터링 담당자입니다.
입력된 방문 기록 메모를 바탕으로 공식 '현장 모니터링 결과 보고서'를 작성해주세요.
- 필수 항목: 방문 일시, 기관명, 면담자, 주요 점검 사항, 지적 사항, 우수 사례, 조치 계획.
- 내용이 불충분하면 '확인 필요'로 표기하세요.`,
        userPrompt: (text: string) => `다음 방문 메모를 정리하여 결과 보고서를 작성해주세요:\n${text}`,
    },
    evaluation: {
        id: "evaluation",
        title: "기관 평가 의견서",
        description: "특정 기관의 데이터를 분석하여 평가 의견 초안 생성",
        systemPrompt: `당신은 수행기관 평가 위원입니다.
제공된 수행기관의 데이터를 분석하여 '중간 평가 의견서'를 작성해주세요.
- 강점: 수치가 높은 항목이나 긍정적 지표
- 약점: 개선이 필요한 부분
- 종합 등급 제안 (S, A, B, C) 및 근거`,
        userPrompt: (data: any) => `
기관명: ${data.name}
지역: ${data.region}
- 대상자 수: ${data.users}명 (목표 대비 ${data.achievementRate}%)
- 응급안전안심 장비 설치율: ${data.safetyGearRate}%
- 생활지원사 배정: ${data.workers}명

위 데이터를 바탕으로 평가 의견서를 작성해주세요.`,
    },
};
