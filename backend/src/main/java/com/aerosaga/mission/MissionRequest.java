package com.aerosaga.mission;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
public record MissionRequest(@NotBlank String droneId, @NotBlank String destination, @NotEmpty List<@Valid WaypointRequest> waypoints) {
 public record WaypointRequest(@NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
                               @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude) {}
}
