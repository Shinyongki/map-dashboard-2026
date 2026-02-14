import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MapMode, MapTheme } from "../lib/map-types";
import { LayoutDashboard } from "lucide-react";

interface MapHeaderProps {
  selectedMonth: string;
  availableMonths: string[];
  onMonthChange: (month: string) => void;
  totalSubmissions: number;
  totalOrganizations: number;
  submissionRate: number;
  mapMode: MapMode;
  onMapModeChange: (mode: MapMode) => void;
  mapTheme: MapTheme;
  onMapThemeChange: (theme: MapTheme) => void;
}

export default function MapHeader({
  selectedMonth,
  availableMonths,
  onMonthChange,
  totalSubmissions,
  totalOrganizations,
  submissionRate,
  mapMode,
  onMapModeChange,
  mapTheme,
  onMapThemeChange,
}: MapHeaderProps) {
  const formatMonth = (month: string) => {
    const match = month.match(/^(\d{4})_(\d{1,2})월$/);
    if (!match) return month;
    return `${match[1]}년 ${match[2]}월`;
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            경상남도 노인맞춤돌봄서비스 현황
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            시군별 데이터를 지도 모드 전환을 통해 상세히 확인하세요
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex flex-col gap-1 w-full md:w-auto">
            <span className="text-[10px] font-bold text-gray-400 ml-1 uppercase tracking-tight">Map Mode</span>
            <Tabs
              value={mapMode}
              onValueChange={(v) => onMapModeChange(v as MapMode)}
              className="w-full md:w-auto"
            >
              <TabsList className="grid grid-cols-4 md:flex md:flex-wrap h-auto gap-1 p-1 bg-gray-100/80">
                <TabsTrigger value="submission" className="text-xs px-2 py-1.5 h-auto">제출현황</TabsTrigger>
                <TabsTrigger value="staff" className="text-xs px-2 py-1.5 h-auto">종사자</TabsTrigger>
                <TabsTrigger value="user" className="text-xs px-2 py-1.5 h-auto">이용자</TabsTrigger>
                <TabsTrigger value="new_term" className="text-xs px-2 py-1.5 h-auto">성과(전체)</TabsTrigger>
                <TabsTrigger value="balance" className="text-xs px-2 py-1.5 h-auto">수급 균형</TabsTrigger>
                <TabsTrigger value="special" className="text-xs px-2 py-1.5 h-auto">특화지원</TabsTrigger>
                <TabsTrigger value="short_term" className="text-xs px-2 py-1.5 h-auto">단기집중</TabsTrigger>
                <TabsTrigger value="termination" className="text-xs px-2 py-1.5 h-auto">종결자</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col gap-1 w-full md:w-auto">
            <span className="text-[10px] font-bold text-gray-400 ml-1 uppercase tracking-tight">Map Theme</span>
            <Tabs
              value={mapTheme}
              onValueChange={(v) => onMapThemeChange(v as MapTheme)}
              className="w-full md:w-auto"
            >
              <TabsList className="grid grid-cols-2 md:inline-flex h-9 p-1 bg-gray-100/80">
                <TabsTrigger
                  value="sky"
                  className="text-xs px-4 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Sky
                </TabsTrigger>
                <TabsTrigger
                  value="forest"
                  className="text-xs px-4 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                >
                  Forest
                </TabsTrigger>
                <TabsTrigger
                  value="infographic"
                  className="text-xs px-4 data-[state=active]:bg-indigo-950 data-[state=active]:text-indigo-400 data-[state=active]:border-indigo-500/50 data-[state=active]:border"
                >
                  Infographic
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Total Progress</div>
            <div className="text-xl font-black text-gray-900 tracking-tight">
              {totalSubmissions}
              <span className="text-sm font-medium text-gray-400 ml-1">
                / {totalOrganizations}
              </span>
              <span
                className={`ml-3 text-sm font-bold ${submissionRate >= 100
                  ? "text-emerald-600"
                  : submissionRate >= 50
                    ? "text-amber-500"
                    : "text-rose-500"
                  }`}
              >
                {submissionRate}%
              </span>
            </div>
          </div>
          <div className="h-10 w-px bg-gray-200 hidden md:block" />
          <Select value={selectedMonth} onValueChange={onMonthChange}>
            <SelectTrigger className="w-full md:w-[180px] h-10 border-gray-200 bg-gray-50/50 hover:bg-white transition-colors">
              <SelectValue placeholder="월 선택" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatMonth(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <a
        href="https://jongsaja.vercel.app/admin"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors shadow-sm self-end sm:self-auto"
      >
        <LayoutDashboard className="w-4 h-4" />
        관리자 대시보드
      </a>
    </div>
  );
}
