# Demo evidence checklist

Suggested Postman order after endpoints are implemented: health → list drones → create mission → list/detail mission → offline event → inspect Temporal UI workflow history → reconnect → verify recovery and persisted event timeline → test invalid ID, duplicate event, abort and retry/failure paths.

Capture actual API responses, database rows and Temporal history. Do not present simulated map pins as live drone tracking.
