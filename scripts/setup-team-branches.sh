#!/usr/bin/env bash
set -euo pipefail

# Run once from the repository root after main is committed and pushed to origin.
branches=(
  "feature/madhav-frontend"
  "feature/naveen-backend-api"
  "feature/trishul-database"
  "feature/hariom-workflow-devops"
)

git switch main
git pull origin main
for branch in "${branches[@]}"; do
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    echo "Local branch already exists: $branch — skipping creation"
  else
    git switch -c "$branch" main
  fi
  git push -u origin "$branch"
done
git switch main
echo "Team branches are pushed. Each member should now work only on their assigned branch."
