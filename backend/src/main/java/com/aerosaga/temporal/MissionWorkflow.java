package com.aerosaga.temporal;
import io.temporal.workflow.*;
@WorkflowInterface
public interface MissionWorkflow {
 @WorkflowMethod void runMission(MissionWorkflowInput input);
 @SignalMethod void droneOffline();
 @SignalMethod void droneReconnected();
 @SignalMethod void abortMission();
 @QueryMethod String getMissionState();
}
