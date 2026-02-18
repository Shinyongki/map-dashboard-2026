import { useState } from "react";
import {
    MessageSquareText,
    Plus,
    LogOut,
    Shield,
    FileText,
    LayoutList,
    MapPin,
    ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/features/qna/hooks/useAuth";
import { useQuestions } from "@/features/qna/hooks/useQuestions";
import { useDocuments } from "@/features/qna/hooks/useDocuments";
import type { Question, QuestionStatus } from "@/features/qna/lib/types";
import LoginForm from "@/features/qna/components/LoginForm";
import QuestionList from "@/features/qna/components/QuestionList";
import QuestionForm from "@/features/qna/components/QuestionForm";
import QuestionDetail from "@/features/qna/components/QuestionDetail";
import AdminPanel from "@/features/qna/components/AdminPanel";
import DocumentManager from "@/features/qna/components/DocumentManager";
import DocumentGrid from "@/features/qna/components/DocumentGrid";

type UserView = "documents" | "list" | "form" | "detail";
type AdminTab = "questions" | "documents";

export default function QnADashboard() {
    const { session, login, logout, isAdmin } = useAuth();
    const {
        questions,
        loading,
        submitQuestion,
        approveAnswer,
        closeQuestion,
        removeQuestion,
    } = useQuestions();
    const {
        documents,
        loading: docsLoading,
        uploading,
        upload,
        update: docsUpdate,
        remove: removeDoc,
        setValidUntil,
    } = useDocuments();

    // User view state
    const [userView, setUserView] = useState<UserView>("documents");
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<QuestionStatus | "all">("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Admin tab state
    const [adminTab, setAdminTab] = useState<AdminTab>("questions");

    if (!session) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <LoginForm onLogin={(code, name) => login(code, name)} />
            </div>
        );
    }

    const handleSelectQuestion = (q: Question) => {
        setSelectedQuestion(q);
        setUserView("detail");
    };

    const handleSelectDocument = (docId: string | null) => {
        setSelectedDocId(docId);
        setUserView("list");
    };

    const handleSubmitQuestion = async (
        data: Parameters<typeof submitQuestion>[0]
    ) => {
        await submitQuestion(data);
        setUserView("list");
    };

    const getRelatedDoc = (q: Question) =>
        q.relatedDocumentId
            ? documents.find((d) => d.id === q.relatedDocumentId) ?? null
            : null;

    // Filter questions based on selected document
    const filteredQuestions = questions.filter(q =>
        selectedDocId ? q.relatedDocumentId === selectedDocId : !q.relatedDocumentId
    );

    const selectedDoc = documents.find(d => d.id === selectedDocId);

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg">
                        <MessageSquareText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">공문 Q&A</h1>
                        <p className="text-xs text-gray-500">
                            {session.region !== "전체" && (
                                <span className="text-blue-600 font-medium">{session.region} · </span>
                            )}
                            {session.orgName} · {session.name}
                            {session.isHub && (
                                <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-semibold rounded">
                                    <MapPin className="h-2.5 w-2.5" />거점
                                </span>
                            )}
                            {isAdmin && (
                                <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-600 font-medium">
                                    <Shield className="h-3 w-3" /> 관리자
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isAdmin && (
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                            <button
                                onClick={() => setUserView("documents")}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${userView === "documents"
                                    ? "bg-white text-emerald-700 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <LayoutList className="h-3.5 w-3.5" />
                                공문 목록
                            </button>
                            <button
                                onClick={() => setUserView("form")}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${userView === "form"
                                    ? "bg-white text-emerald-700 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                질문하기
                            </button>
                        </div>
                    )}
                    <button
                        onClick={logout}
                        className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                    >
                        <LogOut className="h-4 w-4" />
                        로그아웃
                    </button>
                </div>
            </div>

            {/* Admin view */}
            {isAdmin ? (
                <div>
                    {/* Admin tabs */}
                    <div className="flex gap-1 mb-4">
                        <button
                            onClick={() => setAdminTab("questions")}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${adminTab === "questions"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                        >
                            <LayoutList className="h-4 w-4" />
                            질문 관리
                        </button>
                        <button
                            onClick={() => setAdminTab("documents")}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${adminTab === "documents"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                        >
                            <FileText className="h-4 w-4" />
                            공문 관리
                        </button>
                    </div>

                    {adminTab === "questions" ? (
                        <AdminPanel
                            questions={questions}
                            documents={documents}
                            loading={loading}
                            adminName={session.name}
                            onApprove={approveAnswer}
                            onClose={closeQuestion}
                            onDelete={removeQuestion}
                        />
                    ) : (
                        <DocumentManager
                            documents={documents}
                            loading={docsLoading}
                            uploading={uploading}
                            onUpload={upload}
                            onUpdate={docsUpdate}
                            onDelete={removeDoc}
                            onSetValidUntil={setValidUntil}
                            uploadedBy={session.name}
                        />
                    )}
                </div>
            ) : (
                /* User view */
                <div>
                    {userView === "documents" ? (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-blue-900 font-bold text-sm">공문별 질의응답</h3>
                                    <p className="text-blue-700 text-xs mt-1">
                                        문의하고자 하는 공문을 선택하면, 해당 공문의 담당자와 기존 질의응답을 확인할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                            <DocumentGrid
                                documents={documents}
                                questions={questions}
                                onSelect={handleSelectDocument}
                            />
                        </div>
                    ) : userView === "list" ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <button
                                    onClick={() => setUserView("documents")}
                                    className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </button>
                                <h2 className="text-lg font-bold text-gray-900">
                                    {selectedDoc ? selectedDoc.title : "일반 질의응답"}
                                </h2>
                                {selectedDoc && (
                                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                        {selectedDoc.documentNumber}
                                    </span>
                                )}
                            </div>
                            <QuestionList
                                questions={filteredQuestions}
                                loading={loading}
                                onSelect={handleSelectQuestion}
                                selectedId={selectedQuestion?.id}
                                statusFilter={statusFilter}
                                onStatusFilterChange={setStatusFilter}
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                isAdmin={false}
                            />
                        </div>
                    ) : userView === "form" ? (
                        <QuestionForm
                            documents={documents}
                            authorName={session.name}
                            authorOrg={session.orgCode}
                            authorOrgName={session.orgName}
                            defaultDocumentId={selectedDocId}
                            onSubmit={handleSubmitQuestion}
                            onCancel={() => setUserView("list")}
                        />
                    ) : userView === "detail" && selectedQuestion ? (
                        <QuestionDetail
                            question={selectedQuestion}
                            relatedDocument={getRelatedDoc(selectedQuestion)}
                            isAdmin={false}
                            onBack={() => {
                                setUserView("list");
                                setSelectedQuestion(null);
                            }}
                        />
                    ) : null}
                </div>
            )}
        </div>
    );
}
