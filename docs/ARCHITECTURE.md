# Architecture and connections

```text
Madhav: React dashboard
   | HTTP JSON (only app interface)
   v
Naveen: Spring Boot REST API + Temporal Client
   | start workflow / signal / query
   v
Temporal Server (durable workflow history)
   ^ workers poll the task queue
Hariom: Temporal Workflow + Activities
   | activities perform side effects
   v
Trishul: MySQL/JPA + simulated drone adapter
   |
   v
Mission/event records -> REST API -> dashboard refresh
```

- Frontend never talks directly to database or Temporal.
- REST API validates requests, starts/signals workflows and reads mission projections.
- Workflow code must be deterministic; no JDBC/network calls or arbitrary wall-clock calls inside workflow code.
- Activities perform external actions and database writes with bounded timeouts/retries.
- MySQL stores application/business records and audit events. Temporal stores workflow history separately.
- Use simulated telemetry unless mentor requires real hardware.

## First end-to-end slice
1. UI sends `POST /api/missions`.
2. API validates, persists initial mission and starts a Temporal workflow with a stable workflow ID.
3. Offline endpoint records an idempotent event and signals the correct workflow.
4. Workflow waits durably for reconnect or policy timeout.
5. Reconnect endpoint records event and signals workflow.
6. Workflow resumes recovery/return-to-base Activities and updates business status/events.
7. UI refreshes from API and shows actual backend status.

Do not implement “resume” only by changing a database status. Do not label simulated map pins as live GPS.
