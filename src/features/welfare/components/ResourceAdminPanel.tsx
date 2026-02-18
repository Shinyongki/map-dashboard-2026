
import { useState } from "react";
import { Check, X, MapPin, Phone, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResourceRequest } from "../hooks/useResourceDiscovery";
import { getGroupInfo } from "../lib/welfare-types";

interface ResourceAdminPanelProps {
    requests: ResourceRequest[];
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}

export default function ResourceAdminPanel({ requests, onApprove, onReject }: ResourceAdminPanelProps) {
    const [activeTab, setActiveTab] = useState("pending");

    const pendingRequests = requests.filter(r => r.status === "pending");
    const approvedRequests = requests.filter(r => r.status === "approved");

    return (
        <Card className="w-full h-full shadow-none border-0 bg-white/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    🛡️ 자원 발굴 관리자
                </CardTitle>
                <CardDescription>
                    현장에서 제안된 신규 자원을 검토하고 승인합니다.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
                    <div className="px-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="pending" className="relative">
                                대기중인 승인
                                {pendingRequests.length > 0 && (
                                    <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                        {pendingRequests.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="approved">승인된 자원</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 p-4 h-full">
                        <TabsContent value="pending" className="mt-0 space-y-4">
                            {pendingRequests.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <p>대기 중인 요청이 없습니다.</p>
                                </div>
                            ) : (
                                pendingRequests.map((req) => (
                                    <RequestItem
                                        key={req.id}
                                        req={req}
                                        onApprove={() => onApprove(req.id)}
                                        onReject={() => onReject(req.id)}
                                    />
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="approved" className="mt-0 space-y-4">
                            {approvedRequests.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <p>승인된 자원이 없습니다.</p>
                                </div>
                            ) : (
                                approvedRequests.map((req) => (
                                    <ApprovedItem key={req.id} req={req} />
                                ))
                            )}
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function RequestItem({ req, onApprove, onReject }: { req: ResourceRequest, onApprove: () => void, onReject: () => void }) {
    const group = getGroupInfo(req.group);

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" style={{ borderColor: group.color, color: group.color }}>
                        {group.label}
                    </Badge>
                    <span className="font-bold text-gray-900">{req.name}</span>
                </div>
                <span className="text-xs text-gray-400">
                    {req.submittedAt.toLocaleDateString()}
                </span>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span>{req.address}</span>
                </div>
                {req.contact && (
                    <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{req.contact}</span>
                    </div>
                )}
            </div>

            {req.description && (
                <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-500">
                    {req.description}
                </div>
            )}

            <div className="flex gap-2 pt-2">
                <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={onReject}
                >
                    <X className="h-4 w-4 mr-1" />
                    반려
                </Button>
                <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={onApprove}
                >
                    <Check className="h-4 w-4 mr-1" />
                    승인
                </Button>
            </div>
        </div>
    );
}

function ApprovedItem({ req }: { req: ResourceRequest }) {
    const group = getGroupInfo(req.group);

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 opacity-75 hover:opacity-100 transition-opacity">
            <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-800">{req.name}</span>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">
                    승인됨
                </Badge>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                {req.address}
            </div>
        </div>
    );
}
