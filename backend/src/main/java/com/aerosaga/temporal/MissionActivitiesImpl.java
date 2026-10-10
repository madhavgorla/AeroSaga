package com.aerosaga.temporal;
import org.springframework.stereotype.Component;
/** TODO: inject repositories and simulator; Activity implementations perform side effects. */
@Component
public class MissionActivitiesImpl implements MissionActivities {
 public void dispatch(String missionId,String droneId) { /* TODO simulate dispatch + persist event */ }
 public void returnToBase(String missionId,String droneId) { /* TODO simulate return + persist event */ }
 public void updateBusinessStatus(String missionId,String status,String message) { /* TODO persist status and idempotent event */ }
}
