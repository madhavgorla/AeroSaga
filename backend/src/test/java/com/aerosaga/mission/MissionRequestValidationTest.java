package com.aerosaga.mission;

import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.List;
import org.junit.jupiter.api.Test;

class MissionRequestValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void rejectsCoordinatesOutsideTheSupportedRange() {
        MissionRequest request = new MissionRequest(
            "DRONE-001", "Warehouse B",
            List.of(new MissionRequest.WaypointRequest(91.0, 181.0))
        );

        var violations = validator.validate(request);

        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().contains("latitude")));
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().contains("longitude")));
    }

    @Test
    void rejectsRoutesLargerThanOneHundredWaypoints() {
        List<MissionRequest.WaypointRequest> waypoints = java.util.Collections.nCopies(
            101, new MissionRequest.WaypointRequest(0.0, 0.0)
        );
        MissionRequest request = new MissionRequest("DRONE-001", "Warehouse B", waypoints);

        assertTrue(validator.validate(request).stream()
            .anyMatch(v -> v.getPropertyPath().toString().equals("waypoints")));
    }
}
