export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    source?: "noma" | "claude"; // 3자 대화 모드에서 응답 주체
}

export type DashboardTab = "care" | "welfare" | "climate" | "disaster" | "qna";

export interface AiContextInput {
    activeTab: DashboardTab;
    selectedRegion?: string;
    climateAlerts?: string[];
    disasterAlerts?: string[];
    /** 현재 탭의 활성 필터 상태 (키=필터명, 값=현재 값) */
    activeFilters?: Record<string, string | string[] | null>;
    /** 최근 사용자 행동 이력 (확장 컨텍스트 시 포함) */
    actionHistory?: string[];
}
