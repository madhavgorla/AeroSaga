package com.aerosaga.temporal;

import com.aerosaga.mission.MissionRequest;
import io.temporal.activity.ActivityOptions;
import io.temporal.common.RetryOptions;
import io.temporal.failure.ActivityFailure;
import io.temporal.failure.CanceledFailure;
import io.temporal.workflow.Workflow;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/** Keep mission side effects in activities and workflow decisions deterministic. */
public class MissionWorkflowImpl implements MissionWorkflow {
    private static final Duration WAYPOINT_INTERVAL = Duration.ofSeconds(1);
    private static final Duration OFFLINE_TIMEOUT = Duration.ofMinutes(5); // Confirm with mentor before changing.
    private static final int MAX_WAYPOINTS = 100;

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
            if (!isCancellation(failure)) {
                setState(input, "FAILED", "Mission execution failed after activity retries");
            }
            throw failure;
        }
    }

    private void executeMission(MissionWorkflowInput input) {
        String missionId = input.missionId();
        String droneId = input.droneId();
        setState(input, "SCHEDULED", "Workflow started");
        activities.dispatch(missionId, droneId);
        setState(input, "IN_PROGRESS", "Drone dispatched");

        int waypointIndex = 0;
        while (waypointIndex < route.size()) {
            if (mustStop(input)) {
                return;
            }

            int revisionBeforeWaypoint = routeRevision;
            MissionRequest.WaypointRequest waypoint = route.get(waypointIndex);
            activities.flyToWaypoint(
                missionId, droneId, waypointIndex + 1, waypoint.latitude(), waypoint.longitude()
            );
            Workflow.await(WAYPOINT_INTERVAL, () ->
                offline || reconnected || aborted || routeRevision != revisionBeforeWaypoint
            );
            if (aborted) {
                handleAbort(input);
                return;
            }
            if (routeRevision != revisionBeforeWaypoint) {
                waypointIndex = 0;
            } else {
                waypointIndex++;
            }
        }

        if (mustStop(input)) {
            return;
        }
        setState(input, "RETURNING", "Delivery complete, returning to base");
        activities.returnToBase(missionId, droneId);
        setState(input, "COMPLETED", "Returned to base");
    }

    private boolean mustStop(MissionWorkflowInput input) {
        if (aborted) {
            handleAbort(input);
            return true;
        }
        if (!offline) {
            return false;
        }

        setState(input, "SUSPENDED_OFFLINE", "Drone offline; waiting for reconnect");
        boolean signalReceived = Workflow.await(OFFLINE_TIMEOUT, () -> reconnected || aborted);
        if (aborted) {
            handleAbort(input);
            return true;
        }
        if (!signalReceived) {
            handleOfflineTimeout(input);
            return true;
        }

        offline = false;
        reconnected = false;
        setState(input, "RECOVERING", "Drone reconnected; validating");
        setState(input, "IN_PROGRESS", "Resuming route");
        return false;
    }

    private void handleOfflineTimeout(MissionWorkflowInput input) {
        setState(input, "RETURNING", "Reconnect timeout; returning to base");
        try {
            activities.returnToBase(input.missionId(), input.droneId());
            setState(input, "FAILED",
                "Mission failed: Drone did not reconnect before timeout. Drone safely returned to base; delivery was not completed.");
        } catch (ActivityFailure failure) {
            if (isCancellation(failure)) {
                throw failure;
            }
            setState(input, "FAILED",
                "Mission failed: Drone did not reconnect before timeout and return to base also failed.");
        }
    }

    private void handleAbort(MissionWorkflowInput input) {
        setState(input, "RETURNING", "Abort requested, returning to base");
        activities.returnToBase(input.missionId(), input.droneId());
        setState(input, "ABORTED", "Mission aborted, drone back at base");
    }

    private void setState(MissionWorkflowInput input, String nextState, String message) {
        state = nextState;
        transitionNumber++;
        activities.updateBusinessStatus(
            input.missionId(), nextState, message, "status:" + transitionNumber + ":" + nextState
        );
    }

    private boolean isCancellation(Throwable failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof CanceledFailure) {
                return true;
            }
            if (cause.getCause() == cause) {
                break;
            }
        }
        return false;
    }

    @Override
    public void droneOffline() {
        offline = true;
    }

    @Override
    public void droneReconnected() {
        if (offline) {
            reconnected = true;
        }
    }

    @Override
    public void abortMission() {
        aborted = true;
    }

    @Override
    public void reroute(List<MissionRequest.WaypointRequest> waypoints) {
        validateReroute(waypoints);
        if (!"IN_PROGRESS".equals(state) || offline || aborted) {
            throw new IllegalStateException("Mission can only be rerouted while in progress");
        }
        route = new ArrayList<>(waypoints);
        routeRevision++;
    }

    private void validateReroute(List<MissionRequest.WaypointRequest> waypoints) {
        if (waypoints == null || waypoints.isEmpty() || waypoints.size() > MAX_WAYPOINTS) {
            throw new IllegalArgumentException("Reroute must contain between 1 and 100 waypoints");
        }
        for (MissionRequest.WaypointRequest waypoint : waypoints) {
            if (waypoint == null
                || waypoint.latitude() == null
                || waypoint.longitude() == null
                || !Double.isFinite(waypoint.latitude())
                || !Double.isFinite(waypoint.longitude())
                || waypoint.latitude() < -90.0
                || waypoint.latitude() > 90.0
                || waypoint.longitude() < -180.0
                || waypoint.longitude() > 180.0) {
                throw new IllegalArgumentException("Reroute waypoint coordinates are invalid");
            }
        }
    }

    @Override
    public String getMissionState() {
        return state;
    }
}
