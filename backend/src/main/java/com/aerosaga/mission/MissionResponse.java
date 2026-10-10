package com.aerosaga.mission;
import java.time.Instant;
public record MissionResponse(String missionId,String workflowId,String droneId,String destination,MissionStatus status,Instant createdAt,String message) {}
