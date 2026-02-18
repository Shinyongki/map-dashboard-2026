export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export type DashboardTab = "care" | "welfare" | "climate" | "disaster" | "qna";

export interface AiContextInput {
    activeTab: DashboardTab;
    selectedRegion?: string;
    climateAlerts?: string[];
    disasterAlerts?: string[];
}
