# 12-week implementation plan

## Week 1 — Learn and agree
Everyone runs Temporal Hello World. Agree on API DTOs, mission states, DB engine, task queue, ports and telemetry approach. Build skeletons. Hariom records decisions.

## Weeks 2–4 — First vertical slice
Create/list mission, initial schema, workflow/Activities and dashboard integration. Exit: UI-created mission appears in DB and has a real Temporal workflow.

## Weeks 5–6 — Offline/reconnect
Signal workflow offline, enter durable wait, signal reconnect, resume recovery/return-to-base. Make events idempotent. Exit: show workflow history proving it.

## Weeks 7–8 — Reliability
Activity retries/timeouts, invalid requests, duplicate signals, error handling, Docker Compose and CI. Exit: clean-checkout setup and negative tests pass.

## Weeks 9–10 — UI and integration polish
Route visualization using mentor-approved provider, event timeline, abort/reroute, failure/performance tests. Document simulated vs live capabilities.

## Weeks 11–12 — Submission
Regression, clean setup, screenshots, diagrams, report, PPT, Postman collection and rehearsed demo.

## Confirm with mentor
Database/version; real 3D map vs simulated/2D; real hardware vs simulator; Temporal SDK/server versions; offline timeout and abort/reroute semantics; authentication and cloud deployment scope.
