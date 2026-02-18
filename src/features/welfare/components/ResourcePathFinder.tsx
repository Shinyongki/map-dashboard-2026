import { useState, useMemo } from "react";
import {
    Search,
    MapPin,
    Building2,
    ChevronRight,
    X,
    CheckSquare,
    Square,
    AlertCircle,
    Phone,
    Star,
} from "lucide-react";
import type { WelfareFacility, Sigun } from "@/features/welfare/lib/welfare-types";
import { SIGUN_LIST, getGroupInfo } from "@/features/welfare/lib/welfare-types";

interface ResourcePathFinderProps {
    facilities: WelfareFacility[];
    onFocusLocation?: (lat: number, lng: number) => void;
    onClose: () => void;
}

const SERVICE_OPTIONS = [
    { id: "specialized", label: "단기집중서비스", serviceKey: "단기집중서비스" },
    { id: "homeVisitCare", label: "방문요양", serviceKey: "방문요양" },
    { id: "dayNightCare", label: "주야간보호", serviceKey: "" },
    { id: "facilityAdmission", label: "요양시설 입소", serviceKey: "" },
] as const;

interface PathResult {
    step1: WelfareFacility[]; // 해당 시군 수행기관
    step2Hub: WelfareFacility[]; // 거점기관 (단기집중서비스 선택 시만)
    step3: WelfareFacility[]; // 인근 돌봄/의료 시설
}

export default function ResourcePathFinder({
    facilities,
    onFocusLocation,
    onClose,
}: ResourcePathFinderProps) {
    const [selectedSigun, setSelectedSigun] = useState<Sigun | "">("");
    const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
    const [result, setResult] = useState<PathResult | null>(null);
    const [searched, setSearched] = useState(false);

    const specializedSelected = selectedServices.has("specialized");

    const toggleService = (id: string) => {
        setSelectedServices((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSearch = () => {
        if (!selectedSigun) return;

        // Step 1: 해당 시군 수행기관 (일반 나열)
        const step1 = facilities.filter(
            (f) => f.group === "performer" && f.sigun === selectedSigun
        );

        // Step 2: 거점기관 (단기집중서비스 제공 기관) - 단기집중 선택 시만 사용
        const step2Hub = specializedSelected
            ? facilities.filter(
                (f) =>
                    f.group === "performer" &&
                    f.sigun === selectedSigun &&
                    f.serviceTypes?.includes("단기집중서비스")
            )
            : [];

        // Step 3: 해당 시군의 돌봄/의료/사회참여 시설
        const step3 = facilities.filter(
            (f) =>
                f.sigun === selectedSigun &&
                (f.group === "care" || f.group === "medical" || f.group === "social")
        );

        setResult({ step1, step2Hub, step3 });
        setSearched(true);
    };

    const facilityCounts = useMemo(() => {
        if (!selectedSigun) return { performers: 0, care: 0 };
        return {
            performers: facilities.filter(
                (f) => f.group === "performer" && f.sigun === selectedSigun
            ).length,
            care: facilities.filter(
                (f) =>
                    f.sigun === selectedSigun &&
                    (f.group === "care" || f.group === "medical")
            ).length,
        };
    }, [facilities, selectedSigun]);

    return (
        <div className="absolute top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-30 flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                        <Search className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">복지자원 경로 찾기</h3>
                        <p className="text-xs text-gray-500">시군 → 수행기관 → 연계시설</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/80 rounded-lg transition-colors"
                >
                    <X className="h-4 w-4 text-gray-500" />
                </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4 border-b border-gray-100">
                {/* 시군 선택 */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        시군 선택
                    </label>
                    <select
                        aria-label="시군 선택"
                        value={selectedSigun}
                        onChange={(e) => {
                            setSelectedSigun(e.target.value as Sigun | "");
                            setResult(null);
                            setSearched(false);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">시군을 선택하세요</option>
                        {SIGUN_LIST.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                    {selectedSigun && (
                        <p className="mt-1 text-xs text-gray-400">
                            수행기관 {facilityCounts.performers}곳 · 돌봄/의료 {facilityCounts.care}곳
                        </p>
                    )}
                </div>

                {/* 필요 서비스 */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        필요 서비스
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {SERVICE_OPTIONS.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => toggleService(opt.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${selectedServices.has(opt.id)
                                        ? "bg-blue-50 border-blue-300 text-blue-700"
                                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                    }`}
                            >
                                {selectedServices.has(opt.id) ? (
                                    <CheckSquare className="h-3.5 w-3.5" />
                                ) : (
                                    <Square className="h-3.5 w-3.5" />
                                )}
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 검색 버튼 */}
                <button
                    onClick={handleSearch}
                    disabled={!selectedSigun}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                    <Search className="h-4 w-4" />
                    경로 찾기
                </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {searched && result && (
                    <>
                        {/* Step 1: 수행기관 (일반 나열) */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                                    1
                                </span>
                                <span className="text-xs font-bold text-gray-900">
                                    {selectedSigun} 수행기관
                                </span>
                                <span className="text-xs text-gray-400">
                                    ({result.step1.length}곳)
                                </span>
                            </div>
                            {result.step1.length === 0 ? (
                                <p className="text-xs text-gray-400 pl-7">
                                    해당 시군에 등록된 수행기관이 없습니다.
                                </p>
                            ) : (
                                <div className="space-y-1.5">
                                    {result.step1.map((f) => (
                                        <FacilityCard
                                            key={f.id}
                                            facility={f}
                                            onFocus={onFocusLocation}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Step 2: 거점기관 (단기집중서비스 선택 시만) */}
                        {specializedSelected && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full">
                                        2
                                    </span>
                                    <span className="text-xs font-bold text-gray-900">
                                        퇴원환자 단기집중서비스 거점기관
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        ({result.step2Hub.length}곳)
                                    </span>
                                </div>
                                {result.step2Hub.length === 0 ? (
                                    <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 ml-7">
                                        <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-700">
                                            해당 시군에 단기집중서비스 거점기관이 없습니다.
                                            인근 시군 거점기관에 문의하세요.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {result.step2Hub.map((f) => (
                                            <HubFacilityCard
                                                key={f.id}
                                                facility={f}
                                                onFocus={onFocusLocation}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: 인근 돌봄/의료 시설 */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="flex items-center justify-center w-5 h-5 bg-violet-600 text-white text-xs font-bold rounded-full">
                                    {specializedSelected ? "3" : "2"}
                                </span>
                                <span className="text-xs font-bold text-gray-900">
                                    인근 돌봄/의료 시설
                                </span>
                                <span className="text-xs text-gray-400">
                                    ({result.step3.length}곳)
                                </span>
                            </div>
                            {result.step3.length === 0 ? (
                                <p className="text-xs text-gray-400 pl-7">
                                    해당 시군에 등록된 시설이 없습니다.
                                </p>
                            ) : (
                                <div className="space-y-1.5">
                                    {result.step3.slice(0, 10).map((f) => (
                                        <FacilityCard
                                            key={f.id}
                                            facility={f}
                                            onFocus={onFocusLocation}
                                        />
                                    ))}
                                    {result.step3.length > 10 && (
                                        <p className="text-xs text-gray-400 text-center">
                                            외 {result.step3.length - 10}곳 더 있음
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {!searched && (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <MapPin className="h-10 w-10 mb-3 opacity-30" />
                        <p className="text-sm font-medium">시군을 선택하고</p>
                        <p className="text-sm">경로 찾기를 눌러주세요</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Facility Card (일반) ──────────────────────────────────

function FacilityCard({
    facility,
    onFocus,
}: {
    facility: WelfareFacility;
    onFocus?: (lat: number, lng: number) => void;
}) {
    const groupInfo = getGroupInfo(facility.group);
    const hasLocation = facility.lat && facility.lng;

    return (
        <button
            onClick={() => {
                if (hasLocation && onFocus) {
                    onFocus(facility.lat!, facility.lng!);
                }
            }}
            disabled={!hasLocation}
            className={`w-full text-left p-2.5 rounded-lg border transition-all ${hasLocation
                    ? "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer"
                    : "bg-gray-50 border-gray-100 cursor-default"
                }`}
        >
            <div className="flex items-start gap-2">
                <Building2
                    className="h-4 w-4 flex-shrink-0 mt-0.5"
                    style={{ color: groupInfo.color }}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-900 truncate">
                            {facility.name}
                        </span>
                        <span
                            className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0"
                            style={{
                                backgroundColor: groupInfo.color + "15",
                                color: groupInfo.color,
                            }}
                        >
                            {facility.category}
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {facility.address || "(주소 미등록)"}
                    </p>
                    {facility.phone && (
                        <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                            <Phone className="h-2.5 w-2.5" />
                            {facility.phone}
                        </p>
                    )}
                </div>
                {hasLocation && (
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0 mt-1" />
                )}
            </div>
        </button>
    );
}

// ─── Hub Facility Card (거점기관 전용) ─────────────────────

function HubFacilityCard({
    facility,
    onFocus,
}: {
    facility: WelfareFacility;
    onFocus?: (lat: number, lng: number) => void;
}) {
    const hasLocation = facility.lat && facility.lng;

    return (
        <button
            onClick={() => {
                if (hasLocation && onFocus) {
                    onFocus(facility.lat!, facility.lng!);
                }
            }}
            disabled={!hasLocation}
            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${hasLocation
                    ? "bg-amber-50 border-amber-300 hover:border-amber-400 hover:shadow-md cursor-pointer"
                    : "bg-amber-50/50 border-amber-200 cursor-default"
                }`}
        >
            <div className="flex items-start gap-2.5">
                <Star className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5 fill-amber-500" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900 truncate">
                            {facility.name}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-200 text-amber-800 flex-shrink-0">
                            거점기관
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-600 truncate mt-0.5">
                        {facility.address || "(주소 미등록)"}
                    </p>
                    {facility.phone && (
                        <p className="flex items-center gap-1 text-[11px] text-amber-700 font-medium mt-1">
                            <Phone className="h-3 w-3" />
                            {facility.phone}
                        </p>
                    )}
                    {facility.serviceTypes && facility.serviceTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                            {facility.serviceTypes.map((s) => (
                                <span
                                    key={s}
                                    className="px-1.5 py-0.5 text-[10px] font-medium bg-white rounded border border-amber-200 text-amber-700"
                                >
                                    {s}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                {hasLocation && (
                    <ChevronRight className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-1" />
                )}
            </div>
        </button>
    );
}
