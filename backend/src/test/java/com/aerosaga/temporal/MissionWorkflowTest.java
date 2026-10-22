package com.aerosaga.temporal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.aerosaga.mission.MissionRequest;
import io.temporal.client.WorkflowClient;
import io.temporal.client.WorkflowOptions;
import io.temporal.testing.TestWorkflowEnvironment;
import io.temporal.worker.Worker;
import java.util.List;
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
        MissionWorkflow workflow = client.newWorkflowStub(
                MissionWorkflow.class,
                WorkflowOptions.newBuilder()
                        .setTaskQueue(TASK_QUEUE)
                        .setWorkflowId("test-mission-1")
                        .build());
        MissionWorkflowInput input = new MissionWorkflowInput("m1", "d1", "Varanasi",
                List.of(new MissionRequest.WaypointRequest(25.3, 82.9),
                        new MissionRequest.WaypointRequest(25.4, 83.0)));

        workflow.runMission(input);

        verify(activities).dispatch("m1", "d1");
        verify(activities, times(2)).flyToWaypoint(eq("m1"), eq("d1"), anyInt(), anyDouble(), anyDouble());
        verify(activities).returnToBase("m1", "d1");
        verify(activities).updateBusinessStatus("m1", "COMPLETED", "Returned to base");
    }
}