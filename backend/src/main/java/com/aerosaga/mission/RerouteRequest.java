package com.aerosaga.mission;

import com.aerosaga.mission.MissionRequest.WaypointRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record RerouteRequest(@NotEmpty @Size(max = 100) List<@NotNull @Valid WaypointRequest> waypoints) {}
