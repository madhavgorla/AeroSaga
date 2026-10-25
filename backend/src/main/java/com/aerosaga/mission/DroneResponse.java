package com.aerosaga.mission;

import java.math.BigDecimal;
import java.time.Instant;

public record DroneResponse(
    String droneId,
    String displayName,
    String status,
    int batteryPercent,
    BigDecimal currentLatitude,
    BigDecimal currentLongitude,
    Instant lastSeenAt
) {
    static DroneResponse from(DroneEntity drone) {
        return new DroneResponse(
            drone.getDroneId(), drone.getDisplayName(), drone.getStatus(), drone.getBatteryPercent(),
            drone.getCurrentLatitude(), drone.getCurrentLongitude(), drone.getLastSeenAt()
        );
    }
}