# 테이블 스타일 관리 정책

## 개요
Admin Dashboard의 테이블 스타일은 **2가지 별도 시스템**으로 관리됩니다.

## 스타일 구분

| 구분 | 파일 | 기술 | 용도 |
|------|------|------|------|
| **Excel 다운로드** | `excelStyles.ts` | xlsx-js-style | 엑셀 파일 내보내기 |
| **UI 테이블** | `AdminDashboard.tsx` | Tailwind CSS | 웹 브라우저 표시 |

## 관리 원칙
- 두 스타일은 **별개로 관리**
- 하나 변경 시 다른 쪽에 **자동 반영 안 됨**
- 각각 필요에 따라 독립적으로 수정

## UI 스타일 현재 적용 상태

| 탭 | 적용 완료 | 비고 |
|----|----------|------|
| 경남(Summary) | ✅ | 폰트 13px, sticky header, 0→'-' |
| 경남도(상세) | ✅ | 폰트 13px, sticky header, 0→'-', 2단 헤더 Excel |
| 내부 자료(전체) | ⏳ | 추후 작업 예정 |

## UI 스타일 적용 기준 (경남 Summary 기준)
- 폰트 크기: `text-[13px]`
- 헤더 고정: `sticky top-0 z-20`
- 0값 표시: '-' (formatNum 함수)
- 천단위 콤마: toLocaleString()
