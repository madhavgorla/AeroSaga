package com.aerosaga.mission;
import java.time.Instant;

public record MissionResponse(
    String missionId,
    String workflowId,
    String droneId,
    String destination,
    MissionStatus status,
    Instant createdAt,
    String message
) {
    static MissionResponse from(MissionEntity mission, String message) {
        return new MissionResponse(
            mission.getMissionId(), mission.getWorkflowId(), mission.getDroneId(), mission.getDestination(),
            mission.getStatus(), mission.getCreatedAt(), message
        );
    }
}
