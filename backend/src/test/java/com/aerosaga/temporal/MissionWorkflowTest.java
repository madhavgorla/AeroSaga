package com.aerosaga.temporal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.aerosaga.mission.MissionRequest;
import io.temporal.client.WorkflowClient;
import io.temporal.client.WorkflowOptions;
import io.temporal.client.WorkflowStub;
import io.temporal.testing.TestWorkflowEnvironment;
import io.temporal.worker.Worker;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.Test;

class MissionWorkflowTest {
    @Test
    void visitsRouteAndReturnsToBase() {
        String queue = "mission-test-queue";
        List<String> transitions = new CopyOnWriteArrayList<>();
        TestActivities activities = new TestActivities(transitions);

        try (TestWorkflowEnvironment environment = TestWorkflowEnvironment.newInstance()) {
            Worker worker = environment.newWorker(queue);
            worker.registerWorkflowImplementationTypes(MissionWorkflowImpl.class);
            worker.registerActivitiesImplementations(activities);
            environment.start();

            MissionWorkflow workflow = environment.getWorkflowClient().newWorkflowStub(
                MissionWorkflow.class,
                WorkflowOptions.newBuilder().setTaskQueue(queue).setWorkflowId("mission-test").build()
            );
            WorkflowClient.start(workflow::runMission, new MissionWorkflowInput(
                "mission-test", "DRONE-001", "Warehouse B",
                List.of(new MissionRequest.WaypointRequest(16.5, 80.6))
            ));

            WorkflowStub.fromTyped(workflow).getResult(Void.class);

            assertEquals(List.of("SCHEDULED", "IN_PROGRESS", "RETURNING", "COMPLETED"), transitions);
            assertEquals(1, activities.visitedWaypoints);
        }
    }

    @Test
    void recordsAbortSignalBeforeVisitingRoute() throws InterruptedException {
        String queue = "abort-test-queue";
        List<String> transitions = new CopyOnWriteArrayList<>();
        TestActivities activities = new TestActivities(transitions);
        activities.blockDispatch = true;

        try (TestWorkflowEnvironment environment = TestWorkflowEnvironment.newInstance()) {
            Worker worker = environment.newWorker(queue);
            worker.registerWorkflowImplementationTypes(MissionWorkflowImpl.class);
            worker.registerActivitiesImplementations(activities);
            environment.start();

            MissionWorkflow workflow = environment.getWorkflowClient().newWorkflowStub(
                MissionWorkflow.class,
                WorkflowOptions.newBuilder().setTaskQueue(queue).setWorkflowId("mission-abort-test").build()
            );
            WorkflowClient.start(workflow::runMission, new MissionWorkflowInput(
                "mission-abort-test", "DRONE-001", "Warehouse B",
                List.of(new MissionRequest.WaypointRequest(16.5, 80.6))
            ));

            assertTrue(activities.dispatchStarted.await(5, java.util.concurrent.TimeUnit.SECONDS));
            workflow.abortMission();
            activities.releaseDispatch.countDown();
            WorkflowStub.fromTyped(workflow).getResult(Void.class);

            assertTrue(transitions.contains("ABORTED"));
            assertEquals(0, activities.visitedWaypoints);
        }
    }

    private static final class TestActivities implements MissionActivities {
        private final List<String> transitions;
        private final java.util.concurrent.CountDownLatch dispatchStarted = new java.util.concurrent.CountDownLatch(1);
        private final java.util.concurrent.CountDownLatch releaseDispatch = new java.util.concurrent.CountDownLatch(1);
        private boolean blockDispatch;
        private int visitedWaypoints;

        private TestActivities(List<String> transitions) { this.transitions = transitions; }

        @Override
        public void dispatch(String missionId, String droneId) {
            dispatchStarted.countDown();
            if (blockDispatch) {
                try {
                    if (!releaseDispatch.await(5, java.util.concurrent.TimeUnit.SECONDS)) {
                        throw new IllegalStateException("Test did not release dispatch activity");
                    }
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("Dispatch activity interrupted", exception);
                }
            }
        }

        @Override
        public void visitWaypoint(String missionId, int sequence, double latitude, double longitude) {
            visitedWaypoints++;
        }

        @Override
        public void returnToBase(String missionId, String droneId) {}

        @Override
        public void updateBusinessStatus(String missionId, String status, String message, String eventKey) {
            transitions.add(status);
        }
    }
}
