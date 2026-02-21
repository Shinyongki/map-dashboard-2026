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
}
