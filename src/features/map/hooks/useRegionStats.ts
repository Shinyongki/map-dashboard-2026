import { useMemo } from "react";
import { getOrganizationsByRegion } from "@/lib/organization-data";
import type { SurveyData } from "@/lib/validation";
import type { RegionStats, InstitutionStatus, InstitutionDetail } from "../lib/map-types";

const REGIONS = [
  "창원시", "진주시", "통영시", "사천시", "김해시", "밀양시", "거제시", "양산시",
  "의령군", "함안군", "창녕군", "고성군", "남해군", "하동군", "산청군", "함양군", "거창군", "합천군",
];

function emptyRegionStats(region: string, totalOrgs: number): RegionStats {
  return {
    region, submissions: 0, totalOrganizations: totalOrgs, submissionRate: 0,
    sw_m: 0, sw_f: 0, cg_m: 0, cg_f: 0,
    short_sw_m: 0, short_sw_f: 0, short_cg_m: 0, short_cg_f: 0,
    gen_m_gen: 0, gen_f_gen: 0, gen_m_int: 0, gen_f_int: 0,
    special_m: 0, special_f: 0,
    short_m: 0, short_f: 0, short_1month: 0, short_2month: 0, short_etc: 0,
    new_m: 0, new_f: 0, short_new_m: 0, short_new_f: 0,
    term_m_death: 0, term_m_refuse: 0, term_m_etc: 0,
    term_f_death: 0, term_f_refuse: 0, term_f_etc: 0,
    short_expired: 0, short_withdrawn: 0,
    assigned_sw: 0, assigned_cg: 0, assigned_users: 0,
  };
}

export function useRegionStats(surveys: SurveyData[] | undefined) {
  const regionStatsMap = useMemo(() => {
    const map = new Map<string, RegionStats>();

    REGIONS.forEach((region) => {
      map.set(region, emptyRegionStats(region, getOrganizationsByRegion(region).length));
    });

    if (!surveys) return map;

    surveys.forEach((s) => {
      const r = map.get(s.시군);
      if (!r) return;
      r.submissions++;
      // 종사자
      r.sw_m += s.전담사회복지사_남 || 0;
      r.sw_f += s.전담사회복지사_여 || 0;
      r.cg_m += s.생활지원사_남 || 0;
      r.cg_f += s.생활지원사_여 || 0;
      r.short_sw_m += s.단기_전담인력_사회복지사_남 || 0;
      r.short_sw_f += s.단기_전담인력_사회복지사_여 || 0;
      r.short_cg_m += s.단기_전담인력_돌봄제공인력_남 || 0;
      r.short_cg_f += s.단기_전담인력_돌봄제공인력_여 || 0;
      // 이용자
      r.gen_m_gen += s.일반중점_남_일반 || 0;
      r.gen_f_gen += s.일반중점_여_일반 || 0;
      r.gen_m_int += s.일반중점_남_중점 || 0;
      r.gen_f_int += s.일반중점_여_중점 || 0;
      r.special_m += s.특화_남 || 0;
      r.special_f += s.특화_여 || 0;
      // 단기
      r.short_m += s.단기_남 || 0;
      r.short_f += s.단기_여 || 0;
      r.short_1month += s.단기_기본_1개월 || 0;
      r.short_2month += s.단기_연장_2개월 || 0;
      r.short_etc += s.단기_기타 || 0;
      // 신규
      r.new_m += s.신규대상자_남 || 0;
      r.new_f += s.신규대상자_여 || 0;
      r.short_new_m += s.단기_당월신규_남 || 0;
      r.short_new_f += s.단기_당월신규_여 || 0;
      // 종결자
      r.term_m_death += s.종결자_남_사망 || 0;
      r.term_m_refuse += s.종결자_남_서비스거부 || 0;
      r.term_m_etc += s.종결자_남_기타 || 0;
      r.term_f_death += s.종결자_여_사망 || 0;
      r.term_f_refuse += s.종결자_여_서비스거부 || 0;
      r.term_f_etc += s.종결자_여_기타 || 0;
      // 단기 종결
      r.short_expired += (s.단기_기간만료_남 || 0) + (s.단기_기간만료_여 || 0) || s.단기_기간만료 || 0;
      r.short_withdrawn += (s.단기_중도포기_남 || 0) + (s.단기_중도포기_여 || 0) || s.단기_중도포기 || 0;
      // 배정
      r.assigned_sw += s.배정_전담사회복지사 || 0;
      r.assigned_cg += s.배정_생활지원사 || 0;
      r.assigned_users += s.배정_이용자 || 0;

      // 거점기관 명칭 저장
      if (s.거점수행기관여부) {
        r.baseInstitutionName = s.기관명;
      }
    });

    map.forEach((stats) => {
      stats.submissionRate =
        stats.totalOrganizations > 0
          ? Math.round((stats.submissions / stats.totalOrganizations) * 100)
          : 0;
    });

    return map;
  }, [surveys]);

  const totalStats = useMemo(() => {
    let totalSubmissions = 0;
    let totalOrgs = 0;
    regionStatsMap.forEach((s) => {
      totalSubmissions += s.submissions;
      totalOrgs += s.totalOrganizations;
    });
    return {
      submissions: totalSubmissions,
      totalOrganizations: totalOrgs,
      submissionRate: totalOrgs > 0 ? Math.round((totalSubmissions / totalOrgs) * 100) : 0,
    };
  }, [regionStatsMap]);

  return { regionStatsMap, totalStats, regions: REGIONS };
}

// 특정 시군의 기관별 제출 여부
export function getInstitutionStatuses(
  region: string,
  surveys: SurveyData[] | undefined
): InstitutionStatus[] {
  const orgs = getOrganizationsByRegion(region);
  const submittedCodes = new Map(
    (surveys || []).filter((s) => s.시군 === region).map((s) => [s.기관코드, s.거점수행기관여부])
  );

  return orgs.map((org) => ({
    name: org.기관명,
    code: org.기관코드,
    submitted: submittedCodes.has(org.기관코드),
    isBase: submittedCodes.get(org.기관코드) || false,
  }));
}

// 특정 기관의 상세 정보
export function getInstitutionDetail(
  code: string,
  surveys: SurveyData[] | undefined
): InstitutionDetail | null {
  const s = (surveys || []).find((s) => s.기관코드 === code);
  if (!s) return null;
  return {
    기관명: s.기관명,
    기관코드: s.기관코드,
    시군: s.시군,
    제출일시: s.제출일시,
    담당자_이름: s.담당자_이름,
    담당자_연락처: s.담당자_연락처,
    거점수행기관여부: s.거점수행기관여부 || false,
    전담사회복지사_남: s.전담사회복지사_남 || 0,
    전담사회복지사_여: s.전담사회복지사_여 || 0,
    생활지원사_남: s.생활지원사_남 || 0,
    생활지원사_여: s.생활지원사_여 || 0,
    단기_전담인력_사회복지사_남: s.단기_전담인력_사회복지사_남 || 0,
    단기_전담인력_사회복지사_여: s.단기_전담인력_사회복지사_여 || 0,
    단기_전담인력_돌봄제공인력_남: s.단기_전담인력_돌봄제공인력_남 || 0,
    단기_전담인력_돌봄제공인력_여: s.단기_전담인력_돌봄제공인력_여 || 0,
    일반중점_남_일반: s.일반중점_남_일반 || 0,
    일반중점_남_중점: s.일반중점_남_중점 || 0,
    일반중점_여_일반: s.일반중점_여_일반 || 0,
    일반중점_여_중점: s.일반중점_여_중점 || 0,
    특화_남: s.특화_남 || 0,
    특화_여: s.특화_여 || 0,
    단기_남: s.단기_남 || 0,
    단기_여: s.단기_여 || 0,
    단기_기본_1개월: s.단기_기본_1개월 || 0,
    단기_연장_2개월: s.단기_연장_2개월 || 0,
    단기_기타: s.단기_기타 || 0,
    단기_당월신규_남: s.단기_당월신규_남 || 0,
    단기_당월신규_여: s.단기_당월신규_여 || 0,
    단기_기간만료: (s.단기_기간만료_남 || 0) + (s.단기_기간만료_여 || 0) || s.단기_기간만료 || 0,
    단기_중도포기: (s.단기_중도포기_남 || 0) + (s.단기_중도포기_여 || 0) || s.단기_중도포기 || 0,
    신규대상자_남: s.신규대상자_남 || 0,
    신규대상자_여: s.신규대상자_여 || 0,
    종결자_남_사망: s.종결자_남_사망 || 0,
    종결자_남_서비스거부: s.종결자_남_서비스거부 || 0,
    종결자_남_기타: s.종결자_남_기타 || 0,
    종결자_여_사망: s.종결자_여_사망 || 0,
    종결자_여_서비스거부: s.종결자_여_서비스거부 || 0,
    종결자_여_기타: s.종결자_여_기타 || 0,
    배정_전담사회복지사: s.배정_전담사회복지사 || 0,
    배정_생활지원사: s.배정_생활지원사 || 0,
    배정_이용자: s.배정_이용자 || 0,
    변경여부: s.변경여부,
    변경_전담사회복지사: s.변경_전담사회복지사,
    변경_생활지원사: s.변경_생활지원사,
    변경_이용자: s.변경_이용자,
    변경일자: s.변경일자,
  };
}
