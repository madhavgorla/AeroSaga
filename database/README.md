# Database — Trishul

The app uses MySQL + JPA. The app database is `aerosaga`; host port `3307` maps to container port `3306`. Tables: `drones`, `missions`, `waypoints`, `mission_events`.

MySQL stores business records and audit history; Temporal has its own workflow persistence. Flyway applies reviewed, versioned migrations from `backend/src/main/resources/db/migration` when the backend starts. Hibernate validates the migrated schema without changing it.
