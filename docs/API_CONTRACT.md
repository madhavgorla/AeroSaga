# Draft API contract — freeze with team in Week 1

All timestamps ISO-8601 UTC. JSON camelCase.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | API health |
| GET | `/api/drones` | List simulated drones |
| GET | `/api/missions` | List missions |
| POST | `/api/missions` | Create mission and start workflow |
| GET | `/api/missions/{missionId}` | Mission details/status |
| GET | `/api/missions/{missionId}/events` | Event timeline |
| POST | `/api/drones/{droneId}/offline` | Record event + signal workflow |
| POST | `/api/drones/{droneId}/reconnected` | Record reconnect + signal workflow |
| POST | `/api/missions/{missionId}/abort` | Signal safe abort |
| POST | `/api/missions/{missionId}/reroute` | Validate and signal replacement route |
| GET | `/api/missions/{missionId}/workflow` | Safe workflow status |

Create request example:
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

Use meaningful HTTP status codes. Validate coordinate ranges, IDs, route size and state transitions. Deduplicate repeated offline/reconnect events. Never expose secrets, SQL errors, Temporal internals or stack traces. Update this document to match actual DTOs/OpenAPI after implementation.
