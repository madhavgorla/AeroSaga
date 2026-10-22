package com.aerosaga.mission;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MissionRepository extends JpaRepository<MissionEntity, String> {
    List<MissionEntity> findAllByOrderByCreatedAtDesc();
    Optional<MissionEntity> findFirstByDroneIdAndStatusInOrderByCreatedAtDesc(
        String droneId, Collection<MissionStatus> statuses);
}