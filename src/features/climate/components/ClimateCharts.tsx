import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer,
} from "recharts";
import type { YearlyBreakdown, MonthlyBreakdown } from "../lib/climate-types";

interface YearlyChartProps {
    data: YearlyBreakdown[];
}

export function YearlyTrendChart({ data }: YearlyChartProps) {
    return (
        <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" fontSize={11} tickFormatter={(v) => `${v}년`} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        labelFormatter={(v) => `${v}년`}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="coldAdvisoryCount" name="한파주의보" stackId="a" fill="#7dd3fc" />
                    <Bar dataKey="coldWarningCount" name="한파경보" stackId="a" fill="#0284c7" />
                    <Bar dataKey="heatAdvisoryCount" name="폭염주의보" stackId="a" fill="#fdba74" />
                    <Bar dataKey="heatWarningCount" name="폭염경보" stackId="a" fill="#ea580c" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

interface MonthlyChartProps {
    data: MonthlyBreakdown[];
}

export function MonthlyDistributionChart({ data }: MonthlyChartProps) {
    const chartData = data.map(d => ({
        ...d,
        name: `${d.month}월`,
    }));

    return (
        <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="coldAdvisoryCount" name="한파주의보" stackId="a" fill="#7dd3fc" />
                    <Bar dataKey="coldWarningCount" name="한파경보" stackId="a" fill="#0284c7" />
                    <Bar dataKey="heatAdvisoryCount" name="폭염주의보" stackId="a" fill="#fdba74" />
                    <Bar dataKey="heatWarningCount" name="폭염경보" stackId="a" fill="#ea580c" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
