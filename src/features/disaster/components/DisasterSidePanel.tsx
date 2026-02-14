import { X, CloudRain, Wind, Zap, AlertTriangle, Info, Waves } from "lucide-react";
import type { DisasterRegionStats, DisasterAlert, DisasterType } from "../lib/disaster-types";

interface DisasterSidePanelProps {
    stats: DisasterRegionStats | null;
    onClose: () => void;
}

const DISASTER_TYPE_LABELS: Record<DisasterType, { label: string; color: string }> = {
    typhoon: { label: "태풍", color: "text-blue-600" },
    flood: { label: "홍수/호우", color: "text-sky-600" },
    earthquake: { label: "지진", color: "text-yellow-600" },
    landslide_risk: { label: "산사태위험", color: "text-green-600" },
};

export default function DisasterSidePanel({ stats, onClose }: DisasterSidePanelProps) {
    if (!stats) return null;

    return (
        <div className="h-full flex flex-col overflow-hidden bg-white rounded-l-2xl shadow-lg border-l border-gray-100">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    {stats.region}
                    <span className="text-sm font-normal text-gray-500">재난 현황</span>
                </h3>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                >
                    <X className="h-4 w-4 text-gray-500" />
                </button>
            </div>

            {/* 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

                {/* 알림 메시지 */}
                <div className="bg-blue-50 p-3 rounded-lg flex gap-3 items-start">
                    <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                        하단 <strong>상세 분석 패널</strong>에서 연도별 추이와 월별 분포 등 더 자세한 시각화 정보를 확인하실 수 있습니다.
                    </p>
                </div>

                {/* 요약 통계 카드 */}
                <div className="grid grid-cols-2 gap-3">
                    <StatCard
                        icon={<Wind className="h-4 w-4 text-blue-500" />}
                        label="태풍"
                        count={stats.typhoonCount}
                        bgColor="bg-blue-50"
                        textColor="text-blue-700"
                    />
                    <StatCard
                        icon={<CloudRain className="h-4 w-4 text-sky-500" />}
                        label="호우/홍수"
                        count={stats.floodCount}
                        bgColor="bg-sky-50"
                        textColor="text-sky-700"
                    />
                    <StatCard
                        icon={<Zap className="h-4 w-4 text-yellow-500" />}
                        label="지진"
                        count={stats.earthquakeCount}
                        bgColor="bg-yellow-50"
                        textColor="text-yellow-700"
                    />
                    <StatCard
                        icon={<Waves className="h-4 w-4 text-green-500" />}
                        label="산사태"
                        count={stats.landslideRiskCount}
                        bgColor="bg-green-50"
                        textColor="text-green-700"
                    />
                </div>

                {/* 총 재난 건수 */}
                <div className="p-4 bg-red-50 rounded-xl flex items-center justify-between border border-red-100">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-bold text-red-700">총 발생 건수</span>
                    </div>
                    <span className="text-2xl font-extrabold text-red-800">{stats.totalCount}건</span>
                </div>

                {/* 최근 재난 이력 (간략) */}
                <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3">최근 발생 이력</h4>
                    <div className="space-y-2">
                        {stats.recentAlerts.length === 0 ? (
                            <p className="text-xs text-gray-400 py-4 text-center bg-gray-50 rounded-lg">재난 이력이 없습니다.</p>
                        ) : (
                            stats.recentAlerts.slice(0, 8).map((alert, i) => (
                                <AlertRow key={i} alert={alert} />
                            ))
                        )}
                        {stats.recentAlerts.length > 8 && (
                            <p className="text-xs text-center text-gray-400 pt-2">...더 많은 이력은 하단 분석 패널 참조</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, count, bgColor, textColor }: { icon: React.ReactNode, label: string, count: number, bgColor: string, textColor: string }) {
    return (
        <div className={`${bgColor} p-3 rounded-xl flex flex-col items-center justify-center gap-1`}>
            <div className="p-1.5 bg-white/50 rounded-full mb-1">
                {icon}
            </div>
            <span className={`text-xs font-medium ${textColor} opacity-80`}>{label}</span>
            <span className={`text-xl font-bold ${textColor}`}>{count}</span>
        </div>
    );
}

function AlertRow({ alert }: { alert: DisasterAlert }) {
    const typeInfo = DISASTER_TYPE_LABELS[alert.disasterType];
    return (
        <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
            <div className="flex items-center gap-3">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${alert.alertLevel === 'warning'
                        ? 'bg-red-50 text-red-600 border-red-100'
                        : 'bg-orange-50 text-orange-600 border-orange-100'
                    }`}>
                    {alert.alertLevel === 'warning' ? '경보' : '주의보'}
                </span>
                <div className="flex flex-col">
                    <span className={`text-xs font-bold ${typeInfo.color}`}>
                        {typeInfo.label}
                    </span>
                    <span className="text-[10px] text-gray-400">{alert.date}</span>
                </div>
            </div>
            {alert.magnitude && (
                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                    M {alert.magnitude}
                </span>
            )}
        </div>
    );
}
