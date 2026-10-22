package com.aerosaga.mission;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "drones")
public class DroneEntity {
    @Id
    @Column(name = "drone_id", length = 64)
    private String droneId;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "battery_percent", nullable = false)
    private int batteryPercent;

    @Column(name = "current_latitude", precision = 10, scale = 7)
    private BigDecimal currentLatitude;

    @Column(name = "current_longitude", precision = 10, scale = 7)
    private BigDecimal currentLongitude;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    protected DroneEntity() {}

    public String getDroneId() { return droneId; }
    public String getDisplayName() { return displayName; }
    public String getStatus() { return status; }
    public int getBatteryPercent() { return batteryPercent; }
    public BigDecimal getCurrentLatitude() { return currentLatitude; }
    public BigDecimal getCurrentLongitude() { return currentLongitude; }
    public Instant getLastSeenAt() { return lastSeenAt; }
    public void setStatus(String status) { this.status = status; }
    public void setCurrentLocation(BigDecimal latitude, BigDecimal longitude) {
        currentLatitude = latitude;
        currentLongitude = longitude;
    }
    public void setLastSeenAt(Instant lastSeenAt) { this.lastSeenAt = lastSeenAt; }
}