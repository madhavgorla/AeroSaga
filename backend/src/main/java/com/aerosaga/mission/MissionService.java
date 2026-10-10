package com.aerosaga.mission;
import java.util.List;
import org.springframework.stereotype.Service;
/**
 * TODO: implement with Trishul's JPA repositories and Temporal client/workflow.
 * This explicit stub prevents the team from mistaking in-memory state for durable behavior.
 */
@Service
public class MissionService {
 public MissionResponse create(MissionRequest request) { throw new UnsupportedOperationException("TODO: persist mission and start Temporal workflow"); }
 public List<MissionResponse> list() { throw new UnsupportedOperationException("TODO: query application database"); }
 public MissionResponse get(String id) { throw new UnsupportedOperationException("TODO: query mission"); }
 public MissionResponse abort(String id) { throw new UnsupportedOperationException("TODO: send abort signal"); }
}
