import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer,
} from "recharts";
import type { DisasterYearlyBreakdown, DisasterMonthlyBreakdown } from "../lib/disaster-types";

interface YearlyChartProps {
    data: DisasterYearlyBreakdown[];
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
                    <Bar dataKey="typhoonCount" name="태풍" stackId="a" fill="#6366f1" />
                    <Bar dataKey="floodCount" name="홍수" stackId="a" fill="#38bdf8" />
                    <Bar dataKey="earthquakeCount" name="지진" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="landslideRiskCount" name="산사태위험" stackId="a" fill="#4ade80" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

interface MonthlyChartProps {
    data: DisasterMonthlyBreakdown[];
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
                    <Bar dataKey="typhoonCount" name="태풍" stackId="a" fill="#6366f1" />
                    <Bar dataKey="floodCount" name="홍수" stackId="a" fill="#38bdf8" />
                    <Bar dataKey="earthquakeCount" name="지진" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="landslideRiskCount" name="산사태위험" stackId="a" fill="#4ade80" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
