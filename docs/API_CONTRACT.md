# AeroSaga REST API

Base URL: `http://localhost:8080`. JSON fields use camelCase and timestamps are ISO-8601 UTC.
The browser communicates with this API only; it never connects directly to MySQL or Temporal.

## Endpoints

| Method | Route | Success | Purpose |
|---|---|---:|---|
| GET | `/api/health` | 200 | API health |
| GET | `/api/drones` | 200 | List seeded simulated drones and their persisted status |
| POST | `/api/drones/{droneId}/offline` | 200 | Persist a deduplicated offline event and signal the active workflow |
| POST | `/api/drones/{droneId}/reconnected` | 200 | Persist a deduplicated reconnect event and signal the waiting workflow |
| GET | `/api/missions` | 200 | List missions, newest first |
| POST | `/api/missions` | 201 | Validate, persist and start a Temporal workflow |
| GET | `/api/missions/{missionId}` | 200 | Read a mission |
| GET | `/api/missions/{missionId}/events` | 200 | Read its event timeline, oldest first |
| GET | `/api/missions/{missionId}/workflow` | 200 | Read the safe business status projection and whether it is active |
| POST | `/api/missions/{missionId}/abort` | 202 | Signal a safe abort to an active workflow |
| POST | `/api/missions/{missionId}/reroute` | 200 | Replace the route of an in-progress workflow |

## Request bodies

Create mission:

```json
{
  "droneId": "DRONE-001",
  "destination": "Warehouse B",
  "waypoints": [
    {"latitude": 16.5062, "longitude": 80.6480},
    {"latitude": 16.5200, "longitude": 80.6300}
  ]
}
```

Reroute:

```json
{
  "waypoints": [
    {"latitude": 16.5100, "longitude": 80.6400},
    {"latitude": 16.5200, "longitude": 80.6300}
  ]
}
```

Both routes require 1–100 waypoints. Latitude must be between -90 and 90, longitude between -180 and 180. Drone IDs are at most 64 characters and contain only letters, digits, `.`, `_`, and `-`; destinations are 1–255 non-whitespace characters. A drone must be `AVAILABLE` to accept a mission. Rerouting is allowed only while the mission is `IN_PROGRESS`.

## Workflow behavior

Temporal history is the orchestration source of truth; MySQL stores the mission, current route, drone projection, and deduplicated event timeline. The simulated workflow visits route waypoints at one-second intervals, returns to base, and completes. Offline/reconnect signals pause and resume the workflow; if reconnection does not arrive within five minutes (to be confirmed with the mentor), the simulated drone returns to base and the mission ends FAILED. Abort and reroute are workflow signals. This simulation does not represent live hardware or GPS.

The workflow-status endpoint returns only the application-owned `workflowId`, mission status, and active flag; it does not return Temporal internals. An active workflow is any status other than `COMPLETED`, `ABORTED`, or `FAILED`.

## Errors

Errors have a stable shape and never include SQL details, Temporal internals, or stack traces:

```json
{
  "timestamp": "2026-10-23T00:00:00Z",
  "status": 400,
  "code": "INVALID_REQUEST",
  "message": "Request validation failed",
  "details": ["waypoints[0].latitude: must be less than or equal to 90.0"],
  "path": "/api/missions"
}
```

Invalid JSON/input returns 400, missing drones/missions return 404, invalid state transitions or data conflicts return 409, and unavailable Temporal operations return 503. API errors use a generic 500 response for unexpected server failures.
