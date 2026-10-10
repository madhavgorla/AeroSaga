# Push this starter repository and its branches to GitHub

This ZIP includes the local `.git` directory with `main` and all four Team 6 feature branches already created.

## 1. Create an EMPTY GitHub repository
Create a repository named `AeroSaga`. Do not initialize it with a README, license, or .gitignore, because this starter already has an initial commit.

## 2. Extract this ZIP and open a terminal in this folder
Make sure you are in the folder containing this file and the `.git` directory.

## 3. Add your GitHub repository as the remote
Replace `YOUR-USERNAME` with the GitHub account or organization that owns the repository:

```bash
git remote add origin https://github.com/YOUR-USERNAME/AeroSaga.git
git push -u origin main
git push origin --all
```

The `git push origin --all` command publishes all four feature branches as well as any other local branches.

## 4. Invite teammates
On GitHub, open Settings → Collaborators (or Collaborators and teams) and invite Hariom, Naveen, and Trishul.

## 5. Teammates clone and switch to their own branch
```bash
git clone https://github.com/YOUR-USERNAME/AeroSaga.git
cd AeroSaga
git switch feature/naveen-backend-api
```
Each teammate should switch to their own assigned branch and push only their own work. Open pull requests into `main` for review.

## Branches included
- `main` — stable reviewed code
- `feature/madhav-frontend` — Madhav: React frontend
- `feature/naveen-backend-api` — Naveen: Spring Boot APIs
- `feature/trishul-database` — Trishul: MySQL schema and persistence
- `feature/hariom-workflow-devops` — Hariom: Temporal workflow, testing, Docker, CI/CD

## Important
- This ZIP contains starter code; it is not a fully implemented or tested final application.
- Do not commit `.env`, credentials, tokens, or secrets.
- If you created a non-empty GitHub repository, create an empty one instead or carefully reconcile histories before pushing.
