# Test checklist

## Frontend — Madhav
- [ ] Loading/empty/success/error states; validation; actual API statuses; create mission; action feedback.
## API — Naveen
- [ ] Health, list drones, create/list/detail, event timeline, safe workflow projection.
- [ ] Invalid coordinates, oversized route, unknown IDs, unavailable drones, stable error shape.
- [ ] Duplicate offline/reconnect events, workflow signals, abort terminal-state guard, and in-progress reroute.
## Temporal — Hariom + Naveen
- [ ] Workflow starts, visits waypoints, and completes; offline signal waits durably; reconnect resumes route; offline timeout returns to base.
- [ ] Worker restart test; activity retries; abort/reroute signals; state and event persistence.
## Database/simulator — Trishul
- [ ] Clean schema/migrations; mission/event persistence; keys/indexes; duplicate telemetry safe.
## Delivery — Hariom
- [ ] Clean checkout Docker setup, CI, evidence screenshots, known limitations, demo script.
