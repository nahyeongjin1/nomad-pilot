---
description: CodeRabbit 리뷰 확인. PR의 unresolved 리뷰 스레드를 GraphQL로 가져와서 분류하고 대응 방안을 제시한다.
---

## 절차

1. PR 번호 결정
   - `$ARGUMENTS`가 있으면 그 번호 사용
   - 없으면 현재 브랜치의 PR을 `gh pr view --json number -q '.number'`로 자동 감지
2. 레포 정보 가져오기: `gh repo view --json nameWithOwner -q '.nameWithOwner'`에서 owner/repo 추출
3. GraphQL **1회 호출**로 unresolved 리뷰 스레드를 가져오고, jq에서 severity 추출 + `<details>` 블록 제거까지 처리:

```bash
gh api graphql -f query='
{
  repository(owner: "OWNER", name: "REPO") {
    pullRequest(number: PR_NUMBER) {
      reviewThreads(first: 50) {
        nodes {
          isResolved
          id
          comments(first: 1) {
            nodes {
              path
              line
              body
              id
            }
          }
        }
      }
    }
  }
}' --jq '
  [.data.repository.pullRequest.reviewThreads.nodes[]
   | select(.isResolved == false)
   | .comments.nodes[0] as $c
   | {
       threadId: .id,
       commentId: $c.id,
       path: $c.path,
       line: $c.line,
       severity: (try ($c.body | capture("(?<s>🔴 Critical|🟠 Major|🟡 Minor|🔵 Trivial)") | .s) catch "Unknown"),
       body: ($c.body | gsub("(?s)<details>.*?</details>"; "") | gsub("\n{3,}"; "\n\n") | sub("^\\s+"; "") | .[0:500])
     }]'
```

> **참고:** `(?s)` dotall 플래그로 `<details>` 내부의 분석 체인, 코드 제안, AI 프롬프트를 모두 제거한다. severity는 첫 줄 마커에서 추출하고, body는 핵심 요약만 남긴다. HTML 주석(`<!-- -->`)은 zsh `!` 이스케이프 문제로 jq에서 제거하지 않으나, 짧은 메타데이터뿐이므로 무시한다.

4. 결과를 테이블로 정리하여 사용자에게 제시:
   - 번호, 심각도(severity 필드 사용), 파일:line, 내용 요약(body 필드 사용), 판단(수정/dismiss)
5. 사용자와 함께 각 리뷰에 대해 수정 또는 dismiss 결정
6. **dismiss 댓글 먼저**: dismiss할 항목에 GraphQL mutation으로 사유 댓글 달기 (모든 dismiss 완료 후 다음 단계)

```bash
gh api graphql -f query='
mutation {
  addPullRequestReviewThreadReply(input: {
    pullRequestReviewThreadId: "THREAD_ID",
    body: "댓글 내용"
  }) { comment { id } }
}'
```

7. **수정 반영**: 수정할 항목들을 코드 변경 후 커밋 & 푸시
