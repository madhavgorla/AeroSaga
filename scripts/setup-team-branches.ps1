$ErrorActionPreference = "Stop"
# Run once from the repository root after main is committed and pushed to origin.
$branches = @(
  "feature/madhav-frontend",
  "feature/naveen-backend-api",
  "feature/trishul-database",
  "feature/hariom-workflow-devops"
)

git switch main
if ($LASTEXITCODE -ne 0) { throw "Could not switch to main." }
git pull origin main
if ($LASTEXITCODE -ne 0) { throw "Could not pull origin/main." }
foreach ($branch in $branches) {
  git show-ref --verify --quiet "refs/heads/$branch"
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Local branch already exists: $branch — switching to it"
    git switch $branch
  } else {
    git switch -c $branch main
  }
  if ($LASTEXITCODE -ne 0) { throw "Could not switch/create $branch." }
  git push -u origin $branch
  if ($LASTEXITCODE -ne 0) { throw "Could not push $branch. Check permissions or whether remote branch already exists." }
}
git switch main
Write-Host "Team branches are pushed. Each member should work only on their assigned branch."
