import { useState } from "react";
import { LogIn } from "lucide-react";

interface LoginFormProps {
    onLogin: (code: string, name: string) => Promise<unknown>;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isAdmin = code.trim() === "1672";
        if (!code.trim() || (!isAdmin && !name.trim())) {
            setError("모든 항목을 입력해주세요.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            await onLogin(code.trim(), isAdmin ? "관리자" : name.trim());
        } catch (err) {
            setError(err instanceof Error ? err.message : "로그인 실패");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-full mb-3">
                        <LogIn className="h-7 w-7 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">공문 Q&A 로그인</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        기관코드와 이름을 입력하여 접속합니다
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            기관코드
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="발급된 기관코드를 입력하세요 (예: A48120001)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            이름
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="홍길동"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                        <LogIn className="h-4 w-4" />
                        {loading ? "접속 중..." : "접속하기"}
                    </button>

                    <p className="text-xs text-gray-400 text-center mt-2">
                        관리자는 관리자 암호(숫자 4자리)를 기관코드 란에 입력하세요
                    </p>
                </form>
            </div>
        </div>
    );
}

