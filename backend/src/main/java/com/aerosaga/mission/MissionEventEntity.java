package com.aerosaga.mission;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "mission_events")
public class MissionEventEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Long eventId;

    @Column(name = "mission_id", nullable = false, length = 64)
    private String missionId;

    @Column(name = "event_key", nullable = false, length = 128)
    private String eventKey;

    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(name = "event_time", nullable = false)
    private Instant eventTime;

    protected MissionEventEntity() {}

    public MissionEventEntity(String missionId, String eventKey, String eventType, String message, Instant eventTime) {
        this.missionId = missionId;
        this.eventKey = eventKey;
        this.eventType = eventType;
        this.message = message;
        this.eventTime = eventTime;
    }

    public Long getEventId() { return eventId; }
    public String getMissionId() { return missionId; }
    public String getEventType() { return eventType; }
    public String getMessage() { return message; }
    public Instant getEventTime() { return eventTime; }
}