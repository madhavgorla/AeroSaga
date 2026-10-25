package com.aerosaga.mission;

import com.aerosaga.temporal.MissionWorkflow;
import com.aerosaga.temporal.MissionWorkflowInput;
import io.temporal.client.WorkflowClient;
import io.temporal.client.WorkflowNotFoundException;
import io.temporal.client.WorkflowOptions;
import io.temporal.client.WorkflowServiceException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class MissionService {
    private static final Logger LOGGER = LoggerFactory.getLogger(MissionService.class);
    private static final Set<MissionStatus> ACTIVE_STATUSES = Set.of(
        MissionStatus.CREATED, MissionStatus.SCHEDULED, MissionStatus.IN_PROGRESS,
        MissionStatus.SUSPENDED_OFFLINE, MissionStatus.RECOVERING, MissionStatus.RETURNING
    );
    private static final Set<MissionStatus> TERMINAL_STATUSES = Set.of(
        MissionStatus.COMPLETED, MissionStatus.ABORTED, MissionStatus.FAILED
    );

    private final MissionRepository missionRepository;
    private final DroneRepository droneRepository;
    private final WaypointRepository waypointRepository;
    private final MissionEventRepository eventRepository;
    private final WorkflowClient workflowClient;
    private final TransactionTemplate transactions;
    private final String taskQueue;

    public MissionService(
        MissionRepository missionRepository,
        DroneRepository droneRepository,
        WaypointRepository waypointRepository,
        MissionEventRepository eventRepository,
        WorkflowClient workflowClient,
        TransactionTemplate transactions,
        @Value("${aerosaga.temporal.task-queue}") String taskQueue
    ) {
        this.missionRepository = missionRepository;
        this.droneRepository = droneRepository;
        this.waypointRepository = waypointRepository;
        this.eventRepository = eventRepository;
        this.workflowClient = workflowClient;
        this.transactions = transactions;
        this.taskQueue = taskQueue;
    }

    public MissionResponse create(MissionRequest request) {
        MissionEntity mission = transactions.execute(status -> {
            DroneEntity drone = droneRepository.findByIdForUpdate(request.droneId())
                .orElseThrow(() -> notFound("Drone not found"));
            if (!"AVAILABLE".equals(drone.getStatus())) {
                throw conflict("Drone is not available");
            }

            String missionId = UUID.randomUUID().toString();
            String workflowId = "mission-" + missionId;
            MissionEntity created = missionRepository.saveAndFlush(new MissionEntity(
                missionId, request.droneId(), request.destination(), workflowId, Instant.now()
            ));
            drone.setStatus("IN_MISSION");
            drone.setLastSeenAt(Instant.now());
            saveWaypoints(missionId, request.waypoints());
            recordEvent(missionId, "mission-created", "MISSION_CREATED", "Mission accepted");
            return created;
        });

        MissionWorkflow workflow = workflowClient.newWorkflowStub(
            MissionWorkflow.class,
            WorkflowOptions.newBuilder().setWorkflowId(mission.getWorkflowId()).setTaskQueue(taskQueue).build()
        );
        try {
            WorkflowClient.start(workflow::runMission, new MissionWorkflowInput(
                mission.getMissionId(), mission.getDroneId(), mission.getDestination(), request.waypoints()
            ));
        } catch (WorkflowServiceException exception) {
            LOGGER.error("Temporal could not start mission workflow {}", mission.getWorkflowId(), exception);
            transactions.executeWithoutResult(status -> {
                MissionEntity failed = requireMission(mission.getMissionId());
                failed.setStatus(MissionStatus.FAILED);
                droneRepository.findById(failed.getDroneId()).ifPresent(drone -> drone.setStatus("AVAILABLE"));
                recordEvent(failed.getMissionId(), "workflow-start-failed", "WORKFLOW_START_FAILED",
                    "Mission workflow could not be started");
            });
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "WORKFLOW_UNAVAILABLE",
                "Mission was saved but its workflow could not be started. Check Temporal and retry with a new mission.");
        }

        transactions.executeWithoutResult(status -> {
            MissionEntity scheduled = requireMission(mission.getMissionId());
            if (scheduled.getStatus() == MissionStatus.CREATED) {
                scheduled.setStatus(MissionStatus.SCHEDULED);
                recordEvent(scheduled.getMissionId(), "status:SCHEDULED:api", "STATUS_CHANGED", "Workflow started");
            }
        });
        return get(mission.getMissionId());
    }

    public List<MissionResponse> list() {
        return missionRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(mission -> MissionResponse.from(mission, null))
            .toList();
    }

    public MissionResponse get(String id) {
        return MissionResponse.from(requireMission(id), null);
    }

    public MissionResponse abort(String id) {
        MissionEntity mission = requireMission(id);
        if (TERMINAL_STATUSES.contains(mission.getStatus())) {
            throw conflict("A terminal mission cannot be aborted");
        }

        MissionWorkflow workflow = workflowClient.newWorkflowStub(MissionWorkflow.class, mission.getWorkflowId());
        try {
            workflow.abortMission();
        } catch (WorkflowNotFoundException exception) {
            LOGGER.warn("Workflow {} is no longer active", mission.getWorkflowId());
            throw conflict("Mission workflow is no longer active");
        } catch (WorkflowServiceException exception) {
            LOGGER.error("Temporal could not signal mission {}", mission.getMissionId(), exception);
            throw workflowUnavailable();
        }
        transactions.executeWithoutResult(status ->
            recordEvent(mission.getMissionId(), "abort-requested", "ABORT_REQUESTED", "Abort requested")
        );
        return get(id);
    }

    public List<MissionEventResponse> events(String id) {
        requireMission(id);
        return eventRepository.findByMissionIdOrderByEventTimeAscEventIdAsc(id).stream()
            .map(MissionEventResponse::from)
            .toList();
    }

    public WorkflowStateResponse workflowState(String id) {
        MissionEntity mission = requireMission(id);
        return new WorkflowStateResponse(
            mission.getMissionId(), mission.getWorkflowId(), mission.getStatus(),
            ACTIVE_STATUSES.contains(mission.getStatus())
        );
    }

    public List<DroneResponse> drones() {
        return droneRepository.findAllByOrderByDroneIdAsc().stream().map(DroneResponse::from).toList();
    }

    public DroneResponse markDroneOffline(String droneId) {
        return updateDroneConnectivity(droneId, true);
    }

    public DroneResponse markDroneReconnected(String droneId) {
        return updateDroneConnectivity(droneId, false);
    }

    public MissionResponse reroute(String id, RerouteRequest request) {
        String rerouteEventKey = "reroute:" + UUID.randomUUID();
        MissionEntity mission = transactions.execute(status -> {
            MissionEntity current = requireMission(id);
            if (current.getStatus() != MissionStatus.IN_PROGRESS) {
                throw conflict("Only an in-progress mission can be rerouted");
            }
            waypointRepository.deleteByMissionId(id);
            waypointRepository.flush();
            saveWaypoints(id, request.waypoints());
            return current;
        });

        MissionWorkflow workflow = workflowClient.newWorkflowStub(MissionWorkflow.class, mission.getWorkflowId());
        try {
            workflow.reroute(request.waypoints());
        } catch (WorkflowNotFoundException exception) {
            LOGGER.warn("Workflow {} is no longer active", mission.getWorkflowId());
            throw conflict("The route was saved, but the mission workflow is no longer active");
        } catch (WorkflowServiceException exception) {
            LOGGER.error("Temporal could not receive reroute for mission {}", mission.getMissionId(), exception);
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "WORKFLOW_UNAVAILABLE",
                "The route was saved, but Temporal could not receive the reroute. Retry while the mission is active.");
        }
        transactions.executeWithoutResult(status ->
            recordEvent(id, rerouteEventKey, "REROUTED", "Mission route replaced")
        );
        return get(id);
    }

    private DroneResponse updateDroneConnectivity(String droneId, boolean offline) {
        DroneEntity drone = droneRepository.findById(droneId)
            .orElseThrow(() -> notFound("Drone not found"));
        MissionEntity mission = missionRepository.findFirstByDroneIdAndStatusInOrderByCreatedAtDesc(
            droneId, ACTIVE_STATUSES
        ).orElseThrow(() -> conflict("Drone has no active mission"));

        String eventKey = offline ? "drone-offline" : "drone-reconnected";
        if (eventRepository.existsByMissionIdAndEventKey(mission.getMissionId(), eventKey)) {
            return DroneResponse.from(drone);
        }
        MissionStatus expected = offline ? MissionStatus.IN_PROGRESS : MissionStatus.SUSPENDED_OFFLINE;
        if (mission.getStatus() != expected) {
            throw conflict(offline ? "Drone can only go offline during an in-progress mission"
                : "Drone is not waiting for reconnection");
        }

        MissionWorkflow workflow = workflowClient.newWorkflowStub(MissionWorkflow.class, mission.getWorkflowId());
        try {
            if (offline) {
                workflow.droneOffline();
            } else {
                workflow.droneReconnected();
            }
        } catch (WorkflowNotFoundException exception) {
            LOGGER.warn("Workflow {} is no longer active", mission.getWorkflowId());
            throw conflict("Mission workflow is no longer active");
        } catch (WorkflowServiceException exception) {
            LOGGER.error("Temporal could not signal connectivity for mission {}", mission.getMissionId(), exception);
            throw workflowUnavailable();
        }

        transactions.executeWithoutResult(status -> {
            DroneEntity currentDrone = droneRepository.findById(droneId)
                .orElseThrow(() -> notFound("Drone not found"));
            currentDrone.setStatus(offline ? "OFFLINE" : "IN_FLIGHT");
            currentDrone.setLastSeenAt(Instant.now());
            recordEvent(mission.getMissionId(), eventKey,
                offline ? "DRONE_OFFLINE" : "DRONE_RECONNECTED",
                offline ? "Drone connectivity lost" : "Drone reconnected");
        });
        return DroneResponse.from(droneRepository.findById(droneId)
            .orElseThrow(() -> notFound("Drone not found")));
    }

    private void saveWaypoints(String missionId, List<MissionRequest.WaypointRequest> waypoints) {
        List<WaypointEntity> entities = new java.util.ArrayList<>(waypoints.size());
        for (int index = 0; index < waypoints.size(); index++) {
            MissionRequest.WaypointRequest waypoint = waypoints.get(index);
            entities.add(new WaypointEntity(missionId, index + 1,
                BigDecimal.valueOf(waypoint.latitude()), BigDecimal.valueOf(waypoint.longitude())));
        }
        waypointRepository.saveAll(entities);
    }

    private MissionEntity requireMission(String id) {
        return missionRepository.findById(id).orElseThrow(() -> notFound("Mission not found"));
    }

    private void recordEvent(String missionId, String eventKey, String type, String message) {
        if (!eventRepository.existsByMissionIdAndEventKey(missionId, eventKey)) {
            eventRepository.save(new MissionEventEntity(missionId, eventKey, type, message, Instant.now()));
        }
    }

    private static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
    }

    private static ApiException conflict(String message) {
        return new ApiException(HttpStatus.CONFLICT, "CONFLICT", message);
    }

    private static ApiException workflowUnavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "WORKFLOW_UNAVAILABLE",
            "Temporal could not accept the workflow signal. No workflow change was confirmed.");
    }
}
