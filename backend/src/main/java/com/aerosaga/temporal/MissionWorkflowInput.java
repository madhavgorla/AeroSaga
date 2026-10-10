package com.aerosaga.temporal;
import java.util.List;
import com.aerosaga.mission.MissionRequest;
public record MissionWorkflowInput(String missionId,String droneId,String destination,List<MissionRequest.WaypointRequest> waypoints) {}
