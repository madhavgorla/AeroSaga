package com.aerosaga.mission;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "waypoints")
public class WaypointEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "waypoint_id")
    private Long waypointId;

    @Column(name = "mission_id", nullable = false, length = 64)
    private String missionId;

    @Column(name = "sequence_number", nullable = false)
    private int sequenceNumber;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "waypoint_status", nullable = false, length = 32)
    private String waypointStatus;

    protected WaypointEntity() {}

    public WaypointEntity(String missionId, int sequenceNumber, BigDecimal latitude, BigDecimal longitude) {
        this.missionId = missionId;
        this.sequenceNumber = sequenceNumber;
        this.latitude = latitude;
        this.longitude = longitude;
        this.waypointStatus = "PENDING";
    }

    public int getSequenceNumber() { return sequenceNumber; }
    public void setWaypointStatus(String waypointStatus) { this.waypointStatus = waypointStatus; }
}