import { useState, useEffect } from "react";
import { Eye, EyeOff, CloudSun, AlertTriangle, Building } from "lucide-react";

const STORAGE_KEY = "hidden_sectors";

type SectorKey = "welfare" | "climate" | "disaster";

const SECTORS: { key: SectorKey; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "welfare",  label: "복지자원",  icon: <Building className="h-4 w-4" />,     color: "indigo" },
    { key: "climate",  label: "기후대응",  icon: <CloudSun className="h-4 w-4" />,      color: "orange" },
    { key: "disaster", label: "자연재난",  icon: <AlertTriangle className="h-4 w-4" />, color: "red"    },
];

function loadHidden(): SectorKey[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

export default function SectorSettings() {
    const [hidden, setHidden] = useState<SectorKey[]>(loadHidden);

    const toggle = (key: SectorKey) => {
        const next = hidden.includes(key) ? hidden.filter(k => k !== key) : [...hidden, key];
        setHidden(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("sectors-changed"));
    };

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">섹터 노출 설정</h3>
                <p className="text-xs text-gray-500">비활성화해도 데이터·분석 기능은 유지됩니다. 상단 탭에서 해당 섹터가 숨겨집니다.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {SECTORS.map(({ key, label, icon, color }) => {
                    const isVisible = !hidden.includes(key);
                    return (
                        <div key={key} className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-3">
                                <span className={`p-1.5 rounded-lg bg-${color}-50 text-${color}-600`}>{icon}</span>
                                <span className="text-sm font-medium text-gray-800">{label}</span>
                            </div>
                            <button
                                onClick={() => toggle(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    isVisible
                                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                }`}
                            >
                                {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                {isVisible ? "표시 중" : "숨김"}
                            </button>
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-gray-400">돌봄현황·Q&A 탭은 항상 표시됩니다.</p>
        </div>
    );
}
