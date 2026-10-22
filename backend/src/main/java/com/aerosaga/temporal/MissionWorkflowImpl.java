package com.aerosaga.temporal;
import io.temporal.activity.ActivityOptions;
import io.temporal.common.RetryOptions;
import io.temporal.workflow.Workflow;
import com.aerosaga.mission.MissionRequest;
import java.time.Duration;
/** Hariom: complete policy, route progression and tests. Keep side effects in Activities. */
public class MissionWorkflowImpl implements MissionWorkflow {
 private final MissionActivities activities=Workflow.newActivityStub(MissionActivities.class,
  ActivityOptions.newBuilder().setStartToCloseTimeout(Duration.ofSeconds(30))
   .setRetryOptions(RetryOptions.newBuilder().setInitialInterval(Duration.ofSeconds(1)).setMaximumAttempts(3).build()).build());
 private boolean offline,reconnected,aborted;
 private String state="SCHEDULED";

 @Override
 public void runMission(MissionWorkflowInput input) {
  String id = input.missionId();
  String drone = input.droneId();

  setState(id, "SCHEDULED", "Workflow started");
  activities.dispatch(id, drone);
  setState(id, "IN_PROGRESS", "Drone dispatched");

  int index = 0;
  for (MissionRequest.WaypointRequest wp : input.waypoints()) {
   if(aborted){
    handleAbort(id, drone);
    return;
   }
   index++;
   activities.flyToWaypoint(id, drone, index, wp.latitude(), wp.longitude());
  }
  if(aborted){
   handleAbort(id, drone);
   return;
  }

  setState(id, "RETURNING", "Delivery complete, returning to base");
  activities.returnToBase(id, drone);
  setState(id, "COMPLETED", "Returned to base");
 }

 private void setState(String missionId, String newState, String message) {
  this.state = newState;
  activities.updateBusinessStatus(missionId, newState, message);
 }
 private void handleAbort(String missionId, String droneId) {
  setState(missionId, "RETURNING", "Abort requested, returning to base");
  activities.returnToBase(missionId, droneId);
  setState(missionId, "ABORTED", "Mission aborted, drone back at base");
 }
 @Override public void droneOffline(){offline=true;}
 @Override public void droneReconnected(){reconnected=true;}
 @Override public void abortMission(){aborted=true;}
 @Override public String getMissionState(){return state;}
}
