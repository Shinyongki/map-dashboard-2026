import { Sparkles } from "lucide-react";

const SUGGESTIONS = [
    "경남에서 태풍 피해가 가장 많은 지역은 어디인가요?",
    "2024년 폭염과 호우가 동시에 많았던 지역을 분석해주세요",
    "돌봄 종사자 대비 이용자 비율이 높은 지역의 재난 위험도는?",
    "산청군의 기후 및 재난 현황을 요약해주세요",
    "18개 시군의 돌봄 제출률을 비교해주세요",
    "한파 경보가 가장 많은 지역과 돌봄 현황을 분석해주세요",
];

interface SuggestedQuestionsProps {
    onSelect: (question: string) => void;
}

export default function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-6 w-6 text-purple-500" />
                <h2 className="text-lg font-semibold text-gray-700">
                    무엇이든 물어보세요
                </h2>
            </div>
            <p className="text-sm text-gray-500 mb-8 text-center max-w-md">
                돌봄현황, 기후대응, 자연재난 데이터를 기반으로 AI가 복합 분석 답변을 제공합니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                {SUGGESTIONS.map((q) => (
                    <button
                        key={q}
                        onClick={() => onSelect(q)}
                        className="text-left px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 transition-colors text-sm text-gray-700"
                    >
                        {q}
                    </button>
                ))}
            </div>
        </div>
    );
}
