
import { useState } from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WELFARE_GROUPS, WelfareGroup } from "../lib/welfare-types";

interface ResourceRequestModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
}

export default function ResourceRequestModal({ open, onClose, onSubmit }: ResourceRequestModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        group: "other" as WelfareGroup,
        address: "",
        contact: "",
        description: "",
    });

    if (!open) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        onClose();
        // Reset form
        setFormData({
            name: "",
            category: "",
            group: "other",
            address: "",
            contact: "",
            description: "",
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="relative pb-2">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        🌱 신규 복지자원 제안
                    </CardTitle>
                    <CardDescription>
                        지도에 없는 복지 시설이나 자원을 발견하셨나요?
                    </CardDescription>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-4"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">기관/자원 명칭 *</label>
                            <Input
                                required
                                placeholder="예: 행복한 요양원"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">유형(그룹) *</label>
                                <Select
                                    value={formData.group}
                                    onValueChange={(v) => setFormData({ ...formData, group: v as WelfareGroup })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {WELFARE_GROUPS.map(g => (
                                            <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">상세 분류</label>
                                <Input
                                    placeholder="예: 요양시설"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">주소 *</label>
                            <Input
                                required
                                placeholder="상세 주소를 입력해주세요"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">연락처</label>
                            <Input
                                placeholder="000-0000-0000"
                                value={formData.contact}
                                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">설명 / 비고</label>
                            <Textarea
                                placeholder="자원에 대한 추가 설명이나 특징을 적어주세요."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="bg-gray-50/50 pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>취소</Button>
                        <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                            <Send className="mr-2 h-4 w-4" />
                            제안하기
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
