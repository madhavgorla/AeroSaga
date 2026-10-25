package com.aerosaga.mission;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/missions")
public class MissionController {
    private final MissionService service;

    public MissionController(MissionService service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MissionResponse create(@Valid @RequestBody MissionRequest request) {
        return service.create(request);
    }

    @GetMapping
    public List<MissionResponse> list() { return service.list(); }

    @GetMapping("/{missionId}")
    public MissionResponse get(@PathVariable String missionId) { return service.get(missionId); }

    @GetMapping("/{missionId}/events")
    public List<MissionEventResponse> events(@PathVariable String missionId) { return service.events(missionId); }

    @GetMapping("/{missionId}/workflow")
    public WorkflowStateResponse workflow(@PathVariable String missionId) { return service.workflowState(missionId); }

    @PostMapping("/{missionId}/abort")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public MissionResponse abort(@PathVariable String missionId) { return service.abort(missionId); }

    @PostMapping("/{missionId}/reroute")
    public MissionResponse reroute(
        @PathVariable String missionId,
        @Valid @RequestBody RerouteRequest request
    ) {
        return service.reroute(missionId, request);
    }
}
