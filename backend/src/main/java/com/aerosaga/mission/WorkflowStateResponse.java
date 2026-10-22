package com.aerosaga.mission;

import java.time.Instant;

public record WorkflowStateResponse(String missionId, String workflowId, MissionStatus status, boolean running) {}