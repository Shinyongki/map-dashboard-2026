import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import DashboardLayout from "@/components/DashboardLayout";

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
