export interface RegionPath {
  id: string;
  name: string;
  path: string;
  labelX: number;
  labelY: number;
}

export type MapMode = "submission" | "staff" | "user" | "new_term" | "balance" | "special" | "short_term" | "termination";
export type MapTheme = "sky" | "forest" | "infographic";

export interface RegionStats {
  region: string;
  submissions: number;
  totalOrganizations: number;
  submissionRate: number;
  baseInstitutionName?: string;
  // 종사자 (일반/중점)
  sw_m: number;
  sw_f: number;
  cg_m: number;
  cg_f: number;
  // 단기 종사자
  short_sw_m: number;
  short_sw_f: number;
  short_cg_m: number;
  short_cg_f: number;
  // 이용자 (일반/중점)
  gen_m_gen: number;
  gen_f_gen: number;
  gen_m_int: number;
  gen_f_int: number;
  // 특화서비스
  special_m: number;
  special_f: number;
  // 단기 이용자
  short_m: number;
  short_f: number;
  short_1month: number;
  short_2month: number;
  short_etc: number;
  // 신규
  new_m: number;
  new_f: number;
  short_new_m: number;
  short_new_f: number;
  // 종결자 (일반/중점)
  term_m_death: number;
  term_m_refuse: number;
  term_m_etc: number;
  term_f_death: number;
  term_f_refuse: number;
  term_f_etc: number;
  // 단기 종결
  short_expired: number;
  short_withdrawn: number;
  // 배정
  assigned_sw: number;
  assigned_cg: number;
  assigned_users: number;
}

export interface InstitutionStatus {
  name: string;
  code: string;
  submitted: boolean;
  isBase?: boolean; // 거점수행기관 여부
}

export interface InstitutionDetail {
  기관명: string;
  기관코드: string;
  시군: string;
  제출일시: string;
  담당자_이름: string;
  담당자_연락처: string;
  거점수행기관여부: boolean;
  // 종사자
  전담사회복지사_남: number;
  전담사회복지사_여: number;
  생활지원사_남: number;
  생활지원사_여: number;
  단기_전담인력_사회복지사_남: number;
  단기_전담인력_사회복지사_여: number;
  단기_전담인력_돌봄제공인력_남: number;
  단기_전담인력_돌봄제공인력_여: number;
  // 이용자
  일반중점_남_일반: number;
  일반중점_남_중점: number;
  일반중점_여_일반: number;
  일반중점_여_중점: number;
  특화_남: number;
  특화_여: number;
  // 단기
  단기_남: number;
  단기_여: number;
  단기_기본_1개월: number;
  단기_연장_2개월: number;
  단기_기타: number;
  단기_당월신규_남: number;
  단기_당월신규_여: number;
  단기_기간만료: number;
  단기_중도포기: number;
  // 신규
  신규대상자_남: number;
  신규대상자_여: number;
  // 종결자
  종결자_남_사망: number;
  종결자_남_서비스거부: number;
  종결자_남_기타: number;
  종결자_여_사망: number;
  종결자_여_서비스거부: number;
  종결자_여_기타: number;
  // 배정
  배정_전담사회복지사: number;
  배정_생활지원사: number;
  배정_이용자: number;
  // 변경
  변경여부: string;
  변경_전담사회복지사?: number;
  변경_생활지원사?: number;
  변경_이용자?: number;
  변경일자?: string;
}

export interface DiscrepancyItem {
  field: string;
  fieldLabel: string;
  previous: number;
  current: number;
  diffPercent: number;
}

export interface DiscrepancyData {
  기관명: string;
  기관코드: string;
  시군: string;
  제출월: string;
  discrepancies: DiscrepancyItem[];
}

export interface AssignmentChangeData {
  기관명: string;
  기관코드: string;
  시군: string;
  제출월: string;
  제출일시: string;
  변경_전담사회복지사?: number;
  변경_생활지원사?: number;
  변경_이용자?: number;
  변경일자?: string;
}

export interface InstitutionProfile {
  code: string;
  region: string;
  delegationType: string;
  delegationPeriod: string;
  yearHistory: Record<string, boolean>;
  facilityType: string;
  services: {
    specialized: boolean;
    emergencySafety: boolean;
    homeVisitCare: boolean;
    homeSeniorWelfare: boolean;
    socialServiceCenter: boolean;
    seniorJobDispatch: boolean;
  };
  corporation: {
    name: string;
    registrationNo: string;
    uniqueNo: string;
  };
  name: string;
  director: string;
  zipCode: string;
  address: string;
  contact: {
    mainPhone: string;
    phone: string;
    emergency: string;
    fax: string;
    email: string;
  };
  allocation: {
    mow: {
      socialWorker: number;
      careProvider: number;
      users: number;
    };
    actual: {
      socialWorkerAllocated: number;
      socialWorkerHired: number;
      careProviderAllocated: number;
      careProviderHired: number;
      usersAllocated: number;
      usersServed: number;
    };
  };
}

export interface TooltipData {
  region: string;
  stats: RegionStats;
  mode: MapMode;
  theme: MapTheme;
  x: number;
  y: number;
}
