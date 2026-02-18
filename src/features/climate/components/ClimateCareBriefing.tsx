import { useMemo } from "react";
import {
    AlertTriangle,
    Users,
    UserCheck,
    Flame,
    Snowflake,
    CloudRain,
    Wind,
    Activity,
} from "lucide-react";
import {
    useCareStatusByRegion,
    type RegionCareStatus,
} from "../hooks/useCareStatusByRegion";

type AlertKind = "폭염" | "한파" | "태풍" | "호우" | "지진";

interface ClimateCareBriefingProps {
    alertRegions: string[];
    alertType: AlertKind;
}

const ALERT_CONFIG: Record<
    AlertKind,
    { icon: typeof Flame; color: string; bg: string; border: string; label: string }
> = {
    폭염: {
        icon: Flame,
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        label: "폭염특보",
    },
    한파: {
        icon: Snowflake,
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        label: "한파특보",
    },
    태풍: {
        icon: Wind,
        color: "text-purple-600",
        bg: "bg-purple-50",
        border: "border-purple-200",
        label: "태풍특보",
    },
    호우: {
        icon: CloudRain,
        color: "text-cyan-600",
        bg: "bg-cyan-50",
        border: "border-cyan-200",
        label: "호우특보",
    },
    지진: {
        icon: Activity,
        color: "text-orange-600",
        bg: "bg-orange-50",
        border: "border-orange-200",
        label: "지진발생",
    },
};

export default function ClimateCareBriefing({
    alertRegions,
    alertType,
}: ClimateCareBriefingProps) {
    const { statuses, loading } = useCareStatusByRegion();

    const alertStatuses = useMemo(() => {
        if (!alertRegions.length || !statuses.length) return [];
        return alertRegions
            .map((region) => statuses.find((s) => s.sigun === region))
            .filter((s): s is RegionCareStatus => !!s);
    }, [alertRegions, statuses]);

    // 특보 없거나 데이터 없으면 렌더링 안 함
    if (!alertRegions.length || loading || !alertStatuses.length) return null;

    const config = ALERT_CONFIG[alertType];
    const Icon = config.icon;

    return (
        <div
            className={`${config.bg} ${config.border} border rounded-2xl p-4 mb-4`}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <div
                    className={`flex items-center justify-center w-7 h-7 rounded-lg ${config.bg}`}
                >
                    <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                <div>
                    <h3 className={`text-sm font-bold ${config.color}`}>
                        {config.label} 발령 지역 돌봄 현황
                    </h3>
                    <p className="text-xs text-gray-500">
                        {alertRegions.length}개 시군 · 특보 발령 중
                    </p>
                </div>
                <AlertTriangle className={`h-4 w-4 ${config.color} ml-auto animate-pulse`} />
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {alertStatuses.map((status) => (
                    <CareStatusCard
                        key={status.sigun}
                        status={status}
                        alertType={alertType}
                        config={config}
                    />
                ))}
            </div>

            {/* Summary */}
            <div className="mt-3 pt-3 border-t border-gray-200/50">
                <p className="text-xs text-gray-600 leading-relaxed">
                    {alertStatuses.map((s) => {
                        const over = s.staffPerUser > 10;
                        return (
                            <span
                                key={s.sigun}
                                className={`inline-block mr-2 mb-1 ${over
                                        ? "bg-red-100 border border-red-300 text-red-800 px-2 py-0.5 rounded-full"
                                        : ""
                                    }`}
                            >
                                {over && "🚨 "}
                                <strong>{s.sigun}</strong>: 독거노인 약{" "}
                                <strong>{s.estimatedSolitary.toLocaleString()}</strong>명, 1인당{" "}
                                <strong className={over ? "text-red-700" : "text-gray-800"}>
                                    {s.staffPerUser}
                                </strong>
                                명
                            </span>
                        );
                    })}
                </p>
            </div>
        </div>
    );
}

// ─── Care Status Card ──────────────────────────────────────

function CareStatusCard({
    status,
    alertType,
    config,
}: {
    status: RegionCareStatus;
    alertType: AlertKind;
    config: (typeof ALERT_CONFIG)[AlertKind];
}) {
    const Icon = config.icon;
    const isOverloaded = status.staffPerUser > 10;
    // 과부하 심각도: 10 이하 = 0%, 20 이상 = 100%
    const severityPct = isOverloaded
        ? Math.min(((status.staffPerUser - 10) / 10) * 100, 100)
        : 0;

    return (
        <div
            className={`rounded-xl p-3 border shadow-sm transition-all ${isOverloaded
                ? "bg-red-50 border-red-300 ring-2 ring-red-200 ring-offset-1"
                : "bg-white border-gray-100"
                }`}
        >
            {/* 과부하 배너 */}
            {isOverloaded && (
                <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-red-600 rounded-lg">
                    <AlertTriangle className="h-3 w-3 text-white animate-pulse" />
                    <span className="text-[10px] font-bold text-white tracking-wide">
                        🚨 돌봄 과부하 — 1인당 {status.staffPerUser}명
                    </span>
                </div>
            )}

            {/* Region header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <Icon className={`h-3.5 w-3.5 ${isOverloaded ? "text-red-600" : config.color}`} />
                    <span className={`text-xs font-bold ${isOverloaded ? "text-red-900" : "text-gray-900"}`}>
                        {status.sigun}
                    </span>
                </div>
                <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${isOverloaded ? "bg-red-100 text-red-700" : `${config.bg} ${config.color}`
                        }`}
                >
                    {alertType}
                </span>
            </div>

            {/* Stats */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1 text-[11px] ${isOverloaded ? "text-red-600" : "text-gray-500"}`}>
                        <Users className="h-3 w-3" />
                        독거노인 추정
                    </span>
                    <span className={`text-xs font-bold ${isOverloaded ? "text-red-900" : "text-gray-900"}`}>
                        {status.estimatedSolitary.toLocaleString()}명
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1 text-[11px] ${isOverloaded ? "text-red-600" : "text-gray-500"}`}>
                        <UserCheck className="h-3 w-3" />
                        종사자
                    </span>
                    <span className={`text-xs font-medium ${isOverloaded ? "text-red-800" : "text-gray-700"}`}>
                        {status.socialWorkers + status.careProviders}명
                        <span className={`ml-1 ${isOverloaded ? "text-red-400" : "text-gray-400"}`}>
                            (복지사 {status.socialWorkers} + 돌봄 {status.careProviders})
                        </span>
                    </span>
                </div>

                {/* 1인당 담당 + 과부하 게이지 */}
                <div>
                    <div className="flex items-center justify-between">
                        <span className={`text-[11px] ${isOverloaded ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                            1인당 담당
                        </span>
                        <span
                            className={`text-xs font-bold ${isOverloaded ? "text-red-700" : "text-gray-900"
                                }`}
                        >
                            {status.staffPerUser}명
                        </span>
                    </div>
                    {isOverloaded && (
                        <div className="mt-1 h-1.5 w-full bg-red-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-red-500 rounded-full transition-all"
                                style={{ width: `${severityPct}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
