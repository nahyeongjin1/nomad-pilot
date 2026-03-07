#!/usr/bin/env bash
set -euo pipefail

# Usage: fetch-reviews.sh <owner> <repo> <pr_number> [--all]
OWNER="$1"
REPO="$2"
PR_NUMBER="$3"
FILTER="${4:-}"

if [ "$FILTER" = "--all" ]; then
  JQ_FILTER='[.data.repository.pullRequest.reviewThreads.nodes[]'
else
  JQ_FILTER='[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)'
fi

gh api graphql -f query="
{
  repository(owner: \"$OWNER\", name: \"$REPO\") {
    pullRequest(number: $PR_NUMBER) {
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
}" --jq "$JQ_FILTER"'
   | .comments.nodes[0] as $c
   | {
       threadId: .id,
       commentId: $c.id,
       path: $c.path,
       line: $c.line,
       severity: (try ($c.body | capture("(?<s>🔴 Critical|🟠 Major|🟡 Minor|🔵 Trivial)") | .s) catch "Unknown"),
       body: ($c.body | gsub("(?s)<details>.*?</details>"; "") | sub("^_.*?_\\s*\\|\\s*_.*?_\\n+"; "") | gsub("\n{3,}"; "\n\n") | sub("^\\s+"; "") | .[0:500])
     }]' | perl -pe 's/\\u003c!--.*?--\\u003e//g; s/<!--.*?-->//g; s/(\\n){3,}/\\n\\n/g; s/\\n\\n"$/\\n"/'