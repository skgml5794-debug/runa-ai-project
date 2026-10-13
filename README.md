# 킵노트 (Keepnote)

Instagram/Threads 링크를 입력하면 핵심 내용을 요약·정리해 저장하는 서비스의 MVP입니다.
기능 요구사항은 `PRD.md`, 디자인 규칙은 `DESIGN.md`(맨 아래 "Keepnote 적용 가이드")를 따릅니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm test           # 단위 테스트 (vitest)
npm run typecheck
npm run lint
```

## MVP 범위

- 계정·서버 없이 브라우저 `localStorage`에 저장합니다. (킵노트·카테고리)
- 링크 요약은 **mock**입니다. 실제 API 호출과 비용이 발생하지 않습니다.

### mock 요약 테스트용 입력

링크 안에 아래 단어가 들어 있으면 동작이 달라집니다.

| 단어 | 동작 |
|---|---|
| `fail` | 요약 실패 (오류 팝업 확인) |
| `hang` | 응답 없음 (30초 뒤 시간 초과 오류 확인) |
| Threads 링크 | 썸네일 없는 결과 (기본 이미지 확인) |

## 구조

```
src/
  app/                   라우트 (/, /loading, /summary, /notes, /notes/[id], /notes/[id]/edit, /categories)
  components/
    screens/             화면 단위 컴포넌트
    note/                요약 결과 편집기, 표시 블록, 목록 카드
    ui/                  버튼, 칩, 팝업, 토스트 등 공통 UI
  lib/
    summarizer/          LinkSummarizer 인터페이스 + mock  ← 실제 API 연동 시 교체
    repository/          KeepnoteRepository 인터페이스 + localStorage ← 서버 DB 전환 시 교체
    notes.ts, categories.ts, link.ts   검색·정렬·삭제 규칙, 이름 규칙, 링크 검증
```

### 실제 API로 교체하기

- 요약: `src/lib/summarizer/types.ts`의 `LinkSummarizer`를 구현하고 `src/lib/summarizer/index.ts`의 `summarizer`만 바꿉니다.
- 저장소: `src/lib/repository/types.ts`의 `KeepnoteRepository`를 구현하고 `src/lib/repository/index.ts`의 `repository`만 바꿉니다.

## Next.js 16 참고

`cacheComponents`가 켜져 있어 이전 화면이 숨겨진 채 상태가 보존됩니다.
각 라우트는 `FreshScreen`(`router.bfcacheId` 키)으로 감싸, 새로 이동할 때는 화면 상태를 초기화하고
브라우저 뒤로/앞으로 가기에서는 복원합니다.
