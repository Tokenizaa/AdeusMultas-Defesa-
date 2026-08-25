#!/bin/bash
# Script to set up branch protection for main branch

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Error: Must run this script from the main branch"
  exit 1
fi

# Check if git is available
if ! command -v git &> /dev/null; then
  echo "Error: git is not installed"
  exit 1
fi

# Check if GitHub CLI is available
if ! command -v gh &> /dev/null; then
  echo "Error: GitHub CLI (gh) is not installed. Please install it first."
  echo "See: https://cli.github.com/"
  exit 1
fi

# Check if we're authenticated
if ! gh auth status | grep -q "Logged in"; then
  echo "Error: Not logged in to GitHub. Run 'gh auth login' first."
  exit 1
fi

# Set up branch protection
echo "Setting up branch protection for main branch..."
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
