import { useState } from "react";
import { X, CheckCircle2, AlertCircle, ChevronLeft, AlertTriangle, ArrowUp, ArrowDown, Building2, Phone, Mail, Shield } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  RegionStats,
  InstitutionStatus,
  InstitutionDetail,
  InstitutionProfile,
  DiscrepancyData,
  AssignmentChangeData,
  MapMode,
} from "../lib/map-types";
import { useWelfareResources, type WelfareFacility } from "../hooks/useWelfareResources";

const fmt = (n?: number | null): string => (!n ? "-" : n.toLocaleString());

interface MapSidePanelProps {
  regionStats: RegionStats | null;
  institutions: InstitutionStatus[];
  onClose: () => void;
  onSelectInstitution: (code: string) => void;
  selectedInstitution: InstitutionDetail | null;
  institutionProfile: InstitutionProfile | null;
  onBackToRegion: () => void;
  discrepancies: DiscrepancyData[];
  assignmentChanges: AssignmentChangeData[];
  mapMode: MapMode;
}

export default function MapSidePanel({
  regionStats,
  institutions,
  onClose,
  onSelectInstitution,
  selectedInstitution,
  institutionProfile,
  onBackToRegion,
  discrepancies,
  assignmentChanges,
  mapMode,
}: MapSidePanelProps) {
  if (!regionStats) return null;

  // 기관 상세 뷰
  if (selectedInstitution) {
    return (
      <InstitutionDetailView
        detail={selectedInstitution}
        profile={institutionProfile}
        discrepancies={discrepancies.filter(d => d.기관코드 === selectedInstitution.기관코드)}
        assignmentChanges={assignmentChanges.filter(a => a.기관코드 === selectedInstitution.기관코드)}
        onBack={onBackToRegion}
        onClose={onClose}
      />
    );
  }

  // 시군 요약 뷰
  return (
    <RegionSummaryView
      regionStats={regionStats}
      institutions={institutions}
      discrepancies={discrepancies}
      assignmentChanges={assignmentChanges}
      onClose={onClose}
      onSelectInstitution={onSelectInstitution}
      mapMode={mapMode}
    />
  );
}

// ───────────────────────────────────────────
// 시군 요약 뷰
// ───────────────────────────────────────────
function RegionSummaryView({
  regionStats: r,
  institutions,
  discrepancies,
  assignmentChanges,
  onClose,
  onSelectInstitution,
  mapMode,
}: {
  regionStats: RegionStats;
  institutions: InstitutionStatus[];
  discrepancies: DiscrepancyData[];
  assignmentChanges: AssignmentChangeData[];
  onClose: () => void;
  onSelectInstitution: (code: string) => void;
  mapMode: MapMode;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalWorkers = r.sw_m + r.sw_f + r.cg_m + r.cg_f;
  const totalShortWorkers = r.short_sw_m + r.short_sw_f + r.short_cg_m + r.short_cg_f;
  const totalGenUsers = r.gen_m_gen + r.gen_f_gen + r.gen_m_int + r.gen_f_int;
  const totalShortUsers = r.short_m + r.short_f;
  const totalTermGen = r.term_m_death + r.term_m_refuse + r.term_m_etc + r.term_f_death + r.term_f_refuse + r.term_f_etc;
  const totalTermShort = r.short_expired + r.short_withdrawn;

  const regionDiscrepancies = discrepancies.filter(d => d.시군 === r.region);
  const regionChanges = assignmentChanges.filter(a => a.시군 === r.region);

  const { data: resources } = useWelfareResources();
  const regionResources = resources?.filter(res => res.region === r.region) || [];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{r.region}</h2>
          <div className="flex items-center gap-2 mt-1">
            <RateBadge rate={r.submissionRate} />
            <span className="text-xs text-gray-500">
              ({r.submissions}/{r.totalOrganizations}개 기관)
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="닫기">
          <X className="h-5 w-5" />
          <span className="sr-only">닫기</span>
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">


          {/* ── 종사자 현황 ── */}
          <CollapsibleSection
            title="종사자 현황"
            badge={`${totalWorkers + totalShortWorkers}명`}
            expanded={expanded === "workers"}
            onToggle={() => setExpanded(expanded === "workers" ? null : "workers")}
          >
            <SectionSubtitle text="일반/중점 돌봄" />
            <DataRow label="전담사회복지사" value={`${fmt(r.sw_m + r.sw_f)}명`} sub={`남 ${fmt(r.sw_m)} / 여 ${fmt(r.sw_f)}`} />
            <DataRow label="생활지원사" value={`${fmt(r.cg_m + r.cg_f)}명`} sub={`남 ${fmt(r.cg_m)} / 여 ${fmt(r.cg_f)}`} />
            {totalShortWorkers > 0 && (
              <>
                <SectionSubtitle text="퇴원환자 단기집중" />
                <DataRow label="사회복지사" value={`${fmt(r.short_sw_m + r.short_sw_f)}명`} sub={`남 ${fmt(r.short_sw_m)} / 여 ${fmt(r.short_sw_f)}`} />
                <DataRow label="돌봄제공인력" value={`${fmt(r.short_cg_m + r.short_cg_f)}명`} sub={`남 ${fmt(r.short_cg_m)} / 여 ${fmt(r.short_cg_f)}`} />
              </>
            )}
          </CollapsibleSection>

          {/* ── 이용자 현황 ── */}
          <CollapsibleSection
            title="이용자 현황"
            badge={`${totalGenUsers + totalShortUsers}명`}
            expanded={expanded === "users"}
            onToggle={() => setExpanded(expanded === "users" ? null : "users")}
          >
            <SectionSubtitle text="일반/중점 돌봄" />
            <DataRow label="일반" value={`${fmt(r.gen_m_gen + r.gen_f_gen)}명`} sub={`남 ${fmt(r.gen_m_gen)} / 여 ${fmt(r.gen_f_gen)}`} />
            <DataRow label="중점" value={`${fmt(r.gen_m_int + r.gen_f_int)}명`} sub={`남 ${fmt(r.gen_m_int)} / 여 ${fmt(r.gen_f_int)}`} />
            <DataRow label="특화서비스" value={`${fmt(r.special_m + r.special_f)}명`} sub={`남 ${fmt(r.special_m)} / 여 ${fmt(r.special_f)}`} highlight />
            <SectionSubtitle text="퇴원환자 단기집중" />
            <DataRow label="이용자" value={`${fmt(totalShortUsers)}명`} sub={`남 ${fmt(r.short_m)} / 여 ${fmt(r.short_f)}`} />
            <DataRow label="이용기간" value="" sub={`1개월 ${fmt(r.short_1month)} / 2개월 ${fmt(r.short_2month)} / 기타 ${fmt(r.short_etc)}`} />
          </CollapsibleSection>

          {/* ── 신규 / 종결 ── */}
          <CollapsibleSection
            title="신규 / 종결"
            badge={`신규 ${r.new_m + r.new_f + r.short_new_m + r.short_new_f} / 종결 ${totalTermGen + totalTermShort}`}
            expanded={expanded === "newterm"}
            onToggle={() => setExpanded(expanded === "newterm" ? null : "newterm")}
          >
            <SectionSubtitle text="당월 신규 이용자" />
            <DataRow label="일반/중점" value={`${fmt(r.new_m + r.new_f)}명`} sub={`남 ${fmt(r.new_m)} / 여 ${fmt(r.new_f)}`} />
            <DataRow label="단기" value={`${fmt(r.short_new_m + r.short_new_f)}명`} sub={`남 ${fmt(r.short_new_m)} / 여 ${fmt(r.short_new_f)}`} />
            <SectionSubtitle text="당월 종결자 (일반/중점)" />
            <DataRow label="사망" value={`${fmt(r.term_m_death + r.term_f_death)}명`} sub={`남 ${fmt(r.term_m_death)} / 여 ${fmt(r.term_f_death)}`} />
            <DataRow label="서비스거부" value={`${fmt(r.term_m_refuse + r.term_f_refuse)}명`} sub={`남 ${fmt(r.term_m_refuse)} / 여 ${fmt(r.term_f_refuse)}`} />
            <DataRow label="기타" value={`${fmt(r.term_m_etc + r.term_f_etc)}명`} sub={`남 ${fmt(r.term_m_etc)} / 여 ${fmt(r.term_f_etc)}`} />
            {(r.short_expired > 0 || r.short_withdrawn > 0) && (
              <>
                <SectionSubtitle text="당월 종결자 (단기)" />
                <DataRow label="기간만료" value={`${fmt(r.short_expired)}명`} />
                <DataRow label="중도포기" value={`${fmt(r.short_withdrawn)}명`} />
              </>
            )}
          </CollapsibleSection>

          {/* ── 배정인원 ── */}
          <CollapsibleSection
            title="배정인원"
            badge=""
            expanded={expanded === "assign"}
            onToggle={() => setExpanded(expanded === "assign" ? null : "assign")}
          >
            <DataRow label="전담사회복지사" value={`${fmt(r.assigned_sw)}명`} />
            <DataRow label="생활지원사" value={`${fmt(r.assigned_cg)}명`} />
            <DataRow label="이용자" value={`${fmt(r.assigned_users)}명`} />
          </CollapsibleSection>

          {/* ── 오기입 의심 데이터 ── */}
          {regionDiscrepancies.length > 0 && (
            <CollapsibleSection
              title="오기입 의심 데이터"
              badge={`${regionDiscrepancies.length}건`}
              badgeColor="red"
              expanded={expanded === "disc"}
              onToggle={() => setExpanded(expanded === "disc" ? null : "disc")}
            >
              {regionDiscrepancies.map((d, i) => (
                <div key={i} className="bg-red-50 rounded-md p-2 mb-2 text-xs">
                  <div className="font-semibold text-red-800">{d.기관명}</div>
                  {d.discrepancies.map((item, j) => (
                    <div key={j} className="flex justify-between mt-1 text-red-700">
                      <span>{item.fieldLabel}</span>
                      <span>
                        {item.previous} → {item.current}
                        <span className={`ml-1 font-bold ${Math.abs(item.diffPercent) >= 50 ? "text-red-600" : "text-orange-600"
                          }`}>
                          ({item.diffPercent > 0 ? "+" : ""}{item.diffPercent}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </CollapsibleSection>
          )}

          {/* ── 배정인원 변경 ── */}
          {regionChanges.length > 0 && (
            <CollapsibleSection
              title="배정인원 변경"
              badge={`${regionChanges.length}건`}
              badgeColor="blue"
              expanded={expanded === "changes"}
              onToggle={() => setExpanded(expanded === "changes" ? null : "changes")}
            >
              {regionChanges.map((c, i) => (
                <div key={i} className="bg-blue-50 rounded-md p-2 mb-2 text-xs">
                  <div className="font-semibold text-blue-800">{c.기관명}</div>
                  <div className="mt-1 space-y-0.5 text-blue-700">
                    {c.변경_전담사회복지사 != null && (
                      <ChangeRow label="사회복지사" value={c.변경_전담사회복지사} />
                    )}
                    {c.변경_생활지원사 != null && (
                      <ChangeRow label="생활지원사" value={c.변경_생활지원사} />
                    )}
                    {c.변경_이용자 != null && (
                      <ChangeRow label="이용자" value={c.변경_이용자} />
                    )}
                    {c.변경일자 && <div className="text-blue-500">변경일: {c.변경일자}</div>}
                  </div>
                </div>
              ))}
            </CollapsibleSection>
          )}

          {/* ── 관내 노인의료복지시설 ── */}
          <CollapsibleSection
            title="관내 노인의료복지시설"
            badge={`${regionResources.length}개소`}
            badgeColor="gray"
            expanded={expanded === "resources"}
            onToggle={() => setExpanded(expanded === "resources" ? null : "resources")}
          >
            {regionResources.length === 0 ? (
              <div className="text-xs text-gray-400 p-2 text-center">등록된 시설이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {regionResources.map((res) => (
                  <div key={res.id} className="bg-gray-50 p-2 rounded-md border border-gray-100">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-gray-800">{res.name}</span>
                      <span className="text-[10px] text-gray-500 bg-white px-1 border rounded">{res.operatorType}</span>
                    </div>
                    <div className="text-[11px] text-gray-600 space-y-0.5">
                      <div>{res.address}</div>
                      <div className="flex gap-2">
                        <span>📞 {res.phone}</span>
                        <span>👥 정원 {res.capacity}명</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* ── 기관별 제출 현황 (클릭하면 상세) ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">기관별 제출 현황</h3>
            <div className="space-y-1.5">
              {institutions.map((inst) => (
                <button
                  key={inst.code}
                  onClick={() => inst.submitted && onSelectInstitution(inst.code)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-left transition-colors ${inst.submitted
                    ? "bg-green-50 text-green-800 hover:bg-green-100 cursor-pointer"
                    : "bg-red-50 text-red-800 cursor-default"
                    }`}
                >
                  {inst.submitted ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  )}
                  <span className="truncate flex-1">
                    {inst.name}
                    {mapMode === "short_term" && inst.isBase && (
                      <span className="ml-1.5 bg-purple-100 text-purple-700 px-1 py-0.5 rounded text-[9px] font-bold">
                        거점
                      </span>
                    )}
                  </span>
                  {inst.submitted && (
                    <span className="text-xs text-green-500 shrink-0">상세 &rarr;</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ───────────────────────────────────────────
// 기관 상세 뷰
// ───────────────────────────────────────────
function InstitutionDetailView({
  detail: d,
  profile: p,
  discrepancies,
  assignmentChanges,
  onBack,
  onClose,
}: {
  detail: InstitutionDetail;
  profile: InstitutionProfile | null;
  discrepancies: DiscrepancyData[];
  assignmentChanges: AssignmentChangeData[];
  onBack: () => void;
  onClose: () => void;
}) {
  const totalGenUsers = d.일반중점_남_일반 + d.일반중점_남_중점 + d.일반중점_여_일반 + d.일반중점_여_중점;
  const totalShortUsers = d.단기_남 + d.단기_여;
  const totalTermGen = (d.종결자_남_사망 || 0) + (d.종결자_남_서비스거부 || 0) + (d.종결자_남_기타 || 0)
    + (d.종결자_여_사망 || 0) + (d.종결자_여_서비스거부 || 0) + (d.종결자_여_기타 || 0);

  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 헤더 */}
      <div className="shrink-0 border-b border-gray-200">
        <div className="flex items-center gap-2 p-3 pb-1">
          <button onClick={onBack} className="p-1 rounded-md hover:bg-gray-100 text-gray-400" title="뒤로가기">
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">뒤로가기</span>
          </button>
          <span className="text-xs text-gray-400">{d.시군}</span>
          <div className="flex-1" />
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400" title="닫기">
            <X className="h-5 w-5" />
            <span className="sr-only">닫기</span>
          </button>
        </div>
        <div className="px-4 pb-3">
          <h2 className="text-base font-bold text-gray-900">{d.기관명}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
            <span>{d.기관코드}</span>
            {d.거점수행기관여부 && (
              <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                거점수행기관
              </span>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">

          {/* ── 기관 프로필 ── */}
          {p && (
            <div className="border border-indigo-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 transition-colors text-left"
              >
                <span className="text-sm font-semibold text-indigo-700 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  기관 프로필
                </span>
                <svg className={`w-4 h-4 text-indigo-400 transition-transform ${showProfile ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showProfile && (
                <div className="px-3 py-3 space-y-3">
                  {/* 기본 정보 */}
                  <div className="bg-white border border-gray-100 rounded-md p-2.5 text-xs space-y-1.5">
                    <div className="flex justify-between"><span className="text-gray-500">기관장</span><span className="font-medium text-gray-900">{p.director}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">시설유형</span><span className="font-medium text-gray-900">{p.facilityType}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">위수탁</span><span className="font-medium text-gray-900">{p.delegationType}</span></div>
                    <div className="flex justify-between items-start"><span className="text-gray-500 shrink-0">위수탁기간</span><span className="font-medium text-gray-900 text-right ml-2">{p.delegationPeriod}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">수탁법인</span><span className="font-medium text-gray-900">{p.corporation.name}</span></div>
                    {p.address && <div className="text-gray-500 pt-1 border-t border-gray-50">{p.address}</div>}
                  </div>

                  {/* 연락처 */}
                  <div className="bg-white border border-gray-100 rounded-md p-2.5 text-xs space-y-1.5">
                    <div className="text-[11px] font-semibold text-gray-600 mb-1 flex items-center gap-1"><Phone className="h-3 w-3" /> 연락처</div>
                    {p.contact.phone && <div className="flex justify-between"><span className="text-gray-500">메인연락처</span><span className="font-medium">{p.contact.phone}</span></div>}
                    {p.contact.emergency && <div className="flex justify-between"><span className="text-gray-500">긴급연락처</span><span className="font-medium">{p.contact.emergency}</span></div>}
                    {p.contact.fax && <div className="flex justify-between"><span className="text-gray-500">팩스</span><span className="font-medium">{p.contact.fax}</span></div>}
                    {p.contact.email && <div className="flex justify-between"><span className="text-gray-500">이메일</span><span className="font-medium text-indigo-600">{p.contact.email}</span></div>}
                  </div>

                  {/* 특화서비스 뱃지 */}
                  {Object.values(p.services).some(v => v) && (
                    <div>
                      <div className="text-[11px] font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Shield className="h-3 w-3" /> 수행 서비스</div>
                      <div className="flex flex-wrap gap-1.5">
                        {p.services.specialized && <ServiceBadge label="특화서비스" color="purple" />}
                        {p.services.emergencySafety && <ServiceBadge label="응급안전안심" color="red" />}
                        {p.services.homeVisitCare && <ServiceBadge label="방문요양" color="blue" />}
                        {p.services.homeSeniorWelfare && <ServiceBadge label="재가노인복지" color="green" />}
                        {p.services.socialServiceCenter && <ServiceBadge label="사회서비스원" color="amber" />}
                        {p.services.seniorJobDispatch && <ServiceBadge label="노인일자리파견" color="teal" />}
                      </div>
                    </div>
                  )}

                  {/* 배정 vs 채용 비교 */}
                  {(p.allocation.mow.socialWorker > 0 || p.allocation.mow.careProvider > 0 || p.allocation.mow.users > 0) && (
                    <div>
                      <div className="text-[11px] font-semibold text-gray-600 mb-1.5">복지부 배정 vs 실제 채용</div>
                      <div className="space-y-2">
                        {p.allocation.mow.socialWorker > 0 && (
                          <AllocationBar label="전담사회복지사" allocated={p.allocation.mow.socialWorker} hired={p.allocation.actual.socialWorkerHired} />
                        )}
                        {p.allocation.mow.careProvider > 0 && (
                          <AllocationBar label="생활지원사" allocated={p.allocation.mow.careProvider} hired={p.allocation.actual.careProviderHired} />
                        )}
                        {p.allocation.mow.users > 0 && (
                          <AllocationBar label="대상자" allocated={p.allocation.mow.users} hired={p.allocation.actual.usersServed} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* 사업 수행 이력 타임라인 */}
                  <div>
                    <div className="text-[11px] font-semibold text-gray-600 mb-1.5">사업 수행 이력</div>
                    <div className="flex gap-1">
                      {Object.entries(p.yearHistory).map(([year, active]) => (
                        <div key={year} className="flex flex-col items-center gap-0.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${active ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                            {year.slice(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 제출 정보 */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">제출일시</span><span className="font-medium">{d.제출일시}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">담당자</span><span className="font-medium">{d.담당자_이름}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">연락처</span><span className="font-medium">{d.담당자_연락처}</span></div>
          </div>

          {/* 종사자 */}
          <DetailSection title="종사자 현황 (일반/중점)">
            <DetailGrid>
              <DetailCell label="전담사회복지사 (남)" value={d.전담사회복지사_남} />
              <DetailCell label="전담사회복지사 (여)" value={d.전담사회복지사_여} />
              <DetailCell label="생활지원사 (남)" value={d.생활지원사_남} />
              <DetailCell label="생활지원사 (여)" value={d.생활지원사_여} />
            </DetailGrid>
          </DetailSection>

          {d.거점수행기관여부 && (
            <DetailSection title="종사자 현황 (퇴원환자 단기집중)">
              <DetailGrid>
                <DetailCell label="사회복지사 (남)" value={d.단기_전담인력_사회복지사_남} />
                <DetailCell label="사회복지사 (여)" value={d.단기_전담인력_사회복지사_여} />
                <DetailCell label="돌봄제공인력 (남)" value={d.단기_전담인력_돌봄제공인력_남} />
                <DetailCell label="돌봄제공인력 (여)" value={d.단기_전담인력_돌봄제공인력_여} />
              </DetailGrid>
            </DetailSection>
          )}

          {/* 이용자 - 일반/중점 */}
          <DetailSection title={`이용자 현황 (일반/중점) - ${totalGenUsers}명`}>
            <DetailGrid>
              <DetailCell label="일반 (남)" value={d.일반중점_남_일반} />
              <DetailCell label="일반 (여)" value={d.일반중점_여_일반} />
              <DetailCell label="중점 (남)" value={d.일반중점_남_중점} />
              <DetailCell label="중점 (여)" value={d.일반중점_여_중점} />
              <DetailCell label="특화 (남)" value={d.특화_남} highlight />
              <DetailCell label="특화 (여)" value={d.특화_여} highlight />
            </DetailGrid>
          </DetailSection>

          {/* 이용자 - 단기 */}
          {(totalShortUsers > 0 || d.거점수행기관여부) && (
            <DetailSection title={`이용자 현황 (퇴원환자 단기) - ${totalShortUsers}명`}>
              <DetailGrid>
                <DetailCell label="남" value={d.단기_남} />
                <DetailCell label="여" value={d.단기_여} />
              </DetailGrid>
              <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2 space-y-0.5">
                <div className="flex justify-between"><span>기본(1개월)</span><span className="font-medium text-gray-700">{fmt(d.단기_기본_1개월)}</span></div>
                <div className="flex justify-between"><span>연장(2개월)</span><span className="font-medium text-gray-700">{fmt(d.단기_연장_2개월)}</span></div>
                <div className="flex justify-between"><span>기타</span><span className="font-medium text-gray-700">{fmt(d.단기_기타)}</span></div>
              </div>
            </DetailSection>
          )}

          {/* 신규 이용자 */}
          <DetailSection title="당월 신규 이용자">
            <DetailGrid>
              <DetailCell label="일반/중점 (남)" value={d.신규대상자_남} />
              <DetailCell label="일반/중점 (여)" value={d.신규대상자_여} />
              <DetailCell label="단기 (남)" value={d.단기_당월신규_남} />
              <DetailCell label="단기 (여)" value={d.단기_당월신규_여} />
            </DetailGrid>
          </DetailSection>

          {/* 종결자 */}
          {(totalTermGen > 0 || d.단기_기간만료 > 0 || d.단기_중도포기 > 0) && (
            <DetailSection title="당월 종결자">
              {totalTermGen > 0 && (
                <>
                  <div className="text-[11px] font-medium text-gray-500 mb-1">일반/중점</div>
                  <DetailGrid>
                    <DetailCell label="사망 (남)" value={d.종결자_남_사망} />
                    <DetailCell label="사망 (여)" value={d.종결자_여_사망} />
                    <DetailCell label="서비스거부 (남)" value={d.종결자_남_서비스거부} />
                    <DetailCell label="서비스거부 (여)" value={d.종결자_여_서비스거부} />
                    <DetailCell label="기타 (남)" value={d.종결자_남_기타} />
                    <DetailCell label="기타 (여)" value={d.종결자_여_기타} />
                  </DetailGrid>
                </>
              )}
              {(d.단기_기간만료 > 0 || d.단기_중도포기 > 0) && (
                <>
                  <div className="text-[11px] font-medium text-gray-500 mb-1 mt-2">퇴원환자 단기</div>
                  <DetailGrid>
                    <DetailCell label="기간만료" value={d.단기_기간만료} />
                    <DetailCell label="중도포기" value={d.단기_중도포기} />
                  </DetailGrid>
                </>
              )}
            </DetailSection>
          )}

          {/* 배정인원 */}
          <DetailSection title="배정인원">
            <DetailGrid>
              <DetailCell label="전담사회복지사" value={d.배정_전담사회복지사} />
              <DetailCell label="생활지원사" value={d.배정_생활지원사} />
              <DetailCell label="이용자" value={d.배정_이용자} />
            </DetailGrid>
          </DetailSection>

          {/* 배정인원 변경 */}
          {d.변경여부 === "유" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs space-y-1">
              <div className="font-semibold text-blue-800 mb-1">배정인원 변경</div>
              {d.변경_전담사회복지사 != null && <ChangeRow label="사회복지사" value={d.변경_전담사회복지사} />}
              {d.변경_생활지원사 != null && <ChangeRow label="생활지원사" value={d.변경_생활지원사} />}
              {d.변경_이용자 != null && <ChangeRow label="이용자" value={d.변경_이용자} />}
              {d.변경일자 && <div className="text-blue-500">변경일: {d.변경일자}</div>}
            </div>
          )}

          {/* 오기입 의심 */}
          {discrepancies.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs">
              <div className="flex items-center gap-1 font-semibold text-red-800 mb-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                오기입 의심 데이터
              </div>
              {discrepancies.flatMap(d => d.discrepancies).map((item, j) => (
                <div key={j} className="flex justify-between py-0.5 text-red-700">
                  <span>{item.fieldLabel}</span>
                  <span>
                    {item.previous} → {item.current}
                    <span className={`ml-1 font-bold ${Math.abs(item.diffPercent) >= 50 ? "text-red-600" : "text-orange-600"
                      }`}>
                      ({item.diffPercent > 0 ? "+" : ""}{item.diffPercent}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 이전 배정변경 이력 */}
          {assignmentChanges.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
              <div className="font-semibold text-amber-800 mb-2">배정인원 변경 이력</div>
              {assignmentChanges.map((c, i) => (
                <div key={i} className="border-t border-amber-200 pt-1 mt-1 first:border-0 first:pt-0 first:mt-0 space-y-0.5">
                  <div className="text-amber-600">{c.제출월} ({c.변경일자})</div>
                  {c.변경_전담사회복지사 != null && <ChangeRow label="사회복지사" value={c.변경_전담사회복지사} />}
                  {c.변경_생활지원사 != null && <ChangeRow label="생활지원사" value={c.변경_생활지원사} />}
                  {c.변경_이용자 != null && <ChangeRow label="이용자" value={c.변경_이용자} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ───────────────────────────────────────────
// 공통 UI 컴포넌트
// ───────────────────────────────────────────

function RateBadge({ rate }: { rate: number }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${rate >= 100 ? "bg-green-100 text-green-700"
      : rate >= 50 ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700"
      }`}>
      제출률 {rate}%
    </span>
  );
}

function CollapsibleSection({
  title, badge, badgeColor = "gray", expanded, onToggle, children,
}: {
  title: string;
  badge: string;
  badgeColor?: "gray" | "red" | "blue";
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const badgeColors = {
    gray: "bg-gray-100 text-gray-600",
    red: "bg-red-100 text-red-600",
    blue: "bg-blue-100 text-blue-600",
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <div className="flex items-center gap-2">
          {badge && <span className={`text-xs px-1.5 py-0.5 rounded ${badgeColors[badgeColor]}`}>{badge}</span>}
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {expanded && <div className="px-3 py-2 space-y-1">{children}</div>}
    </div>
  );
}

function SectionSubtitle({ text }: { text: string }) {
  return <div className="text-[11px] font-medium text-gray-400 mt-1.5 mb-0.5">{text}</div>;
}

function DataRow({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 text-xs ${highlight ? "bg-indigo-50 -mx-1 px-1 rounded" : ""}`}>
      <span className="text-gray-600">{label}</span>
      <div className="text-right">
        <span className="font-semibold text-gray-900">{value}</span>
        {sub && <div className="text-[10px] text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-700 mb-1.5 border-b border-gray-100 pb-1">{title}</h4>
      {children}
    </div>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">{children}</div>;
}

function DetailCell({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 text-xs ${highlight ? "text-indigo-700" : ""}`}>
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${highlight ? "text-indigo-700" : "text-gray-900"}`}>{fmt(value)}</span>
    </div>
  );
}

function ChangeRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={`font-medium flex items-center gap-0.5 ${value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : "text-gray-500"}`}>
        {value > 0 && <ArrowUp className="h-3 w-3" />}
        {value < 0 && <ArrowDown className="h-3 w-3" />}
        {value > 0 ? "+" : ""}{value}
      </span>
    </div>
  );
}

const SERVICE_BADGE_COLORS: Record<string, string> = {
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  red: "bg-red-100 text-red-700 border-red-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  green: "bg-green-100 text-green-700 border-green-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  teal: "bg-teal-100 text-teal-700 border-teal-200",
};

function ServiceBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SERVICE_BADGE_COLORS[color] || SERVICE_BADGE_COLORS.blue}`}>
      {label}
    </span>
  );
}

function AllocationBar({ label, allocated, hired }: { label: string; allocated: number; hired: number }) {
  const rate = allocated > 0 ? Math.round((hired / allocated) * 100) : 0;
  const barWidth = Math.min(rate, 100);
  const barColor = rate >= 100 ? "bg-green-500" : rate >= 70 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="text-xs">
      <div className="flex justify-between mb-0.5">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{hired}/{allocated} <span className={`font-bold ${rate >= 100 ? "text-green-600" : rate >= 70 ? "text-amber-600" : "text-red-600"}`}>({rate}%)</span></span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  );
}
