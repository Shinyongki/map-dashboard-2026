
export interface FeedbackItem {
    id: string;
    type: 'typo' | 'missing' | 'compliance' | 'suggestion';
    location: string; // e.g., "Line 3", "Header"
    original: string;
    suggestion: string;
    reason: string;
}

export interface DocumentAnalysisResult {
    ocrText: string;
    feedback: FeedbackItem[];
    score: number; // 0-100
}

const MOCK_OCR_TEXT = `
[공문] 2026년도 노인복지사업 운영 지침 안내

수신: 각 시·군·구청장 및 관내 노인복지시설장
참조: 사회복지과장

1. 귀 기관의 무궁한 발전을 기원합니다.
2. 2026년도 노인복지사업 안네 사항을 다음과 같이 전달하오니 업무에 참고하시기 바랍니다.

  가. 주요 변경 사항
    - 경로당 냉난방비 지원금 인상: 월 35만원 -> 월 40만원
    - 노인일자리 사업 참여자 모집 기간 연장: ~ 2.20.(금)까지

  나. 협조 사항
    - 각 시설에서는 변경된 지침을 숙지하여 운영에 만전을 기해 주시기 바람니다.
    - 붙임 문서를 참고하여 사업 계획서를 2.22.(화)까지 제출하여 주십시요.

붙임 2026년도_노인복지사업_안내서.hwpx 1부.  끝.
`;

const MOCK_FEEDBACK: FeedbackItem[] = [
    {
        id: 'f1',
        type: 'typo',
        location: '본문 2항',
        original: '안네',
        suggestion: '안내',
        reason: '표준어 표기 오류입니다.'
    },
    {
        id: 'f2',
        type: 'typo',
        location: '나. 협조 사항',
        original: '바람니다',
        suggestion: '바랍니다',
        reason: '맞춤법 오류입니다.'
    },
    {
        id: 'f3',
        type: 'typo',
        location: '나. 협조 사항',
        original: '주십시요',
        suggestion: '주십시오',
        reason: '종결 어미의 활용이 잘못되었습니다.'
    },
    {
        id: 'f4',
        type: 'missing',
        location: '결재선',
        original: '(누락)',
        suggestion: '담당 - 팀장 - 과장',
        reason: '공문에는 반드시 결재라인이 포함되어야 합니다.'
    },
    {
        id: 'f5',
        type: 'compliance',
        location: '수신자',
        original: '시·군·구청장',
        suggestion: '명확한 수신처 지정 권장',
        reason: '수신처가 광범위합니다. 필요 시 담당 부서를 병기해주세요.'
    }
];

export async function analyzeDocument(file: File): Promise<DocumentAnalysisResult> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                ocrText: MOCK_OCR_TEXT,
                feedback: MOCK_FEEDBACK,
                score: 85
            });
        }, 2500); // Simulate 2.5s processing time
    });
}
