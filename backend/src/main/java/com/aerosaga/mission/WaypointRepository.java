package com.aerosaga.mission;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WaypointRepository extends JpaRepository<WaypointEntity, Long> {
    List<WaypointEntity> findByMissionIdOrderBySequenceNumberAsc(String missionId);
    Optional<WaypointEntity> findByMissionIdAndSequenceNumber(String missionId, int sequenceNumber);
    Optional<WaypointEntity> findFirstByMissionIdAndLatitudeAndLongitude(
        String missionId, java.math.BigDecimal latitude, java.math.BigDecimal longitude);
    void deleteByMissionId(String missionId);
}