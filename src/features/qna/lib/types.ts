export type QuestionCategory =
  | "사업지침"
  | "행정절차"
  | "프로그램운영"
  | "서식작성"
  | "기타";

export type QuestionStatus = "pending" | "ai_draft" | "answered" | "closed";

export type UserRole = "user" | "admin";

export interface Question {
  id: string;
  title: string;
  content: string;
  category: QuestionCategory;
  relatedDocumentId?: string;
  authorName: string;
  authorOrg: string;
  authorOrgName: string;
  status: QuestionStatus;
  aiDraftAnswer?: string;
  finalAnswer?: string;
  answeredBy?: string;
  answeredAt?: any;
  createdAt: any;
  isPublic: boolean;
}

export interface OfficialDocument {
  id: string;
  title: string;
  documentNumber: string;
  content: string;
  fileUrl: string;
  uploadedAt: any;
  uploadedBy: string;
  validUntil?: string;
}

export interface UserSession {
  orgCode: string;
  name: string;
  orgName: string;
  role: UserRole;
  region: string;
  isHub: boolean;
}

export const QUESTION_CATEGORIES: QuestionCategory[] = [
  "사업지침",
  "행정절차",
  "프로그램운영",
  "서식작성",
  "기타",
];

export const STATUS_LABELS: Record<QuestionStatus, string> = {
  pending: "대기중",
  ai_draft: "AI 초안 생성됨",
  answered: "답변완료",
  closed: "종료",
};
