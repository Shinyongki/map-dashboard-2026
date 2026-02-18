import pdfParse from "pdf-parse";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text || "(PDF 텍스트 추출 결과 없음)";
  } catch (err) {
    console.error("PDF 텍스트 추출 실패:", err);
    return "(PDF 텍스트 추출에 실패했습니다. 수동으로 내용을 입력해주세요.)";
  }
}
