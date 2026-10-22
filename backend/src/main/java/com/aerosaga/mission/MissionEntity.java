package com.aerosaga.mission;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "missions")
public class MissionEntity {
    @Id
    @Column(name = "mission_id", length = 64)
    private String missionId;

    @Column(name = "drone_id", nullable = false, length = 64)
    private String droneId;

    @Column(nullable = false, length = 255)
    private String destination;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private MissionStatus status;

    @Column(name = "workflow_id", nullable = false, length = 128)
    private String workflowId;

    @Column(name = "current_latitude", precision = 10, scale = 7)
    private BigDecimal currentLatitude;

    @Column(name = "current_longitude", precision = 10, scale = 7)
    private BigDecimal currentLongitude;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected MissionEntity() {}

    public MissionEntity(String missionId, String droneId, String destination, String workflowId, Instant createdAt) {
        this.missionId = missionId;
        this.droneId = droneId;
        this.destination = destination;
        this.workflowId = workflowId;
        this.status = MissionStatus.CREATED;
        this.createdAt = createdAt;
    }

    public String getMissionId() { return missionId; }
    public String getDroneId() { return droneId; }
    public String getDestination() { return destination; }
    public MissionStatus getStatus() { return status; }
    public String getWorkflowId() { return workflowId; }
    public Instant getCreatedAt() { return createdAt; }
    public BigDecimal getCurrentLatitude() { return currentLatitude; }
    public BigDecimal getCurrentLongitude() { return currentLongitude; }
    public void setStatus(MissionStatus status) { this.status = status; }
    public void setCurrentLocation(BigDecimal latitude, BigDecimal longitude) {
        currentLatitude = latitude;
        currentLongitude = longitude;
    }
}