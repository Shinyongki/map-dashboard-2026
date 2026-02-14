
// Survey Data Interface matching the backend
export interface SurveyData {
    제출일시: string;
    시군: string;
    기관명: string;
    기관코드: string;
    담당자_이름: string;
    담당자_연락처: string;
    전담사회복지사_남: number;
    전담사회복지사_여: number;
    생활지원사_남: number;
    생활지원사_여: number;
    단기_전담인력_사회복지사_남: number;
    단기_전담인력_사회복지사_여: number;
    단기_전담인력_돌봄제공인력_남: number;
    단기_전담인력_돌봄제공인력_여: number;
    일반중점_남_일반: number;
    일반중점_남_중점: number;
    일반중점_여_일반: number;
    일반중점_여_중점: number;
    단기_남: number;
    단기_여: number;
    단기_기본_1개월: number;
    단기_연장_2개월: number;
    단기_기타: number;
    단기_당월신규: number;
    단기_당월신규_남: number;
    단기_당월신규_여: number;
    단기_기간만료: number;
    단기_중도포기: number;
    단기_기간만료_남?: number;
    단기_기간만료_여?: number;
    단기_중도포기_남?: number;
    단기_중도포기_여?: number;
    특화_남: number;
    특화_여: number;
    신규대상자_남: number;
    신규대상자_여: number;
    배정_전담사회복지사: number;
    배정_생활지원사: number;
    배정_이용자: number;
    변경여부: string;
    변경_전담사회복지사?: number;
    변경_생활지원사?: number;
    거점수행기관여부?: boolean; // Added field
    변경_이용자?: number;
    변경일자?: string;
    종결자_남_사망?: number;
    종결자_남_서비스거부?: number;
    종결자_남_기타?: number;
    종결자_여_사망?: number;
    종결자_여_서비스거부?: number;
    종결자_여_기타?: number;
}

export const validateSurveyData = (row: any) => {
    const errors: Record<string, string> = {};

    // 1. 배정 인원 준수
    const currentSocial = (row.전담사회복지사_남 || 0) + (row.전담사회복지사_여 || 0);
    const assignedSocial = row.배정_전담사회복지사 || 0;
    if (assignedSocial > 0 && currentSocial > assignedSocial) {
        const msg = `배정 인원(${assignedSocial}명)을 초과했습니다.`;
        errors['전담사회복지사_남'] = msg;
        errors['전담사회복지사_여'] = msg;
    }

    const currentLife = (row.생활지원사_남 || 0) + (row.생활지원사_여 || 0);
    const assignedLife = row.배정_생활지원사 || 0;
    if (assignedLife > 0 && currentLife > assignedLife) {
        const msg = `배정 인원(${assignedLife}명)을 초과했습니다.`;
        errors['생활지원사_남'] = msg;
        errors['생활지원사_여'] = msg;
    }

    // 2. 특화 서비스 부분집합 (성별 구분 체크)
    const genM = (row.일반중점_남_일반 || 0) + (row.일반중점_남_중점 || 0);
    const genF = (row.일반중점_여_일반 || 0) + (row.일반중점_여_중점 || 0);
    const specialM = row.특화_남 || 0;
    const specialF = row.특화_여 || 0;

    if (specialM > genM) {
        errors['특화_남'] = `특화(남) ${specialM}명이 일반/중점(남) 전체 ${genM}명보다 많습니다.`;
    }
    if (specialF > genF) {
        errors['특화_여'] = `특화(여) ${specialF}명이 일반/중점(여) 전체 ${genF}명보다 많습니다.`;
    }

    // 3. 신규 대상자 부분집합 (성별 구분 체크)
    const newM = row.신규대상자_남 || 0;
    const newF = row.신규대상자_여 || 0;

    if (newM > genM) {
        errors['신규대상자_남'] = `신규 합계(남) ${newM}명이 일반/중점(남) 전체 ${genM}명보다 많습니다.`;
    }
    if (newF > genF) {
        errors['신규대상자_여'] = `신규 합계(여) ${newF}명이 일반/중점(여) 전체 ${genF}명보다 많습니다.`;
    }

    // 4. 거점 수행기관 데이터
    if (!row.거점수행기관여부) {
        const shortTermStaff = (row.단기_전담인력_사회복지사_남 || 0) + (row.단기_전담인력_사회복지사_여 || 0) +
            (row.단기_전담인력_돌봄제공인력_남 || 0) + (row.단기_전담인력_돌봄제공인력_여 || 0);
        if (shortTermStaff > 0) {
            const msg = "거점 수행기관이 아닌 경우 인력을 입력할 수 없습니다.";
            errors['단기_전담인력_사회복지사_남'] = msg;
            errors['단기_전담인력_사회복지사_여'] = msg;
            errors['단기_전담인력_돌봄제공인력_남'] = msg;
            errors['단기_전담인력_돌봄제공인력_여'] = msg;
        }
    }

    // 5. 단기 이용자 정합성
    const shortTermM = row.단기_남 || 0;
    const shortTermF = row.단기_여 || 0;
    const shortTermTotal = shortTermM + shortTermF;
    const shortTermDuration = (row.단기_기본_1개월 || 0) + (row.단기_연장_2개월 || 0) + (row.단기_기타 || 0);

    if (shortTermTotal !== shortTermDuration) {
        const msg = `이용자 합계(${shortTermTotal}명)와 이용기간별 합계(${shortTermDuration}명)가 일치하지 않습니다.`;
        errors['단기_남'] = msg;
        errors['단기_여'] = msg;
        errors['단기_기본_1개월'] = msg;
        errors['단기_연장_2개월'] = msg;
        errors['단기_기타'] = msg;
    }

    // 6. 단기 신규 이용자 정합성 (성별 구분)
    const shortNewM = row.단기_당월신규_남 || 0;
    const shortNewF = row.단기_당월신규_여 || 0;

    if (shortNewM > shortTermM) {
        errors['단기_당월신규_남'] = `단기 신규(남) ${shortNewM}명이 단기(남) 전체 ${shortTermM}명보다 많습니다.`;
    }
    if (shortNewF > shortTermF) {
        errors['단기_당월신규_여'] = `단기 신규(여) ${shortNewF}명이 단기(여) 전체 ${shortTermF}명보다 많습니다.`;
    }

    return errors;
};
