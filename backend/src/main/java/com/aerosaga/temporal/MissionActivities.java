package com.aerosaga.temporal;

import io.temporal.activity.ActivityInterface;
import io.temporal.activity.ActivityMethod;

@ActivityInterface
public interface MissionActivities {
    @ActivityMethod void dispatch(String missionId, String droneId);
    @ActivityMethod void visitWaypoint(String missionId, int sequence, double latitude, double longitude);
    @ActivityMethod void returnToBase(String missionId, String droneId);
    @ActivityMethod void updateBusinessStatus(String missionId, String status, String message, String eventKey);
}
