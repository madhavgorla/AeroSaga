package com.aerosaga.mission;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/drones")
public class DroneController {
    private final MissionService service;
    public DroneController(MissionService service) { this.service = service; }
    @GetMapping
    public List<DroneResponse> list() { return service.drones(); }
    @PostMapping("/{droneId}/offline")
    public DroneResponse offline(@PathVariable String droneId) { return service.markDroneOffline(droneId); }

    @PostMapping("/{droneId}/reconnected")
    public DroneResponse reconnected(@PathVariable String droneId) { return service.markDroneReconnected(droneId); }
}