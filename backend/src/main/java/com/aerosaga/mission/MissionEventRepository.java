package com.aerosaga.mission;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MissionEventRepository extends JpaRepository<MissionEventEntity, Long> {
    List<MissionEventEntity> findByMissionIdOrderByEventTimeAscEventIdAsc(String missionId);
    boolean existsByMissionIdAndEventKey(String missionId, String eventKey);
}