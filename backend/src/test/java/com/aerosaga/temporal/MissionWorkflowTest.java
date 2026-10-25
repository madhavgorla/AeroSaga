package com.aerosaga.temporal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.withSettings;
import static org.mockito.Mockito.mock;

import com.aerosaga.mission.MissionRequest;
import io.temporal.client.WorkflowClient;
import io.temporal.client.WorkflowFailedException;
import io.temporal.client.WorkflowOptions;
import io.temporal.client.WorkflowStub;
import io.temporal.testing.TestWorkflowEnvironment;
import io.temporal.worker.Worker;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MissionWorkflowTest {
    private static final String TASK_QUEUE = "TEST_TASK_QUEUE";

    private TestWorkflowEnvironment env;
    private WorkflowClient client;
    private MissionActivities activities;

    @BeforeEach
    void setUp() {
        env = TestWorkflowEnvironment.newInstance();
        Worker worker = env.newWorker(TASK_QUEUE);
        worker.registerWorkflowImplementationTypes(MissionWorkflowImpl.class);
        activities = mock(MissionActivities.class, withSettings().withoutAnnotations());
        worker.registerActivitiesImplementations(activities);
        env.start();
        client = env.getWorkflowClient();
    }

    @AfterEach
    void tearDown() {
        env.close();
    }

    @Test
    void happyPathCompletesMission() {
        MissionWorkflow workflow = newWorkflow("test-mission-1");
        MissionWorkflowInput input = input("m1",
            new MissionRequest.WaypointRequest(25.3, 82.9),
            new MissionRequest.WaypointRequest(25.4, 83.0));

        workflow.runMission(input);

        verify(activities).dispatch("m1", "d1");
        verify(activities, times(2)).flyToWaypoint(
            eq("m1"), eq("d1"), anyInt(), anyDouble(), anyDouble()
        );
        verify(activities).returnToBase("m1", "d1");
        verify(activities).updateBusinessStatus(
            "m1", "COMPLETED", "Returned to base", "status:4:COMPLETED"
        );
    }

    @Test
    void abortDuringFlightReturnsToBaseAndEndsAborted() {
        MissionWorkflow workflow = newWorkflow("test-mission-2");
        MissionWorkflow signalWorkflow = client.newWorkflowStub(MissionWorkflow.class, "test-mission-2");
        MissionWorkflowInput input = input("m2",
            new MissionRequest.WaypointRequest(25.3, 82.9),
            new MissionRequest.WaypointRequest(25.4, 83.0));

        doAnswer(invocation -> {
            signalWorkflow.abortMission();
            return null;
        }).when(activities).flyToWaypoint(
            eq("m2"), eq("d1"), eq(1), anyDouble(), anyDouble()
        );

        workflow.runMission(input);

        verify(activities, times(1)).flyToWaypoint(
            eq("m2"), eq("d1"), anyInt(), anyDouble(), anyDouble()
        );
        verify(activities).returnToBase("m2", "d1");
        verify(activities).updateBusinessStatus(
            "m2", "ABORTED", "Mission aborted, drone back at base", "status:4:ABORTED"
        );
        verify(activities, never()).updateBusinessStatus(
            eq("m2"), eq("COMPLETED"), anyString(), anyString()
        );
    }

    @Test
    void offlineWithoutReconnectEndsFailedAfterFiveMinuteTimeout() {
        MissionWorkflow workflow = newWorkflow("test-mission-3");
        MissionWorkflow signalWorkflow = client.newWorkflowStub(MissionWorkflow.class, "test-mission-3");
        MissionWorkflowInput input = input("m3",
            new MissionRequest.WaypointRequest(25.3, 82.9),
            new MissionRequest.WaypointRequest(25.4, 83.0));

        doAnswer(invocation -> {
            signalWorkflow.droneOffline();
            return null;
        }).when(activities).flyToWaypoint(
            eq("m3"), eq("d1"), eq(1), anyDouble(), anyDouble()
        );

        WorkflowClient.start(workflow::runMission, input);

        env.sleep(Duration.ofMinutes(4));
        assertEquals("SUSPENDED_OFFLINE", workflow.getMissionState());
        env.sleep(Duration.ofMinutes(2));
        assertEquals("FAILED", workflow.getMissionState());
        WorkflowStub.fromTyped(workflow).getResult(Void.class);

        verify(activities).returnToBase("m3", "d1");
        verify(activities, never()).flyToWaypoint(
            eq("m3"), eq("d1"), eq(2), anyDouble(), anyDouble()
        );
        verify(activities).updateBusinessStatus(
            "m3", "FAILED",
            "Mission failed: Drone did not reconnect before timeout. Drone safely returned to base; delivery was not completed.",
            "status:5:FAILED"
        );
        verify(activities, never()).updateBusinessStatus(
            eq("m3"), eq("COMPLETED"), anyString(), anyString()
        );
    }

    @Test
    void rerouteSignalReplacesRemainingWaypointsDuringFlight() {
        MissionWorkflow workflow = newWorkflow("reroute-mission");
        MissionWorkflow signalWorkflow = client.newWorkflowStub(MissionWorkflow.class, "reroute-mission");
        MissionRequest.WaypointRequest original = new MissionRequest.WaypointRequest(25.3, 82.9);
        MissionRequest.WaypointRequest oldRemaining = new MissionRequest.WaypointRequest(25.4, 83.0);
        MissionRequest.WaypointRequest reroutedFirst = new MissionRequest.WaypointRequest(26.1, 84.1);
        MissionRequest.WaypointRequest reroutedSecond = new MissionRequest.WaypointRequest(26.2, 84.2);
        AtomicBoolean rerouted = new AtomicBoolean();
        MissionWorkflowInput input = input("reroute",
            original, oldRemaining);

        doAnswer(invocation -> {
            if (rerouted.compareAndSet(false, true)) {
                signalWorkflow.reroute(List.of(reroutedFirst, reroutedSecond));
            }
            return null;
        }).when(activities).flyToWaypoint(
            eq("reroute"), eq("d1"), anyInt(), anyDouble(), anyDouble()
        );

        workflow.runMission(input);

        verify(activities).flyToWaypoint("reroute", "d1", 1, original.latitude(), original.longitude());
        verify(activities).flyToWaypoint("reroute", "d1", 1, reroutedFirst.latitude(), reroutedFirst.longitude());
        verify(activities).flyToWaypoint("reroute", "d1", 2, reroutedSecond.latitude(), reroutedSecond.longitude());
        verify(activities, never()).flyToWaypoint(
            eq("reroute"), eq("d1"), eq(2), eq(oldRemaining.latitude()), eq(oldRemaining.longitude())
        );
    }

    @Test
    void activityFailureMarksMissionFailedAndRemainsFailedWorkflow() {
        MissionWorkflow workflow = newWorkflow("activity-failure-mission");
        MissionWorkflowInput input = input("activity-failure",
            new MissionRequest.WaypointRequest(25.3, 82.9));
        doThrow(new IllegalStateException("waypoint persistence failed"))
            .when(activities).flyToWaypoint(
                eq("activity-failure"), eq("d1"), eq(1), anyDouble(), anyDouble()
            );

        assertThrows(WorkflowFailedException.class, () -> workflow.runMission(input));

        verify(activities).updateBusinessStatus(
            eq("activity-failure"), eq("FAILED"),
            eq("Mission execution failed after activity retries"), eq("status:3:FAILED")
        );
        verify(activities, never()).updateBusinessStatus(
            eq("activity-failure"), eq("COMPLETED"), anyString(), anyString()
        );
    }

    @Test
    void workflowCancellationDoesNotMarkMissionFailed() throws InterruptedException {
        MissionWorkflow workflow = newWorkflow("cancelled-mission");
        CountDownLatch waypointStarted = new CountDownLatch(1);
        CountDownLatch releaseWaypoint = new CountDownLatch(1);
        doAnswer(invocation -> {
            waypointStarted.countDown();
            if (!releaseWaypoint.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Test timed out waiting to release waypoint activity");
            }
            return null;
        }).when(activities).flyToWaypoint(
            eq("cancelled"), eq("d1"), eq(1), anyDouble(), anyDouble()
        );

        WorkflowClient.start(workflow::runMission,
            input("cancelled", new MissionRequest.WaypointRequest(25.3, 82.9)));
        assertTrue(waypointStarted.await(5, TimeUnit.SECONDS));

        WorkflowStub.fromTyped(workflow).cancel();
        releaseWaypoint.countDown();
        assertThrows(WorkflowFailedException.class,
            () -> WorkflowStub.fromTyped(workflow).getResult(Void.class));

        verify(activities, never()).updateBusinessStatus(
            eq("cancelled"), eq("FAILED"), anyString(), anyString()
        );
    }

    private MissionWorkflow newWorkflow(String workflowId) {
        return client.newWorkflowStub(
            MissionWorkflow.class,
            WorkflowOptions.newBuilder().setTaskQueue(TASK_QUEUE).setWorkflowId(workflowId).build()
        );
    }

    private MissionWorkflowInput input(String missionId, MissionRequest.WaypointRequest... waypoints) {
        return new MissionWorkflowInput(missionId, "d1", "Varanasi", List.of(waypoints));
    }
}
