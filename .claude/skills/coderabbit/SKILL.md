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
       body: ($c.body | gsub("(?s)<details>.*?</details>"; "") | sub("^_.*?_\\s*\\|\\s*_.*?_\\n+"; "") | gsub("\n{3,}"; "\n\n") | sub("^\\s+"; "") | .[0:500])
     }]' | perl -pe 's/\\u003c!--.*?--\\u003e//g; s/<!--.*?-->//g; s/(\\n){3,}/\\n\\n/g; s/\\n\\n"$/\\n"/'
```

4. 결과를 테이블로 정리하여 사용자에게 제시:
   - 번호, 심각도(severity 필드 사용), 파일:line, 내용 요약(body 필드 사용), 판단(수정/dismiss)
5. 사용자와 함께 각 리뷰에 대해 수정 또는 dismiss 결정
6. **dismiss 댓글 먼저**: dismiss할 항목에 GraphQL mutation으로 사유 댓글 달기. **모든 dismiss 완료 후** 다음 단계로 진행 — unresolved 스레드가 남아있으면 CodeRabbit이 PR approve를 하지 않음

```bash
gh api graphql -f query='
mutation {
  addPullRequestReviewThreadReply(input: {
    pullRequestReviewThreadId: "THREAD_ID",
    body: "댓글 내용"
  }) { comment { id } }
}'
```

7. **수정 반영**: 수정할 항목들을 코드 변경 후 커밋 & 푸시. 수정 항목에는 푸시 전 댓글을 달지 않음 — CodeRabbit이 새 커밋을 re-review하며 대부분 자동 resolve
8. **잔여 확인**: re-review 후에도 unresolved로 남은 수정 항목이 있으면 `Addressed in commit {commit_sha}` 댓글을 달아 CodeRabbit이 해당 커밋을 확인하도록 유도
