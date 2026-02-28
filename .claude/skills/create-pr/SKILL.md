---
description: PR 생성. 현재 브랜치의 변경 사항을 분석하고 프로젝트 PR 템플릿에 맞춰 GitHub PR을 생성한다.
---

아래 PR 템플릿 포맷에 맞춰 PR을 생성하라.

@../../../.github/PULL_REQUEST_TEMPLATE.md

## 절차

1. `git status`, `git diff`, `git log`, `git diff main...HEAD`를 병렬 실행하여 현재 브랜치 상태 파악
2. 모든 커밋(main 분기 이후 전체)을 분석하여 PR 제목 + 본문 작성
   - 제목: 70자 이내, 변경의 핵심을 한 줄로
   - Summary: 변경 사항 1~3줄 요약
   - Changes: 생성/수정/삭제 파일 분류
   - Key decisions: 설계 결정이 있으면 기록, 없으면 섹션 삭제
   - Test plan: 검증 방법 체크리스트
3. 원격에 push되지 않았으면 `git push -u origin HEAD`
4. `gh pr create --assignee @me`로 PR 생성 (본인을 assignee로 지정)
5. 완료된 이후 사용자와 함께 coderabbitai의 리뷰 확인
