# Test checklist

## Frontend — Madhav
- [ ] Loading/empty/success/error states; validation; actual API statuses; create mission; action feedback.
## API — Naveen
- [ ] Health, create/list/detail, invalid coordinates, unknown IDs, consistent errors, duplicate event safety.
## Temporal — Hariom + Naveen
- [ ] Workflow starts; offline signal waits durably; reconnect continues recovery; worker restart test; retry/timeouts; abort/reroute.
## Database/simulator — Trishul
- [ ] Clean schema/migrations; mission/event persistence; keys/indexes; duplicate telemetry safe.
## Delivery — Hariom
- [x] Workflow starts (happy path test)
- [x] Abort returns to base (test)
- [x] Offline signal waits durably, then FAILED after 5 min timeout (test)
- [ ] Reconnect continues recovery
- [ ] Worker restart test
- [ ] Retry/timeouts
- [ ] Reroute