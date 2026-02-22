import { useState, useEffect } from "react";
import { SIGUN_LIST } from "@/features/welfare/lib/welfare-types";

export interface RegionCareStatus {
    sigun: string;
    agencyCount: number;
    socialWorkers: number;
    careProviders: number;
    users: number;
    staffPerUser: number;
}

export function useCareStatusByRegion() {
    const [statuses, setStatuses] = useState<RegionCareStatus[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/data/institution_profiles.json")
            .then((res) => res.json())
            .then((data: any[]) => {
                // 시군별 집계
                const sigunMap = new Map<
                    string,
                    {
                        agencyCount: number;
                        socialWorkers: number;
                        careProviders: number;
                        users: number;
                    }
                >();

                // 초기화
                SIGUN_LIST.forEach((s) =>
                    sigunMap.set(s, {
                        agencyCount: 0,
                        socialWorkers: 0,
                        careProviders: 0,
                        users: 0,
                    })
                );

                data.forEach((p: any) => {
                    // 시군 추출
                    const region = p.region || "";
                    const address = p.address || "";
                    let sigun = "";

                    for (const s of SIGUN_LIST) {
                        const base = s.replace("시", "").replace("군", "");
                        if (region.includes(base) || address.includes(s)) {
                            sigun = s;
                            break;
                        }
                    }

                    if (!sigun || !sigunMap.has(sigun)) return;

                    const entry = sigunMap.get(sigun)!;
                    entry.agencyCount += 1;
                    entry.socialWorkers += p.allocation?.actual?.socialWorkerHired ?? 0;
                    entry.careProviders += p.allocation?.actual?.careProviderHired ?? 0;
                    entry.users += p.allocation?.actual?.usersServed ?? 0;
                });

                const result: RegionCareStatus[] = [];
                sigunMap.forEach((val, sigun) => {
                    const totalStaff = val.socialWorkers + val.careProviders;
                    result.push({
                        sigun,
                        agencyCount: val.agencyCount,
                        socialWorkers: val.socialWorkers,
                        careProviders: val.careProviders,
                        users: val.users,
                        staffPerUser:
                            totalStaff > 0 && val.users > 0
                                ? Math.round((val.users / totalStaff) * 10) / 10
                                : 0,
                    });
                });

                setStatuses(result);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load care status:", err);
                setLoading(false);
            });
    }, []);

    return { statuses, loading };
}
