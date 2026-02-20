import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import DashboardLayout from "@/components/DashboardLayout";
import NomaPopupPage from "@/features/ai/components/NomaPopupPage";
import { fetchWeatherAlerts } from "@/features/climate/lib/climate-api";
import { fetchDisasterAlerts } from "@/features/disaster/lib/disaster-api";

// Popup window mode: render standalone NOMA chat
const isNomaPopup = new URLSearchParams(window.location.search).get("noma") === "popup";

// Prefetch climate & disaster data on app load (skip in popup mode)
const DEFAULT_YEARS = [2021, 2022, 2023, 2024, 2025];
const apiKey = import.meta.env.VITE_KMA_API_KEY;

if (!isNomaPopup && apiKey) {
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
    if (isNomaPopup) {
        return <NomaPopupPage />;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <Toaster />
                <DashboardLayout />
            </TooltipProvider>
        </QueryClientProvider>
    );
}
