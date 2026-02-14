import type { ClimateMapMode } from "../lib/climate-types";
import { getClimateLegendItems } from "../lib/climate-colors";

interface ClimateLegendProps {
    mode: ClimateMapMode;
}

export default function ClimateLegend({ mode }: ClimateLegendProps) {
    const items = getClimateLegendItems(mode);

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-gray-500">범례:</span>
            {items.map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                    <div
                        className="w-4 h-3 rounded-sm border border-gray-200"
                        style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-gray-600">{item.label}</span>
                </div>
            ))}
        </div>
    );
}
