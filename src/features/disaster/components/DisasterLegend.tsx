import type { DisasterMapMode } from "../lib/disaster-types";
import { getDisasterLegendItems } from "../lib/disaster-colors";

interface DisasterLegendProps {
    mode: DisasterMapMode;
}

export default function DisasterLegend({ mode }: DisasterLegendProps) {
    const items = getDisasterLegendItems(mode);

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
