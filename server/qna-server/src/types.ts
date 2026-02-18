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
  answeredAt?: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  isPublic: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  status: "대기" | "승인" | "반려";
  approvedAt?: string;
  approvedBy?: string;
}

export interface OfficialDocument {
  id: string;
  title: string;
  documentNumber: string;
  content: string;
  fileUrl: string;
  uploadedAt: FirebaseFirestore.Timestamp;
  uploadedBy: string;
  summary?: string;
  targetType?: "전체" | "거점" | "일반";
  validUntil?: string;
  faqStatus?: "대기" | "승인" | "비공개";
  faqItems?: FaqItem[];
  managerName?: string;
  managerPhone?: string;
}

export interface UserSession {
  orgCode: string;
  name: string;
  orgName: string;
  role: UserRole;
  region: string;
  isHub: boolean;
}

export interface JwtPayload {
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
