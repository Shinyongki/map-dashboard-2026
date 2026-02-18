import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import DashboardLayout from "@/components/DashboardLayout";
import { fetchWeatherAlerts } from "@/features/climate/lib/climate-api";
import { fetchDisasterAlerts } from "@/features/disaster/lib/disaster-api";

// Prefetch climate & disaster data on app load
const DEFAULT_YEARS = [2021, 2022, 2023, 2024, 2025];
const apiKey = import.meta.env.VITE_KMA_API_KEY;

if (apiKey) {
    queryClient.prefetchQuery({
        queryKey: ["climate-alerts", 2021, 2025],
        queryFn: async () => {
            const results = await Promise.all(DEFAULT_YEARS.map(fetchWeatherAlerts));
            return results.flat();
        },
    });

    queryClient.prefetchQuery({
        queryKey: ["disaster-alerts", 2021, 2025],
        queryFn: async () => {
            const results = await Promise.all(DEFAULT_YEARS.map(fetchDisasterAlerts));
            return results.flat();
        },
    });
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <Toaster />
                <DashboardLayout />
            </TooltipProvider>
        </QueryClientProvider>
    );
}
