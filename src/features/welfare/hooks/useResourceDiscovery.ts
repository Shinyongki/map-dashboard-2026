
import { useState, useCallback } from "react";
import type { WelfareFacility, WelfareGroup } from "../lib/welfare-types";

export interface ResourceRequest {
    id: string;
    name: string;
    address: string;
    category: string;
    group: WelfareGroup;
    description: string;
    contact: string;
    status: "pending" | "approved" | "rejected";
    submittedAt: Date;
}

// Initial mock data
const INITIAL_REQUESTS: ResourceRequest[] = [
    {
        id: "req_1",
        name: "행복한 재가노인복지센터",
        address: "경상남도 창원시 의창구 원이대로 123",
        category: "재가노인복지",
        group: "care",
        description: "신규 개설된 방문요양 센터입니다. 어르신 돌봄 서비스 제공.",
        contact: "055-123-4567",
        status: "pending",
        submittedAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
    },
    {
        id: "req_2",
        name: "진주 사랑봉사단",
        address: "경상남도 진주시 동진로 456",
        category: "자원봉사",
        group: "social",
        description: "지역 어르신 도시락 배달 봉사 단체입니다.",
        contact: "055-987-6543",
        status: "approved",
        submittedAt: new Date(Date.now() - 86400000 * 5), // 5 days ago
    },
];

export function useResourceDiscovery() {
    const [requests, setRequests] = useState<ResourceRequest[]>(INITIAL_REQUESTS);

    const submitRequest = useCallback((data: Omit<ResourceRequest, "id" | "status" | "submittedAt">) => {
        const newRequest: ResourceRequest = {
            ...data,
            id: `req_${Date.now()}`,
            status: "pending",
            submittedAt: new Date(),
        };
        setRequests((prev) => [newRequest, ...prev]);
        return newRequest;
    }, []);

    const approveRequest = useCallback((id: string) => {
        setRequests((prev) =>
            prev.map((req) => (req.id === id ? { ...req, status: "approved" } : req))
        );
    }, []);

    const rejectRequest = useCallback((id: string) => {
        setRequests((prev) =>
            prev.map((req) => (req.id === id ? { ...req, status: "rejected" } : req))
        );
    }, []);

    // Statistics
    const pendingCount = requests.filter((r) => r.status === "pending").length;
    const approvedCount = requests.filter((r) => r.status === "approved").length;

    // "Resource of the Month" (Mock: just count approved this month)
    const thisMonth = new Date().getMonth();
    const approvedThisMonth = requests.filter(
        (r) => r.status === "approved" && r.submittedAt.getMonth() === thisMonth
    ).length;

    return {
        requests,
        submitRequest,
        approveRequest,
        rejectRequest,
        stats: {
            pending: pendingCount,
            approved: approvedThisMonth, // Displaying monthly approved count
        },
    };
}
