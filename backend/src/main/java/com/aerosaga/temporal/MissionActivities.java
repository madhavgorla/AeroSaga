package com.aerosaga.temporal;
import io.temporal.activity.*;
@ActivityInterface
public interface MissionActivities {
 @ActivityMethod void dispatch(String missionId,String droneId);
 @ActivityMethod void returnToBase(String missionId,String droneId);
 @ActivityMethod void updateBusinessStatus(String missionId,String status,String message);
 @ActivityMethod void flyToWaypoint(String missionId, String droneId, int index, double latitude, double longitude);
}
