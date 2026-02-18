
import { useEffect, useRef, useState, useCallback } from "react";
import { Search } from "lucide-react";
import type { WelfareFacility, WelfareGroup } from "@/features/welfare/lib/welfare-types";
import {
    getCategoryGroup,
    getGroupInfo,
    extractSigun,
    WELFARE_GROUPS,
} from "@/features/welfare/lib/welfare-types";
import ResourcePathFinder from "./ResourcePathFinder";

// The subset of groups used from existing data files
const ACTIVE_GROUPS: WelfareGroup[] = [
    "public",
    "medical",
    "care",
    "social",
    "performer",
    "housing",
    "admin",
];

export default function WelfareMap() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const [mapInstance, setMapInstance] = useState<any>(null);
    const [facilities, setFacilities] = useState<WelfareFacility[]>([]);
    const [filteredFacilities, setFilteredFacilities] = useState<WelfareFacility[]>([]);
    const [loading, setLoading] = useState(true);
    const [mapError, setMapError] = useState<string | null>(null);

    // Active Filter State
    const [activeGroup, setActiveGroup] = useState<string>("ALL");
    const [activeCategory, setActiveCategory] = useState<string>("ALL");
    const [selectedRegion, setSelectedRegion] = useState<string>("ALL");

    // Path Finder panel
    const [showPathFinder, setShowPathFinder] = useState(false);

    const activeInfoWindow = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    // Focus map on location (for ResourcePathFinder)
    const handleFocusLocation = useCallback(
        (lat: number, lng: number) => {
            if (!mapInstance || !window.kakao) return;
            const { kakao } = window;
            const coords = new kakao.maps.LatLng(lat, lng);
            mapInstance.setCenter(coords);
            mapInstance.setLevel(4);
        },
        [mapInstance]
    );

    useEffect(() => {
        if (!mapContainer.current) return;

        const initializeMap = () => {
            if (!window.kakao || !window.kakao.maps) {
                setMapError("지도를 불러올 수 없습니다. (API 설정 오류)");
                setLoading(false);
                return false;
            }

            const { kakao } = window;
            kakao.maps.load(() => {
                const options = {
                    center: new kakao.maps.LatLng(35.2383, 128.6925),
                    level: 11,
                };

                const map = new kakao.maps.Map(mapContainer.current, options);
                setMapInstance(map);

                const zoomControl = new kakao.maps.ZoomControl();
                map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
                const mapTypeControl = new kakao.maps.MapTypeControl();
                map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);

                Promise.all([
                    fetch("/data/fire_stations.json").then((res) => res.json()),
                    fetch("/data/institution_profiles.json").then((res) => res.json()),
                    fetch("/data/public_admin.json").then((res) => res.json()),
                    fetch("/data/specialized.json").then((res) => res.json()),
                    fetch("/data/emergency_hubs.json").then((res) => res.json()),
                    fetch("/data/regional_welfare.json").then((res) => res.json()),
                    fetch("/data/private_orgs.json").then((res) => res.json()),
                    fetch("/data/elderly_care.json").then((res) => res.json()),
                ])
                    .then(
                        ([
                            fireData,
                            profileData,
                            publicData,
                            specializedData,
                            emergencyData,
                            regionalData,
                            privateData,
                            elderlyCareData,
                        ]) => {
                            let idCounter = 0;
                            const processPublic = (data: any[], defaultCat: string): WelfareFacility[] =>
                                data.map((item) => {
                                    const cat = item.category || defaultCat;
                                    return {
                                        id: `pub_${idCounter++}`,
                                        name: item.name,
                                        address: item.address || "",
                                        phone: item.phone || "",
                                        category: cat,
                                        group: getCategoryGroup(cat),
                                        sigun: extractSigun(item.address || ""),
                                        source: "public" as const,
                                        lat: item.lat,
                                        lng: item.lng,
                                    };
                                });

                            const profileFacilities: WelfareFacility[] = profileData.map(
                                (p: any) => {
                                    const svc: string[] = [];
                                    if (p.services?.specialized) svc.push("단기집중서비스");
                                    if (p.services?.emergencySafety) svc.push("응급안전");
                                    if (p.services?.homeVisitCare) svc.push("방문요양");
                                    if (p.services?.homeSeniorWelfare) svc.push("재가노인복지");
                                    if (p.services?.socialServiceCenter) svc.push("사회서비스원");
                                    if (p.services?.seniorJobDispatch) svc.push("노인일자리파견");
                                    return {
                                        id: `inst_${idCounter++}`,
                                        name: p.name,
                                        address: p.address || "",
                                        phone: p.contact?.mainPhone || "",
                                        category: "수행기관",
                                        group: "performer" as WelfareGroup,
                                        sigun: extractSigun(p.address || "", p.region),
                                        serviceTypes: svc.length > 0 ? svc : undefined,
                                        source: "institution" as const,
                                        lat: p.lat,
                                        lng: p.lng,
                                    };
                                }
                            );

                            const allData: WelfareFacility[] = [
                                ...processPublic(fireData, "소방서"),
                                ...processPublic(publicData, "보건소"),
                                ...processPublic(specializedData, "의료기관"),
                                ...profileFacilities,
                                ...processPublic(emergencyData, "응급안전"),
                                ...processPublic(regionalData, "노인복지관"),
                                ...processPublic(privateData, "자원봉사"),
                                ...processPublic(elderlyCareData, "노인맞춤돌봄"),
                            ];

                            setFacilities(allData);
                            setFilteredFacilities(allData);
                            setLoading(false);
                        }
                    )
                    .catch((err) => {
                        console.error("Failed to load data:", err);
                        setLoading(false);
                    });
            });
            return true;
        };

        if (!initializeMap()) {
            const interval = setInterval(() => {
                if (initializeMap()) clearInterval(interval);
            }, 100);
            return () => clearInterval(interval);
        }
    }, []);

    // Filter Logic
    useEffect(() => {
        let result = facilities;

        if (activeGroup !== "ALL") {
            result = result.filter((f) => f.group === activeGroup);
            if (activeCategory !== "ALL") {
                result = result.filter((f) => f.category === activeCategory);
            }
        }

        if (selectedRegion !== "ALL") {
            result = result.filter(
                (f) => f.address.includes(selectedRegion) || f.sigun.includes(selectedRegion)
            );
        }

        setFilteredFacilities(result);
    }, [activeGroup, activeCategory, selectedRegion, facilities]);

    // Handle Group Click
    const handleGroupClick = (groupId: string) => {
        if (activeGroup === groupId) {
            setActiveGroup("ALL");
            setActiveCategory("ALL");
            setSelectedRegion("ALL");
        } else {
            setActiveGroup(groupId);
            setActiveCategory("ALL");
            setSelectedRegion("ALL");
        }
    };

    // Calculate Regions
    const regions = Array.from(
        new Set(
            facilities.map((f) => {
                const parts = f.address.split(" ");
                if (parts.length > 1) {
                    if (parts[1].endsWith("시") || parts[1].endsWith("군")) return parts[1];
                }
                return "";
            })
        )
    )
        .filter((r) => r)
        .sort();

    // Marker Rendering
    useEffect(() => {
        if (!mapInstance || !window.kakao) return;
        const { kakao } = window;

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        filteredFacilities.forEach((facility) => {
            if (!facility.lat || !facility.lng) return;

            const coords = new kakao.maps.LatLng(facility.lat, facility.lng);

            const marker = new kakao.maps.Marker({
                map: mapInstance,
                position: coords,
                title: facility.name,
            });

            markersRef.current.push(marker);

            const groupInfo = getGroupInfo(facility.group);
            const color = groupInfo.color;

            const iwContent = `<div style="padding:10px; font-size:12px; color:black; min-width:180px; border-radius:8px;">
                <span style="color:${color}; font-weight:800; font-size:11px; border:1px solid ${color}; padding:2px 6px; border-radius:12px;">${facility.category}</span>
                <div style="font-weight:bold; font-size:14px; margin-top:6px; margin-bottom:4px;">${facility.name}</div>
                <div style="color:#666; font-size:12px;">${facility.address}</div>
                <div style="color:#888; margin-top:4px;">${facility.phone || "-"}</div>
            </div>`;

            const infowindow = new kakao.maps.InfoWindow({
                content: iwContent,
                removable: true,
            });

            kakao.maps.event.addListener(marker, "click", function () {
                if (activeInfoWindow.current) {
                    activeInfoWindow.current.close();
                }
                infowindow.open(mapInstance, marker);
                activeInfoWindow.current = infowindow;
            });
        });
    }, [filteredFacilities, mapInstance]);

    return (
        <div
            className="w-full relative font-sans"
            style={{ height: "calc(100vh - 48px)" }}
        >
            <div ref={mapContainer} className="w-full h-full relative">
                {mapError && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-xl shadow-2xl border border-red-100 max-w-sm text-center">
                            <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                                <span className="text-2xl">🗺️</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">지도를 불러올 수 없습니다</h3>
                            <p className="text-gray-600 mb-4 break-keep text-sm">{mapError}</p>
                            <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-500 text-left">
                                <p className="font-semibold mb-1">해결 방법:</p>
                                <p>Kakao Developers 내 애플리케이션 설정 &gt; 플랫폼 &gt; Web 사이트 도메인에 <code>http://localhost:5174</code>가 등록되어 있는지 확인해주세요.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend / Filter UI */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex flex-col gap-3 items-center w-full max-w-5xl px-4 pointer-events-none">
                {/* Main Groups */}
                <div className="flex flex-wrap justify-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md p-2 rounded-full shadow-xl border border-gray-100/50">
                    <button
                        onClick={() => {
                            setActiveGroup("ALL");
                            setActiveCategory("ALL");
                            setSelectedRegion("ALL");
                        }}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeGroup === "ALL"
                            ? "bg-gray-800 text-white shadow-lg scale-105"
                            : "text-gray-500 hover:bg-gray-100"
                            }`}
                    >
                        전체
                    </button>
                    {ACTIVE_GROUPS.map((gId) => {
                        const group = WELFARE_GROUPS.find((g) => g.id === gId);
                        if (!group) return null;
                        return (
                            <button
                                key={group.id}
                                onClick={() => handleGroupClick(group.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${activeGroup === group.id
                                    ? "text-white shadow-lg transform scale-105"
                                    : "text-gray-600 hover:bg-gray-100"
                                    }`}
                                style={{
                                    backgroundColor:
                                        activeGroup === group.id ? group.color : "transparent",
                                }}
                            >
                                {activeGroup !== group.id && (
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: group.color }}
                                    ></span>
                                )}
                                {group.label}
                            </button>
                        );
                    })}
                </div>

                {/* Sub-categories */}
                {activeGroup !== "ALL" && (
                    <div className="flex flex-wrap justify-center gap-2 pointer-events-auto animate-in slide-in-from-top-2 fade-in duration-300">
                        {WELFARE_GROUPS.find((g) => g.id === activeGroup)?.categories.map(
                            (cat) => (
                                <button
                                    key={cat}
                                    onClick={() =>
                                        setActiveCategory(activeCategory === cat ? "ALL" : cat)
                                    }
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm border ${activeCategory === cat
                                        ? "bg-white text-blue-600 border-blue-400 ring-2 ring-blue-100 shadow-md"
                                        : "bg-white/90 text-gray-500 border-gray-200 hover:bg-white hover:text-gray-800"
                                        }`}
                                >
                                    {cat}
                                </button>
                            )
                        )}
                    </div>
                )}

                {/* Region Filter */}
                {activeGroup !== "ALL" && (
                    <div className="pointer-events-auto mt-1 animate-in slide-in-from-top-1 fade-in duration-300">
                        <select
                            aria-label="Filter by region"
                            value={selectedRegion}
                            onChange={(e) => setSelectedRegion(e.target.value)}
                            className="bg-white/95 backdrop-blur-sm border border-gray-200 text-gray-700 text-sm rounded-full focus:ring-blue-500 focus:border-blue-500 block p-2 px-4 shadow-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                            <option value="ALL">📍 모든 지역 (시/군 선택)</option>
                            {regions.map((region) => (
                                <option key={region} value={region}>
                                    {region}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Stats Panel */}
            <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-gray-100 min-w-[240px] transition-all hover:scale-105">
                <h1 className="font-bold text-xl text-gray-900 mb-3 tracking-tight">
                    경상남도 복지자원
                </h1>
                {loading ? (
                    <p className="text-sm text-gray-400 animate-pulse font-medium">
                        데이터 로딩 중...
                    </p>
                ) : (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <span className="text-sm text-gray-500 font-medium">현재 표시 자원</span>
                            <span className="font-extrabold text-blue-600 text-2xl">
                                {filteredFacilities.length}
                            </span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1.5">
                            <p className="flex justify-between">
                                <span>선택 그룹</span>
                                <span className="font-bold text-gray-800">
                                    {activeGroup === "ALL"
                                        ? "전체 보기"
                                        : WELFARE_GROUPS.find((g) => g.id === activeGroup)?.label}
                                </span>
                            </p>
                            {activeGroup !== "ALL" && (
                                <p className="flex justify-between">
                                    <span>상세 분류</span>
                                    <span className="font-bold text-gray-800">
                                        {activeCategory === "ALL" ? "전체" : activeCategory}
                                    </span>
                                </p>
                            )}
                            {selectedRegion !== "ALL" && (
                                <p className="flex justify-between">
                                    <span>지역 필터</span>
                                    <span className="font-bold text-blue-600">{selectedRegion}</span>
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Path Finder Button */}
            <button
                onClick={() => setShowPathFinder(!showPathFinder)}
                className={`absolute bottom-6 right-6 z-20 flex items-center gap-2 px-5 py-3 rounded-full shadow-2xl text-sm font-bold transition-all hover:scale-105 ${showPathFinder
                    ? "bg-gray-800 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
            >
                <Search className="h-4 w-4" />
                {showPathFinder ? "패널 닫기" : "🔍 경로 찾기"}
            </button>

            {/* ResourcePathFinder Slide Panel */}
            {showPathFinder && (
                <ResourcePathFinder
                    facilities={facilities}
                    onFocusLocation={handleFocusLocation}
                    onClose={() => setShowPathFinder(false)}
                />
            )}
        </div>
    );
}
