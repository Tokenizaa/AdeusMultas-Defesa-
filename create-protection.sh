#!/bin/bash
# Create branch protection for main branch

# Check if we're in a git repository
if [ ! -d ".git" ]; then
  echo "Error: Not in a git repository"
  exit 1
fi

# Check if we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
  echo "Error: Please run this script from the main branch"
  exit 1
fi

# Create branch protection
gh api \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/Tokenizaa/AdeusMultas-Defesa-/branches/main/protection \
  -f required_status_checks='{"strict":true,"contexts":["lint","test"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"required_approving_review_count":1}' \
  -f required_linear_history=true \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -f restrictions='{}'
