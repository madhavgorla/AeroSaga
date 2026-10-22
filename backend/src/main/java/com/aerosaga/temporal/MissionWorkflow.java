package com.aerosaga.temporal;

import com.aerosaga.mission.MissionRequest;
import io.temporal.workflow.QueryMethod;
import io.temporal.workflow.SignalMethod;
import io.temporal.workflow.WorkflowInterface;
import io.temporal.workflow.WorkflowMethod;
import java.util.List;

@WorkflowInterface
public interface MissionWorkflow {
    @WorkflowMethod void runMission(MissionWorkflowInput input);
    @SignalMethod void droneOffline();
    @SignalMethod void droneReconnected();
    @SignalMethod void abortMission();
    @SignalMethod void reroute(List<MissionRequest.WaypointRequest> waypoints);
    @QueryMethod String getMissionState();
}
