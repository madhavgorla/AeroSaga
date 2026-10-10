# AeroSaga — Project 2 | Team 6

Infotact Solutions · Temporal.io Autonomous Drone Mission Control.

**Team:** Hariom Verma (lead + Temporal core), Naveen (Spring Boot API), Trishul (MySQL/JPA + drone simulator), Madhav Gorla (React frontend + integration).

> This is a structured starter repository, not a claim that every feature has been implemented or tested. Complete TODOs, run tests, and collect evidence before calling it finished.

## Goal
Start a simulated delivery mission, persist business records, and orchestrate the long-running mission using a real Temporal workflow. When a drone goes offline, signal the workflow into a durable waiting state. When it reconnects, resume recovery/return-to-base logic and reflect actual backend status in the dashboard.

## Restrictions / architecture rules
1. Temporal workflow history must provide durable orchestration; a MySQL status field alone is not enough.
2. Keep long-running logic in Temporal workflows/activities, not REST handlers.
3. Browser talks to Spring Boot REST API only. Never connect React directly to MySQL or Temporal.
4. Temporal's workflow persistence and the app's MySQL business tables serve different purposes.
5. Use simulated drone telemetry unless mentor explicitly requires hardware/live provider.
6. Do not claim live tracking or live 3D map until implemented and tested.
7. The team role sheet proposes MySQL; confirm DB engine/version, map requirement, SDK/server versions and demo expectations with mentor.
8. Never commit `.env`, passwords, API keys, tokens, production data or personal information.

## Repository structure
- `frontend/` React + TypeScript + Vite — Madhav
- `backend/` Java 21 + Spring Boot + Temporal SDK — Naveen + Hariom
- `database/` MySQL schema/migrations — Trishul
- `docs/` architecture, API contract, states, branches, implementation plan
- `tests/` test plan and demo evidence checklist — Hariom + all
- `.github/workflows/ci.yml` CI starter
- `docker-compose.yml` local development stack

## Quick start
Prerequisites: Docker Desktop with Compose, Git, JDK 21, Node.js LTS.

1. Copy `.env.example` to `.env`; use local-only values and never commit `.env`.
2. Run `docker compose up --build`.
3. Frontend: http://localhost:5173
4. API health: http://localhost:8080/api/health
5. Temporal UI: http://localhost:8233
6. MySQL host port: `3307` (container port `3306`).

The Temporal container configuration is for local development, not production. Review image and SDK compatibility before final submission. `docker compose down -v` deletes local persistent data.

## Git branches
`main` is stable reviewed code only. Branches:
- `feature/madhav-frontend`
- `feature/naveen-backend-api`
- `feature/trishul-database`
- `feature/hariom-workflow-devops`

Branch scope:
- Madhav: React frontend and frontend-to-API integration.
- Naveen: Spring Boot REST APIs and backend-to-Temporal integration.
- Trishul: MySQL schema, persistence, migrations, and simulator data.
- Hariom: Temporal workflow core, testing, Docker, CI/CD, documentation, and demo coordination.

Each person pushes to their branch and opens a PR into `main`; no direct pushes to `main`. Require review/CI where GitHub settings allow. Small commits, clear messages, no secrets or build outputs.

```bash
git clone https://github.com/YOUR-ORG/AeroSaga.git
cd AeroSaga
git switch -c feature/madhav-frontend
git push -u origin feature/madhav-frontend
```
Replace the branch with your own. The ZIP contains project files and branch setup scripts, but Git branches themselves are created and pushed after you initialize the Git repository and push the first commit to GitHub. Create the remote repo on GitHub and invite teammates; this ZIP cannot create a remote GitHub repository on your behalf.

## Definition of done
- Mission creation starts a real Temporal workflow.
- Dashboard displays actual API/database state.
- Offline event signals workflow into durable waiting; reconnect resumes recovery.
- Worker restart test proves workflow continues from Temporal history.
- MySQL stores missions, waypoints and event history.
- Duplicate events, invalid inputs, abort/reroute, retries and timeouts are tested.
- Clean checkout starts through Docker; CI passes.
- README, diagrams, report, PPT, Postman collection and demo evidence are complete.

## Publishing this ZIP to GitHub

This archive includes `.git` with `main` and the four feature branches already created. Follow [`PUSH_TO_GITHUB_FIRST.md`](PUSH_TO_GITHUB_FIRST.md). Create an empty GitHub repository, then run `git remote add origin https://github.com/YOUR-USERNAME/AeroSaga.git`, `git push -u origin main`, and `git push origin --all`. Do not upload the files through the GitHub web interface if you want to preserve the pre-created local branches.
