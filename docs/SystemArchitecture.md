System Architecture v1.0
시스템 아키텍처 문서
경상남도 광역지원기관  |  개발팀 전달용


# 1. 전체 시스템 구조
시스템은 4개 계층으로 구성된다: 데이터 수집층, 지식 베이스, LLM 엔진, 사용자 인터페이스.


| 계층 | 구성 요소 |
| --- | --- |
| Layer 0: 수집 | 기관 현황 제출 / 복지자원 DB / 기상청 API / 공문서 업로드 |
| Layer 1: 저장 | Google Sheets (현황) + Vector DB (지식 베이스) + RDB (자원/기관 마스터) |
| Layer 2: 처리 | RAG 파이프라인 + LLM (Claude API) + FAQ 캐시 + 이상치 감지 엔진 |
| Layer 3: 표현 | Map Dashboard / 광역 관리 UI / 현장 사회복지사 포털 |



# 2. 데이터 흐름

## 2.1 기관 현황 데이터 흐름
수행기관 담당자 기관코드 로그인
월별 현황 입력 (종사자/대상자/단기집중) → 실시간 유효성 검사
Google Sheets 저장 → 지식 베이스 동기화 (월 1회 배치)
이상치 감지 엔진: 전월 대비 20% 이상 변동 → 광역 알림 플래그
시계열 누적: 3개월 이상 추세 분석 가능


## 2.2 공문서 데이터 흐름
광역 담당자 공문 PDF/HWP 업로드
텍스트 추출 → 청크 분할 → 임베딩 생성 → Vector DB 저장
LLM이 핵심 요약 + 영향 기관 분류 + 예상 FAQ 초안 자동 생성
광역 담당자 FAQ 검토/수정/승인
현장 사회복지사 질의 접수
FAQ 캐시 검색 → 매칭 시 즉시 반환 (LLM 미호출)
미매칭 시: Vector DB RAG 검색 (공문 + 사업안내서 동시) → LLM 답변 생성
신규 답변 → FAQ 풀 추가 → 광역 승인 후 공개


## 2.3 복지자원 데이터 흐름
초기 적재: 270개소 CSV → RDB (읍면동 단위 분류, 서비스 유형 태깅)
현장 질의: '이 어르신 연계 자원은?' → 위치 + 상황 파라미터 추출
RDB 검색 (읍면동 기준 반경 확장) + Vector DB 유사 사례 검색
LLM이 경로 구성: 1차 기관 → 2차 기관 → 후속 연계
타 시군 참조 시 해당 기관 연락처 함께 제공
신규 발굴 자원 → 광역 승인 → DB 업데이트


## 2.4 기상/재난 데이터 흐름
기상청 API 폴링 (1시간 주기 권장)
특보 발령 시 해당 시군 코드 추출
RDB에서 해당 시군 돌봄 현황 JOIN (독거노인 수, 담당 종사자)
복지자원 DB에서 냉난방 시설 등 관련 자원 추출
통합 뷰 생성 → 광역 대시보드 즉시 반영
재난 이력 DB 누적 저장


# 3. 핵심 컴포넌트 명세

## 3.1 RAG 파이프라인

| 임베딩 모델 | text-embedding-3-small 또는 동급 (비용 효율) |
| --- | --- |
| Vector DB | Supabase pgvector (기존 인프라 활용 권장) 또는 Pinecone |
| 청크 전략 | 공문: 조항 단위 분할 / 사업안내서: 섹션 단위 |
| 검색 방식 | Hybrid Search (벡터 + 키워드) 권장 |
| 컨텍스트 창 | 질의 관련 상위 5개 청크만 LLM에 전달 (비용 최소화) |



## 3.2 FAQ 캐싱 시스템

| 캐시 키 | 질문 임베딩 유사도 기반 (코사인 유사도 0.92 이상 매칭) |
| --- | --- |
| 캐시 저장소 | Redis 또는 RDB 캐시 테이블 |
| 갱신 조건 | 광역 담당자 수동 수정 또는 공문 유효기간 만료 |
| 예상 비용 절감 | 동일 공문 기준 반복 질의의 70~80% LLM 미호출 |



## 3.3 이상치 감지 엔진

| 감지 기준 | 전월 대비 종사자 20% 이상 변동 |
| --- | --- |
| 추가 기준 | 3개월 연속 증감 추세, 대상자 신규 유입 0명 |
| 알림 방식 | 광역 대시보드 플래그 + (선택) 이메일/카카오 알림톡 |
| 배치 주기 | 매월 제출 마감일 다음날 자동 실행 |



# 4. 주요 DB 스키마

## 4.1 복지자원 테이블 (welfare_resources)

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| resource_id | VARCHAR PK | 자원 고유 코드 |
| sigun_code | VARCHAR | 시군 코드 (18개) |
| eupmyeondong | VARCHAR | 읍면동명 |
| resource_name | VARCHAR | 기관명 |
| resource_type | VARCHAR | 유형 (요양원/재가/주간보호 등) |
| services | JSON | 제공 서비스 목록 |
| lat / lng | FLOAT | 좌표 (지도 표시용) |
| contact | VARCHAR | 연락처 |
| linked_agencies | JSON | 연계된 수행기관 코드 목록 |
| link_history | JSON | 연계 이력 (날짜, 결과) |
| approved_by | VARCHAR | 등록 승인자 (광역 담당자) |



## 4.2 공문서 테이블 (official_documents)

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| doc_id | VARCHAR PK | 공문 고유 ID |
| title | VARCHAR | 공문 제목 |
| issued_date | DATE | 발송일 |
| valid_until | DATE | 질의응답 유효 기간 |
| target_type | VARCHAR | 대상 기관 유형 (전체/거점/일반) |
| summary | TEXT | LLM 자동 요약 |
| faq_status | VARCHAR | FAQ 승인 상태 (대기/승인/반려) |
| vector_indexed | BOOLEAN | Vector DB 임베딩 완료 여부 |



# 5. 주요 API 엔드포인트

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | /api/query | LLM 질의응답 (권한에 따라 응답 범위 자동 조정) |
| POST | /api/documents | 공문서 업로드 (광역 전용) |
| PATCH | /api/faq/:id/approve | FAQ 승인/반려 (광역 전용) |
| GET | /api/resources | 복지자원 목록 조회 (위치, 유형 필터) |
| POST | /api/resources/route | 자원 경로 추천 (대상자 상황 파라미터) |
| GET | /api/weather/alert | 기상특보 + 돌봄 현황 결합 데이터 |
| GET | /api/institutions/:code | 기관 현황 조회 (기관코드 기준, 본인만) |
| GET | /api/briefing/:code | 기관 모니터링 브리핑 (광역 전용) |



# 6. 보안 요구사항
기관코드는 서버에서만 검증 (클라이언트 노출 금지)
현장 사용자 세션에서 타 기관 데이터 API 접근 차단 (서버 레벨)
Vector DB 접근은 백엔드 전용 (프론트엔드 직접 접근 불가)
공문서 원본 파일은 내부 스토리지에만 저장, 외부 URL 노출 금지
LLM 프롬프트에 타 기관 식별 정보 포함 시 마스킹 처리
