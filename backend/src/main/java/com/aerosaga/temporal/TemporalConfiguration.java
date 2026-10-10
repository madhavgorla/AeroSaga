package com.aerosaga.temporal;
import io.temporal.client.WorkflowClient;
import io.temporal.serviceclient.WorkflowServiceStubs;
import io.temporal.serviceclient.WorkflowServiceStubsOptions;
import io.temporal.worker.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;

@Configuration
public class TemporalConfiguration {
    private static final Logger log = LoggerFactory.getLogger(TemporalConfiguration.class);

    @Bean
    public WorkflowServiceStubs workflowServiceStubs(@Value("${aerosaga.temporal.address}") String address,
                                                   @Value("${aerosaga.temporal.enabled:false}") boolean enabled) {
        if (!enabled) {
            log.info("Temporal is disabled; skipping service client initialization.");
            return null;
        }
        return WorkflowServiceStubs.newServiceStubs(WorkflowServiceStubsOptions.newBuilder().setTarget(address).build());
    }

    @Bean
    public WorkflowClient workflowClient(WorkflowServiceStubs stubs) {
        if (stubs == null) {
            return null;
        }
        return WorkflowClient.newInstance(stubs);
    }

    @Bean
    public WorkerFactory workerFactory(WorkflowClient client, MissionActivitiesImpl activities,
                                       @Value("${aerosaga.temporal.task-queue}") String queue,
                                       @Value("${aerosaga.temporal.enabled:false}") boolean enabled) {
        if (!enabled || client == null) {
            log.info("Temporal worker factory is disabled; skipping worker startup.");
            return null;
        }
        WorkerFactory factory = WorkerFactory.newInstance(client);
        Worker worker = factory.newWorker(queue);
        worker.registerWorkflowImplementationTypes(MissionWorkflowImpl.class);
        worker.registerActivitiesImplementations(activities);
        factory.start();
        return factory;
    }
}
