# AeroSaga - Frontend Mission Control

Enterprise autonomous drone mission control and fleet management dashboard for Team 6 (Infotact Solutions).

## Capabilities

- **Real-Time Drone Optical Camera Feed**: 4K Daylight, FLIR Thermal Infrared, and Night Vision NVG HUD with live pitch/roll artificial horizon, target acquisition reticle, and telemetry gauges.
- **Tactical Airspace Map**: Interactive flight corridor radar with Dispatch Hub Alpha coordinates and aircraft markers.
- **Durable Temporal Signal Simulator**: Interactive triggers for simulating drone telemetry disconnection (`signalDroneOffline`) and reconnection (`signalDroneReconnected`).
- **Global Search Bar**: Quick search for drones by ID or missions by status (`⌘K` / `Ctrl+K`).
- **REST API Integration**: Direct integration with Spring Boot backend endpoints (`/api/missions`, `/api/drones`) with graceful fallback simulation.

## Author

- **Madhav Gorla** (`madhugorla497@gmail.com`)
