# PRD: 노인맞춤돌봄서비스 통합 현황 조사 시스템

## 1. 프로젝트 목적
경상남도 부울경 지역의 노인맞춤돌봄서비스 현황을 월별로 정밀하게 집계하고, 관리자에게 시각화된 대시보드를 제공하여 사업 효과성을 극대화함.

## 2. 핵심 요구사항
### 2.1. 수행기관 입력 시스템
- 3단계 위자드 방식의 데이터 입력.
- 실시간 유효성 검사 (종사자 총합, 연락처 포맷팅 등).
- **거점수행기관 전용 로직**: 퇴원환자 단기집중서비스 입력 폼 활성화.

### 2.2. 관리자 대시보드
- 월별 전체 제출 현황 및 통계 요약.
- 엑셀 내보내기 기능.
- **고급 지도 시각화**:
    - 8종 이상의 데이터 모드 지원 (제출, 인력, 이용자, 신규, 균형, 특화, 단기, 종결).
    - 프리미엄 네온 인포그래픽 테마 및 일반 라이트 테마(Sky/Forest) 전환.
    - 데이터 규모에 비례하는 글로잉 버블(Glowing Bubble) 시각화.

## 3. 기술 요구사항
- **Frontend**: 
    - Main App: React, TypeScript, Vite.
    - Map Dashboard: React, TypeScript, Vite (Independent Project).
- **Backend**: Node.js, Google Sheets API.
- **Data Integration**: Standardized API with JSON proxy.
- **Security**: 관리자 암호 인증 (`1672`).
