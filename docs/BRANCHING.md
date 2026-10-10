# GitHub branching and PR rules

Use one shared repository named `AeroSaga`. The branches are named to match the Team 6 assignments.

| Branch | Owner | Scope |
|---|---|---|
| `main` | Stable, reviewed code | Integrated code only; no direct feature work |
| `feature/madhav-frontend` | Madhav Gorla | React UI, mission dashboard, API client, UI tests |
| `feature/naveen-backend-api` | Naveen | Spring Boot REST API, DTOs, validation, Temporal client integration |
| `feature/trishul-database` | Trishul | MySQL schema, migrations, persistence, seed/simulator data |
| `feature/hariom-workflow-devops` | Hariom Verma | Temporal workflow core, tests, Docker, CI/CD, docs, PPT/demo coordination |

## Workflow
1. Madhav creates the shared GitHub repository and pushes the starter files to `main`.
2. Invite Naveen, Trishul, and Hariom as collaborators.
3. Run `scripts/setup-team-branches.sh` (Git Bash/Linux/macOS) or `scripts/setup-team-branches.ps1` (PowerShell) once from a local clone after `main` has been pushed. Alternatively, each teammate can create only their own branch.
4. Each member commits and pushes only to their assigned feature branch.
5. Open a pull request from the feature branch into `main`; review and run tests before merging.
6. Pull the updated `main` into a feature branch as needed, resolving conflicts with the relevant module owner.

## Example for Madhav
```bash
git switch main
git pull origin main
git switch -c feature/madhav-frontend
git push -u origin feature/madhav-frontend
```

If that branch already exists, use `git switch feature/madhav-frontend` instead of creating it again.

Never commit `.env`, passwords, API keys, tokens, production data, `node_modules`, or build output. The ZIP cannot create the remote repository or grant collaborator access; do those in GitHub.
