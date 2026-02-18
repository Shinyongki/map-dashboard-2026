import React from 'react';
import { X, Snowflake, Sun, AlertTriangle, Info } from "lucide-react";
import type { ClimateRegionStats, WeatherAlert, AlertType } from "../lib/climate-types";

interface ClimateSidePanelProps {
    stats: ClimateRegionStats | null;
    onClose: () => void;
}

const ALERT_TYPE_LABELS: Record<AlertType, { label: string; color: string }> = {
    cold_advisory: { label: "한파주의보", color: "text-sky-600" },
    cold_warning: { label: "한파경보", color: "text-sky-800" },
    heat_advisory: { label: "폭염주의보", color: "text-orange-500" },
    heat_warning: { label: "폭염경보", color: "text-red-600" },
};

export default function ClimateSidePanel({ stats, onClose }: ClimateSidePanelProps) {
    if (!stats) return null;

    return (
        <div className="h-full flex flex-col overflow-hidden bg-white rounded-l-2xl shadow-lg border-l border-gray-100">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    {stats.region}
                    <span className="text-sm font-normal text-gray-500">요약 정보</span>
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
                        icon={<Snowflake className="h-4 w-4 text-sky-500" />}
                        label="한파주의보"
                        count={stats.coldAdvisoryCount}
                        bgColor="bg-sky-50"
                        textColor="text-sky-700"
                    />
                    <StatCard
                        icon={<Snowflake className="h-4 w-4 text-sky-700" />}
                        label="한파경보"
                        count={stats.coldWarningCount}
                        bgColor="bg-sky-100"
                        textColor="text-sky-800"
                    />
                    <StatCard
                        icon={<Sun className="h-4 w-4 text-orange-400" />}
                        label="폭염주의보"
                        count={stats.heatAdvisoryCount}
                        bgColor="bg-orange-50"
                        textColor="text-orange-700"
                    />
                    <StatCard
                        icon={<Sun className="h-4 w-4 text-red-500" />}
                        label="폭염경보"
                        count={stats.heatWarningCount}
                        bgColor="bg-red-50"
                        textColor="text-red-700"
                    />
                </div>

                {/* 총 특보 건수 */}
                <div className="p-4 bg-purple-50 rounded-xl flex items-center justify-between border border-purple-100">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-purple-600" />
                        <span className="text-sm font-bold text-purple-700">총 발령 건수</span>
                    </div>
                    <span className="text-2xl font-extrabold text-purple-800">{stats.totalAlertCount}건</span>
                </div>

                {/* 최근 특보 이력 (간략) */}
                <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3">최근 특보 이력</h4>
                    <div className="space-y-2">
                        {stats.recentAlerts.length === 0 ? (
                            <p className="text-xs text-gray-400 py-4 text-center bg-gray-50 rounded-lg">특보 이력이 없습니다.</p>
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

function StatCard({
    icon,
    label,
    count,
    bgColor,
    textColor,
}: {
    icon: React.ReactNode;
    label: string;
    count: number;
    bgColor: string;
    textColor: string;
}) {
    return (
        <div className={`${bgColor} rounded-lg p-3`}>
            <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <span className="text-xs text-gray-600">{label}</span>
            </div>
            <span className={`text-lg font-bold ${textColor}`}>{count}건</span>
        </div>
    );
}

function AlertRow({ alert }: { alert: WeatherAlert }) {
    const { label, color } = ALERT_TYPE_LABELS[alert.alertType];
    return (
        <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded text-xs">
            <span className="text-gray-500">{alert.startDate}</span>
            <span className={`font-medium ${color}`}>{label}</span>
        </div>
    );
}
