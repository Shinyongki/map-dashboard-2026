import { useQuery } from "@tanstack/react-query";
import type { InstitutionProfile } from "../lib/map-types";

export function useInstitutionProfiles() {
    return useQuery<InstitutionProfile[]>({
        queryKey: ["institution-profiles"],
        queryFn: () => fetch("/data/institution_profiles.json").then(res => res.json()),
        staleTime: Infinity,
    });
}

export function useInstitutionProfile(code: string | null, profiles?: InstitutionProfile[]) {
    if (!code || !profiles) return null;
    return profiles.find(p => p.code === code) ?? null;
}
