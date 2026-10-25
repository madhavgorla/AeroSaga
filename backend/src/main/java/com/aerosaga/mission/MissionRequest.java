package com.aerosaga.mission;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record MissionRequest(
    @NotBlank
    @Size(max = 64)
    @Pattern(regexp = "^[A-Za-z0-9][A-Za-z0-9._-]*$")
    String droneId,
    @NotBlank @Size(max = 255) String destination,
    @NotEmpty @Size(max = 100) List<@NotNull @Valid WaypointRequest> waypoints
) {
    public record WaypointRequest(
        @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
        @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude
    ) {}
}
