
import { useState, useCallback } from 'react';
import { analyzeDocument, type DocumentAnalysisResult } from '../lib/mock-ocr';

export function useDocumentFeedback() {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<DocumentAnalysisResult | null>(null);

    const handleFileSelect = useCallback((selectedFile: File) => {
        setFile(selectedFile);

        // Create preview URL
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);

        // Reset previous results
        setResult(null);
    }, []);

    const startAnalysis = useCallback(async () => {
        if (!file) return;

        setIsAnalyzing(true);
        try {
            const analysisResult = await analyzeDocument(file);
            setResult(analysisResult);
        } catch (error) {
            console.error("Analysis failed:", error);
        } finally {
            setIsAnalyzing(false);
        }
    }, [file]);

    const reset = useCallback(() => {
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setResult(null);
        setIsAnalyzing(false);
    }, [previewUrl]);

    return {
        file,
        previewUrl,
        isAnalyzing,
        result,
        handleFileSelect,
        startAnalysis,
        reset
    };
}
