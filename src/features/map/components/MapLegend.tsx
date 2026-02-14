import { getLegendItems } from "../lib/map-colors";
import type { MapMode, MapTheme } from "../lib/map-types";
import { Info } from "lucide-react";

interface MapLegendProps {
  mapMode: MapMode;
  mapTheme: MapTheme;
}

export default function MapLegend({ mapMode, mapTheme = "sky" }: MapLegendProps) {
  const currentLegendItems = getLegendItems(mapTheme, mapMode);

  const getHeader = () => {
    switch (mapMode) {
      case "balance": return "인력 수급 균형";
      case "special": return "특화지원 현황";
      case "short_term": return "단기집중 현황";
      case "termination": return "종결자 현황";
      case "staff": return "종사자 충족률";
      case "user": return "이용자 충족률";
      case "new_term": return "신규 발생 밀도";
      case "submission":
      default: return "제출 완료율";
    }
  };

  const getExplanation = () => {
    switch (mapMode) {
      case "staff":
      case "user":
        return "배정 목표 인원 대비 현재 인원의 충족률을 나타냅니다.";
      case "new_term":
        return "당월 신규 발생량의 절대적 숫자를 기준으로 지역별 밀도를 나타냅니다.";
      case "balance":
        return "종사자 채용률과 이용자 매칭률의 차이를 비교하여 인력 수급 불균형을 나타냅니다.";
      case "special":
        return "지역별 특화지원 서비스 이용자 수의 상대적 분포를 나타냅니다.";
      case "short_term":
        return "퇴원환자 단기집중 서비스 이용자 수의 상대적 분포를 나타냅니다.";
      case "termination":
        return "당월 일반/중점 서비스 종결자 발생량의 상대적 분포를 나타냅니다.";
      case "submission":
      default:
        return "전체 수행기관 중 데이터를 제출한 기관의 비율을 나타냅니다.";
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700 whitespace-nowrap">{getHeader()}:</span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {currentLegendItems.map((item: any) => (
              <div key={item.label} className="flex items-center gap-1.5 shrink-0">
                <div
                  className="w-3.5 h-3 rounded-sm border border-gray-200"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-gray-500 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="md:ml-auto flex items-center gap-2 text-blue-600 bg-blue-50/50 px-3 py-2 rounded-lg border border-blue-100/50">
          <Info size={14} className="shrink-0" />
          <span className="text-[11px] font-semibold leading-tight">
            {getExplanation()}
          </span>
        </div>
      </div>
    </div>
  );
}
