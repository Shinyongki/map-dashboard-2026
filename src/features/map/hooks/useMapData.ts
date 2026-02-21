import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { SurveyData } from "@/lib/validation";
import type { DiscrepancyData, AssignmentChangeData } from "../lib/map-types";

// ── Fallback 보정 함수 ──
function patchFallbackSurveys(raw: SurveyData[]): SurveyData[] {
  return raw.map((r) => ({
    ...r,
    단기_당월신규: (r.단기_당월신규_남 ?? 0) + (r.단기_당월신규_여 ?? 0),
    단기_기간만료: (r.단기_기간만료_남 ?? 0) + (r.단기_기간만료_여 ?? 0),
    단기_중도포기: (r.단기_중도포기_남 ?? 0) + (r.단기_중도포기_여 ?? 0),
  }));
}

// 사용 가능한 월(시트) 목록 조회
export function useAvailableMonths() {
  return useQuery<string[]>({
    queryKey: ["/api/admin/sheets"],
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(queryKey[0] as string);
        if (!res.ok) throw new Error("API Error");
        return res.json();
      } catch {
        // Fallback for offline mode
        return ["2026년 2월"];
      }
    },
    retry: 1,
  });
}

// 선택된 월의 설문 데이터 조회 (fallback 포함)
export function useSurveys(selectedMonth: string) {
  const query = useQuery<SurveyData[]>({
    queryKey: ["/api/admin/surveys", selectedMonth],
    queryFn: async ({ queryKey }) => {
      try {
        const [url, sheet] = queryKey;
        const res = await fetch(`${url}?sheetName=${encodeURIComponent(sheet as string)}`);
        if (!res.ok) throw new Error("API 응답 실패");
        const data = await res.json();
        return data;
      } catch {
        console.warn("[fallback] API 응답 없음 — 로컬 데이터 사용 중");
        const fallback = await import("../../../../surveys_raw_clean.json");
        const patched = patchFallbackSurveys(fallback.default as SurveyData[]);
        // Mark as fallback data
        (patched as any).isFallback = true;
        return patched;
      }
    },
    enabled: !!selectedMonth,
    retry: 1,
  });

  return { ...query, isFallback: (query.data as any)?.isFallback ?? false };
}

// 오기입 의심 데이터 조회
export function useDiscrepancies(selectedMonth: string) {
  return useQuery<DiscrepancyData[]>({
    queryKey: ["/api/admin/discrepancies", selectedMonth],
    queryFn: async ({ queryKey }) => {
      const [url, sheet] = queryKey;
      const res = await fetch(`${url}?sheetName=${encodeURIComponent(sheet as string)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedMonth,
  });
}

// 배정인원 변경 현황 (월별)
export function useAssignmentChanges(selectedMonth: string) {
  return useQuery<AssignmentChangeData[]>({
    queryKey: ["/api/admin/assignment-changes", selectedMonth],
    queryFn: async ({ queryKey }) => {
      const [url, sheet] = queryKey;
      const res = await fetch(`${url}?sheetName=${encodeURIComponent(sheet as string)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedMonth,
  });
}

