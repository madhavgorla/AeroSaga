# Workflow Tests

File: `backend/src/test/java/com/aerosaga/temporal/MissionWorkflowTest.java`
Run: `mvn test` (or IntelliJ green arrow). Last result: 2 tests, 0 failures. The Mockito "self-attach" WARNING is harmless.

## How tests are built
- `TestWorkflowEnvironment` (temporal-testing): in-memory Temporal server, no Docker needed. Time-skipping makes 5-minute timers finish instantly.
- Activities are Mockito mocks (`mock(MissionActivities.class, withSettings().withoutAnnotations())`), so the test checks Workflow logic only.
- Mockito rule: do not mix matchers and raw values. Use `eq(...)` for every argument when any matcher is used.

## Cases

| # | Test | What it proves | Status |
|---|---|---|---|
| 1 | `happyPathCompletesMission` | dispatch, flyToWaypoint per waypoint, returnToBase run; final state COMPLETED | Passing |
| 2 | `abortDuringFlightReturnsToBaseAndEndsAborted` | Signal sent during waypoint 1; drone returns to base; final state ABORTED; no further waypoints flown | Passing |
| 3 | `offlineWithoutReconnectEndsFailedAfterTimeout` | After 5 min with no reconnect: RETURNING then FAILED, returnToBase called | Next |
| 4 | offline then reconnect | SUSPENDED_OFFLINE -> RECOVERING -> IN_PROGRESS -> COMPLETED | Pending |
| 5 | offline then abort | abort wins during wait, ends ABORTED | Pending |
| 6 | duplicate reconnect / reconnect while online | ignored safely | Pending |
| 7 | Activity retries and timeouts | retry up to 3 then failure handling | Pending |
| 8 | Worker restart | history replays, Workflow continues (manual with Temporal UI + docker) | Pending |
| 9 | reroute | needs Signal added first | Pending |

## Manual evidence (Hello World, package com.harry)
- Worker killed mid-Activity: Activity retried (Attempt 2) and finished. Durable execution.
- Signal `changeName` sent after 30 s `Workflow.await` timer fired: Timer Fired (Event 6), Signal received later (Event 11); Workflow had already moved on. Fix: longer await.
- Query is read-only and does not appear in Event History. Signal does ("Workflow Execution Signaled").

## Update `tests/TEST_PLAN.md`
Tick: "Workflow starts" (happy path), and abort. Leave offline, reconnect, worker restart, retry/timeouts, reroute unticked until each has a passing test or screenshot.
