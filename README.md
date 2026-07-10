# Shorts Factory 대시보드 (프론트엔드)

파이프라인 실행 상태·업로드 영상·성과 리포트를 보여주는 관리 대시보드.
백엔드(`D:\ms\shorts-factory-be`, 포트 8000)와 `/api` 프록시로 통신한다.

## 실행

```bash
npm install
npm run dev   # http://localhost:5173
```

## 구성
- `src/App.jsx` — 파이프라인 상태 / 에이전트 목록 / 성과 리포트 3개 카드
- 백엔드 미기동 시 "백엔드 연결 실패"가 표시됨 (정상 동작)
