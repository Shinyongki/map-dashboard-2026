# IA: 정보 구조 정의

## 1. 메뉴 구조 (Sitemap)
- **메인 입력화면 (Survey Form)**
    - Phase 1: 기관 기본 정보 (시군, 기관명, 담당자)
    - Phase 2: 운영 현황 (종사자, 대상자, 특화, 단기집중)
    - Phase 3: 배정 인원 (기준 TO, 변경 사항)
    - Phase 4: 최종 검토 (종합 요약, 제출 동의)
- **지도 시각화 대시보드 (Map Dashboard - Standalone Project)**
    - **Tab 1: 돌봄현황 (Care Status)**
        - 통계 요약 및 상세 지표 (제출, 인력, 균형 등 8개 모드).
        - **[NEW] 관내 노인의료복지시설 목록 (Side Panel)**.
    - **Tab 2: 기후대응 (Climate Response)**
        - 폭염/한파 특보 현황 (기상청 API).
        - 온열/한랭 질환자 모니터링 시각화.
    - **Tab 3: 자연재난 (Disaster Response)**
        - 태풍/호우/지진 발생 이력 분석.
    - **[NEW] Tab 4: 지능형 Q&A (AI Q&A)**
        - **공문 관리 (Admin Only)**: PDF 업로드, AI 요약 확인, FAQ 승인.
        - **질문하기 (All)**: 공문 기반 상담, AI 답변 초안 생성, 질의응답 이력.

## 2. 데이터 구조 (Data Schema)
- **기관 마스터 (Google Sheets/Firestore)**: 시군, 기관명, 기관코드, 거점여부.
- **월별 제출 데이터 (Google Sheets)**: 성별/유형별 종사자 및 대상자 수.
- **지도 데이터 (JSON/SVG)**: 경남 18개 시군 공간 정보.
- **[NEW] 공문서 DB (Firestore - `documents`)**:
    - `title`, `documentNumber`, `fileUrl`, `content`(추출 텍스트), `aiSummary`, `faqItems`
- **[NEW] 질의응답 DB (Firestore - `questions`)**:
    - `title`, `content`, `status`, `aiDraftAnswer`, `relatedDocumentId`, `authorOrg`
- **[NEW] 공문 파일 저장소 (Firebase Storage - `documents/`)**:
    - 원본 PDF 파일 보관.
- **[NEW] 기상/재난 데이터**: 기상청 특보 코드 및 재난 발생 이력 (API).
