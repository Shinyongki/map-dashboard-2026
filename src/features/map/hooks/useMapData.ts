import { useQuery } from "@tanstack/react-query";
import type { SurveyData } from "@/lib/validation";
import type { DiscrepancyData, AssignmentChangeData } from "../lib/map-types";

// 사용 가능한 월(시트) 목록 조회
export function useAvailableMonths() {
  return useQuery<string[]>({
    queryKey: ["/api/admin/sheets"],
  });
}

// 선택된 월의 설문 데이터 조회
export function useSurveys(selectedMonth: string) {
  return useQuery<SurveyData[]>({
    queryKey: ["/api/admin/surveys", selectedMonth],
    queryFn: async ({ queryKey }) => {
      const [url, sheet] = queryKey;
      const res = await fetch(`${url}?sheetName=${sheet}`);
      if (!res.ok) throw new Error("데이터를 불러오는데 실패했습니다");
      return res.json();
    },
    enabled: !!selectedMonth,
  });
}

// 오기입 의심 데이터 조회
export function useDiscrepancies(selectedMonth: string) {
  return useQuery<DiscrepancyData[]>({
    queryKey: ["/api/admin/discrepancies", selectedMonth],
    queryFn: async ({ queryKey }) => {
      const [url, sheet] = queryKey;
      const res = await fetch(`${url}?sheetName=${sheet}`);
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
      const res = await fetch(`${url}?sheetName=${sheet}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedMonth,
  });
}
