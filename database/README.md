# Database — Trishul

Team role sheet proposes MySQL + JPA; confirm with mentor before finalizing. Proposed app DB: `aerosaga`; host port `3307` -> container `3306`. Tables: `drones`, `missions`, `waypoints`, `mission_events`.

MySQL stores business records/audit history; Temporal has its own workflow persistence. SQL files in `/docker-entrypoint-initdb.d` run only when the MySQL data directory is first initialized. Use reviewed, versioned migrations (Flyway recommended) for ongoing changes.
