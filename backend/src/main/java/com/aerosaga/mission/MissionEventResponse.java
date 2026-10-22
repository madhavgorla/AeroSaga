package com.aerosaga.mission;

import java.time.Instant;

public record MissionEventResponse(long eventId, String missionId, String eventType, String message, Instant eventTime) {
    static MissionEventResponse from(MissionEventEntity event) {
        return new MissionEventResponse(
            event.getEventId(), event.getMissionId(), event.getEventType(), event.getMessage(), event.getEventTime()
        );
    }
}