package com.aerosaga.temporal;

import com.aerosaga.mission.MissionRequest;
import io.temporal.activity.ActivityOptions;
import io.temporal.common.RetryOptions;
import io.temporal.failure.ActivityFailure;
import io.temporal.workflow.Workflow;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

public class MissionWorkflowImpl implements MissionWorkflow {
    private static final Duration WAYPOINT_INTERVAL = Duration.ofSeconds(1);
    private static final Duration OFFLINE_TIMEOUT = Duration.ofMinutes(10);

    private final MissionActivities activities = Workflow.newActivityStub(
        MissionActivities.class,
        ActivityOptions.newBuilder()
            .setStartToCloseTimeout(Duration.ofSeconds(30))
            .setRetryOptions(RetryOptions.newBuilder()
                .setInitialInterval(Duration.ofSeconds(1))
                .setMaximumAttempts(3)
                .build())
            .build()
    );

    private boolean offline;
    private boolean reconnected;
    private boolean aborted;
    private String state = "SCHEDULED";
    private List<MissionRequest.WaypointRequest> route = List.of();
    private int routeRevision;
    private int transitionNumber;

    @Override
    public void runMission(MissionWorkflowInput input) {
        route = new ArrayList<>(input.waypoints());
        try {
            executeMission(input);
        } catch (ActivityFailure failure) {
            transition(input, "FAILED", "Mission execution failed after activity retries");
            throw failure;
        }
    }

    private void executeMission(MissionWorkflowInput input) {
        transition(input, "SCHEDULED", "Workflow started");
        activities.dispatch(input.missionId(), input.droneId());
        transition(input, "IN_PROGRESS", "Drone dispatched");

        int waypointIndex = 0;
        while (waypointIndex < route.size()) {
            if (aborted) {
                finishAborted(input);
                return;
            }
            if (offline && !awaitReconnect(input)) {
                if (!aborted) {
                    returnToBase(input, "Offline timeout elapsed; drone returned to base");
                }
                return;
            }

            int revisionBeforeWaypoint = routeRevision;
            MissionRequest.WaypointRequest waypoint = route.get(waypointIndex);
            activities.visitWaypoint(input.missionId(), waypointIndex + 1, waypoint.latitude(), waypoint.longitude());
            Workflow.await(WAYPOINT_INTERVAL,
                () -> offline || aborted || routeRevision != revisionBeforeWaypoint);
            if (aborted) {
                finishAborted(input);
                return;
            }
            if (routeRevision != revisionBeforeWaypoint) {
                waypointIndex = 0;
            } else {
                waypointIndex++;
            }
        }
        if (offline && !awaitReconnect(input)) {
            if (!aborted) {
                returnToBase(input, "Offline timeout elapsed; drone returned to base");
            }
            return;
        }
        if (aborted) {
            finishAborted(input);
            return;
        }
        returnToBase(input, "Delivery route complete; drone returned to base");
    }

    private boolean awaitReconnect(MissionWorkflowInput input) {
        transition(input, "SUSPENDED_OFFLINE", "Offline; waiting for reconnect");
        boolean signalReceived = Workflow.await(OFFLINE_TIMEOUT, () -> reconnected || aborted);
        if (aborted) {
            finishAborted(input);
            return false;
        }
        if (!signalReceived) {
            return false;
        }
        offline = false;
        reconnected = false;
        transition(input, "RECOVERING", "Reconnect received; resuming route");
        transition(input, "IN_PROGRESS", "Mission resumed after reconnect");
        return true;
    }

    private void returnToBase(MissionWorkflowInput input, String message) {
        transition(input, "RETURNING", "Drone returning to base");
        activities.returnToBase(input.missionId(), input.droneId());
        transition(input, "COMPLETED", message);
    }

    private void finishAborted(MissionWorkflowInput input) {
        state = "ABORTED";
        transition(input, "ABORTED", "Mission aborted");
    }

    private void transition(MissionWorkflowInput input, String nextState, String message) {
        state = nextState;
        transitionNumber++;
        activities.updateBusinessStatus(input.missionId(), nextState, message,
            "status:" + transitionNumber + ":" + nextState);
    }

    @Override
    public void droneOffline() { offline = true; }

    @Override
    public void droneReconnected() { reconnected = true; }

    @Override
    public void abortMission() { aborted = true; }

    @Override
    public void reroute(List<MissionRequest.WaypointRequest> waypoints) {
        route = new ArrayList<>(waypoints);
        routeRevision++;
    }

    @Override
    public String getMissionState() { return state; }
}
