import { Sparkles, Lightbulb } from "lucide-react";
import type { DashboardTab } from "../lib/ai-types";

const TAB_SUGGESTIONS: Record<DashboardTab, string[]> = {
    care: [
        "이번 달 미제출 기관이 있나요?",
        "종사자 부족 시군이 어디인가요?",
        "돌봄 종사자 대비 이용자 비율이 높은 지역은?",
        "18개 시군의 돌봄 제출률을 비교해주세요",
    ],
    welfare: [
        "창원시 요양시설 목록을 알려주세요",
        "단기집중서비스 연계 경로는?",
        "시군별 돌봄 인프라 현황을 알려주세요",
        "독거노인 대비 종사자 비율이 낮은 지역은?",
    ],
    climate: [
        "현재 특보 발령 지역 돌봄 현황은?",
        "폭염 시 우선 확인해야 할 지역은?",
        "한파 경보가 가장 많은 지역과 돌봄 현황을 분석해주세요",
        "2024년 폭염과 한파가 동시에 많았던 지역은?",
    ],
    disaster: [
        "현재 재난 발령 지역 현황은?",
        "태풍 피해가 가장 많은 지역은 어디인가요?",
        "남해안 지역의 재난 위험도와 돌봄 현황을 분석해주세요",
        "산사태 위험이 높은 시군의 돌봄 인프라는?",
    ],
    qna: [
        "미답변 질문이 몇 건인가요?",
        "최근 공문 현황을 요약해주세요",
        "가장 자주 묻는 질문 유형은?",
        "산청군의 기후 및 재난 현황을 요약해주세요",
    ],
};

const IMPROVEMENT_PROMPT =
    "현재 시스템 데이터와 운영 현황을 분석해서 가장 시급한 시스템 개선 제안 3가지를 [💡 개선 제안] 형식으로 구체적으로 제시해줘";

interface SuggestedQuestionsProps {
    onSelect: (question: string) => void;
    activeTab?: DashboardTab;
}

export default function SuggestedQuestions({
    onSelect,
    activeTab = "care",
}: SuggestedQuestionsProps) {
    const suggestions = TAB_SUGGESTIONS[activeTab] ?? TAB_SUGGESTIONS.care;

    return (
        <div className="flex flex-col items-center justify-center py-6 px-4">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <h2 className="text-base font-semibold text-gray-700">무엇이든 물어보세요</h2>
            </div>
            <p className="text-xs text-gray-500 mb-5 text-center max-w-sm">
                돌봄현황, 복지자원, 기후대응, 자연재난 데이터를
                기반으로 노마가 복합 분석 답변을 제공합니다.
            </p>

            {/* 일반 제안 질문 */}
            <div className="grid grid-cols-1 gap-2 w-full mb-4">
                {suggestions.map((q) => (
                    <button
                        key={q}
                        onClick={() => onSelect(q)}
                        className="text-left px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 transition-colors text-xs text-gray-700"
                    >
                        {q}
                    </button>
                ))}
            </div>

            {/* 시스템 개선 제안 버튼 */}
            <button
                onClick={() => onSelect(IMPROVEMENT_PROMPT)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 transition-colors text-xs text-amber-800 font-medium"
            >
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                노마에게 시스템 개선 제안 받기
            </button>
        </div>
    );
}
