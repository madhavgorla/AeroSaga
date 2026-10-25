CREATE TABLE IF NOT EXISTS drones (
  drone_id VARCHAR(64) PRIMARY KEY,
  display_name VARCHAR(120) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
  battery_percent INT NOT NULL DEFAULT 100,
  current_latitude DECIMAL(10,7),
  current_longitude DECIMAL(10,7),
  last_seen_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS missions (
  mission_id VARCHAR(64) PRIMARY KEY,
  drone_id VARCHAR(64) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
  workflow_id VARCHAR(128) NOT NULL,
  current_latitude DECIMAL(10,7),
  current_longitude DECIMAL(10,7),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_missions_drone FOREIGN KEY (drone_id) REFERENCES drones(drone_id),
  INDEX idx_missions_status (status),
  INDEX idx_missions_drone (drone_id)
);

CREATE TABLE IF NOT EXISTS waypoints (
  waypoint_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  mission_id VARCHAR(64) NOT NULL,
  sequence_number INT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  waypoint_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  CONSTRAINT fk_waypoints_mission FOREIGN KEY (mission_id) REFERENCES missions(mission_id) ON DELETE CASCADE,
  UNIQUE KEY uq_mission_waypoint_sequence (mission_id, sequence_number)
);

CREATE TABLE IF NOT EXISTS mission_events (
  event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  mission_id VARCHAR(64) NOT NULL,
  event_key VARCHAR(128) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  event_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_mission FOREIGN KEY (mission_id) REFERENCES missions(mission_id) ON DELETE CASCADE,
  UNIQUE KEY uq_mission_event_key (mission_id, event_key),
  INDEX idx_events_mission_time (mission_id, event_time)
);

INSERT IGNORE INTO drones (drone_id, display_name, status, battery_percent)
VALUES ('DRONE-001','Demo Drone 001','AVAILABLE',96),('DRONE-002','Demo Drone 002','AVAILABLE',88),('DRONE-003','Demo Drone 003','AVAILABLE',72);
