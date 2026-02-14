import { Users, Building2, ClipboardCheck, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { RegionStats } from "../lib/map-types";

interface MapMetricCardsProps {
    totalStats: {
        submissions: number;
        totalOrganizations: number;
        submissionRate: number;
    };
    regionStatsMap: Map<string, RegionStats>;
}

export default function MapMetricCards({ totalStats, regionStatsMap }: MapMetricCardsProps) {
    let totalWorkers = 0;
    let totalUsers = 0;
    let totalNewUsers = 0;

    regionStatsMap.forEach((s) => {
        // 일반 서비스 인력(사회복지사 + 생활지원사)
        totalWorkers += s.sw_m + s.sw_f + s.cg_m + s.cg_f;

        // 광역지원기관(의령군) 인력 반영 (3,132명 기준):
        // 의령군의 단기 전담사회복지사(5명)만 전체 종사자에 포함하고, 타 기관의 퇴원환자 단기인력은 제외
        if (s.region === "의령군") {
            totalWorkers += s.short_sw_m + s.short_sw_f;
        }

        // 특화 및 신규 대상자는 일반/중점 이용자 수에 포함되어 있으므로 총합 계산 시 제외 (중복 방지)
        totalUsers += s.gen_m_gen + s.gen_f_gen + s.gen_m_int + s.gen_f_int + s.short_m + s.short_f;
        totalNewUsers += s.new_m + s.new_f + s.short_new_m + s.short_new_f;
    });

    const metrics = [
        {
            label: "제출 현황",
            value: `${totalStats.submissions} / ${totalStats.totalOrganizations}`,
            subValue: `제출률 ${totalStats.submissionRate}%`,
            icon: ClipboardCheck,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
        },
        {
            label: "전체 종사자",
            value: `${totalWorkers.toLocaleString()}명`,
            subValue: "전담인력 및 돌봄제공자",
            icon: Building2,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
        },
        {
            label: "전체 이용자",
            value: `${totalUsers.toLocaleString()}명`,
            subValue: "일반·중점·특화·단기 합계",
            icon: Users,
            color: "text-indigo-600",
            bgColor: "bg-indigo-50",
        },
        {
            label: "당월 신규",
            value: `${totalNewUsers.toLocaleString()}명`,
            subValue: "신규 대상자 유입 현황",
            icon: UserPlus,
            color: "text-orange-600",
            bgColor: "bg-orange-50",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {metrics.map((m, i) => (
                <Card key={i} className="border-none shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                        <div className="flex items-center p-4">
                            <div className={`p-3 rounded-xl ${m.bgColor} mr-4`}>
                                <m.icon className={`h-6 w-6 ${m.color}`} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{m.label}</p>
                                <h3 className="text-xl font-bold text-gray-900 leading-tight mt-0.5">{m.value}</h3>
                                <p className="text-[10px] text-gray-400 mt-0.5">{m.subValue}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
