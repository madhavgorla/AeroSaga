package com.aerosaga.temporal;
import io.temporal.activity.ActivityOptions;
import io.temporal.common.RetryOptions;
import io.temporal.workflow.Workflow;
import java.time.Duration;
/** Hariom: complete policy, route progression and tests. Keep side effects in Activities. */
public class MissionWorkflowImpl implements MissionWorkflow {
 private final MissionActivities activities=Workflow.newActivityStub(MissionActivities.class,
  ActivityOptions.newBuilder().setStartToCloseTimeout(Duration.ofSeconds(30))
   .setRetryOptions(RetryOptions.newBuilder().setInitialInterval(Duration.ofSeconds(1)).setMaximumAttempts(3).build()).build());
 private boolean offline,reconnected,aborted;
 private String state="SCHEDULED";
 @Override public void runMission(MissionWorkflowInput input) {
  activities.updateBusinessStatus(input.missionId(),state,"Workflow started");
  activities.dispatch(input.missionId(),input.droneId());
  state="IN_PROGRESS"; activities.updateBusinessStatus(input.missionId(),state,"Drone dispatched");
  Workflow.await(() -> offline || aborted);
  if (aborted) { state="ABORTED"; activities.updateBusinessStatus(input.missionId(),state,"Aborted"); return; }
  state="SUSPENDED_OFFLINE"; activities.updateBusinessStatus(input.missionId(),state,"Offline; waiting for reconnect");
  Workflow.await(() -> reconnected || aborted);
  if (aborted) { state="ABORTED"; activities.updateBusinessStatus(input.missionId(),state,"Aborted while waiting"); return; }
  state="RECOVERING"; activities.updateBusinessStatus(input.missionId(),state,"Reconnect received");
  state="RETURNING"; activities.returnToBase(input.missionId(),input.droneId());
  activities.updateBusinessStatus(input.missionId(),"COMPLETED","Returned to base"); state="COMPLETED";
 }
 @Override public void droneOffline(){offline=true;}
 @Override public void droneReconnected(){reconnected=true;}
 @Override public void abortMission(){aborted=true;}
 @Override public String getMissionState(){return state;}
}
