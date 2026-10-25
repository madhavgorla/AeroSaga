package com.aerosaga.temporal;

import com.aerosaga.mission.DroneEntity;
import com.aerosaga.mission.DroneRepository;
import com.aerosaga.mission.MissionEntity;
import com.aerosaga.mission.MissionEventEntity;
import com.aerosaga.mission.MissionEventRepository;
import com.aerosaga.mission.MissionRepository;
import com.aerosaga.mission.MissionStatus;
import com.aerosaga.mission.WaypointRepository;
import java.math.BigDecimal;
import java.time.Instant;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class MissionActivitiesImpl implements MissionActivities {
    private final MissionRepository missions;
    private final DroneRepository drones;
    private final WaypointRepository waypoints;
    private final MissionEventRepository events;

    public MissionActivitiesImpl(
        MissionRepository missions,
        DroneRepository drones,
        WaypointRepository waypoints,
        MissionEventRepository events
    ) {
        this.missions = missions;
        this.drones = drones;
        this.waypoints = waypoints;
        this.events = events;
    }

    @Override
    @Transactional
    public void dispatch(String missionId, String droneId) {
        MissionEntity mission = requireMission(missionId);
        DroneEntity drone = requireDrone(droneId);
        drone.setStatus("IN_FLIGHT");
        drone.setLastSeenAt(Instant.now());
        recordEvent(missionId, "drone-dispatched", "DRONE_DISPATCHED", "Drone dispatched");
    }

    @Override
    @Transactional
    public void flyToWaypoint(
        String missionId, String droneId, int index, double latitude, double longitude
    ) {
        MissionEntity mission = requireMission(missionId);
        if (!mission.getDroneId().equals(droneId)) {
            throw new IllegalStateException("Mission is assigned to a different drone");
        }
        BigDecimal lat = BigDecimal.valueOf(latitude);
        BigDecimal lon = BigDecimal.valueOf(longitude);
        mission.setCurrentLocation(lat, lon);
        DroneEntity drone = requireDrone(droneId);
        drone.setCurrentLocation(lat, lon);
        drone.setLastSeenAt(Instant.now());
        waypoints.findFirstByMissionIdAndLatitudeAndLongitude(missionId, lat, lon)
            .ifPresent(waypoint -> waypoint.setWaypointStatus("COMPLETED"));
        recordEvent(missionId, "waypoint:" + index + ":" + latitude + ":" + longitude,
            "WAYPOINT_REACHED", "Reached waypoint " + index);
    }

    @Override
    @Transactional
    public void returnToBase(String missionId, String droneId) {
        MissionEntity mission = requireMission(missionId);
        DroneEntity drone = requireDrone(droneId);
        drone.setStatus("RETURNING");
        drone.setLastSeenAt(Instant.now());
        recordEvent(missionId, "return-started", "RETURN_STARTED", "Drone returning to base");
    }

    @Override
    @Transactional
    public void updateBusinessStatus(String missionId, String status, String message, String eventKey) {
        MissionEntity mission = requireMission(missionId);
        MissionStatus newStatus = MissionStatus.valueOf(status);
        mission.setStatus(newStatus);
        DroneEntity drone = requireDrone(mission.getDroneId());
        if (newStatus == MissionStatus.IN_PROGRESS || newStatus == MissionStatus.RECOVERING) {
            drone.setStatus("IN_FLIGHT");
        } else if (newStatus == MissionStatus.COMPLETED
            || newStatus == MissionStatus.ABORTED || newStatus == MissionStatus.FAILED) {
            drone.setStatus("AVAILABLE");
        }
        drone.setLastSeenAt(Instant.now());
        recordEvent(missionId, eventKey, "STATUS_CHANGED", message);
    }

    private MissionEntity requireMission(String id) {
        return missions.findById(id).orElseThrow(() -> new IllegalStateException("Mission record is missing"));
    }

    private DroneEntity requireDrone(String id) {
        return drones.findById(id).orElseThrow(() -> new IllegalStateException("Drone record is missing"));
    }

    private void recordEvent(String missionId, String key, String type, String message) {
        if (!events.existsByMissionIdAndEventKey(missionId, key)) {
            events.save(new MissionEventEntity(missionId, key, type, message, Instant.now()));
        }
    }
}
