package com.aerosaga.mission;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface DroneRepository extends JpaRepository<DroneEntity, String> {
    List<DroneEntity> findAllByOrderByDroneIdAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select drone from DroneEntity drone where drone.droneId = :droneId")
    Optional<DroneEntity> findByIdForUpdate(@Param("droneId") String droneId);
}