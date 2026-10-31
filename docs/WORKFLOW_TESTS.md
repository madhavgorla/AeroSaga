# Workflow Tests

File: `backend/src/test/java/com/aerosaga/temporal/MissionWorkflowTest.java`
Run: `mvn test` (or IntelliJ green arrow). Result on `main` at 929df9c (run on 26 Oct; later commits changed only the frontend): 8 tests, 0 failures (6 in `MissionWorkflowTest` + 2 in `MissionRequestValidationTest`). Tests 1 to 3 were written by Hariom (PR #4); tests 4 to 6 were added by Naveen (PR #5) and reviewed by Hariom.

## How tests are built
- `TestWorkflowEnvironment` (temporal-testing): in-memory Temporal server, no Docker needed. Time-skipping makes 5-minute timers finish instantly.
- Activities are Mockito mocks (`mock(MissionActivities.class, withSettings().withoutAnnotations())`), so the test checks Workflow logic only.
- Mockito rule: do not mix matchers and raw values. Use `eq(...)` for every argument when any matcher is used.

## Cases

| # | Test | What it proves | Status |
|---|---|---|---|
| 1 | `happyPathCompletesMission` | dispatch, flyToWaypoint per waypoint, returnToBase run; final state COMPLETED and status event key propagated | Passing |
| 2 | `abortDuringFlightReturnsToBaseAndEndsAborted` | Signal sent during waypoint 1; drone returns to base; final state ABORTED; no further waypoints flown | Passing |
| 3 | `offlineWithoutReconnectEndsFailedAfterFiveMinuteTimeout` | Offline Signal during waypoint 1. At 4 min the state is SUSPENDED_OFFLINE; at 6 min it is FAILED. returnToBase runs once; waypoint 2 never flies. | Passing |
| 4 | `rerouteSignalReplacesRemainingWaypointsDuringFlight` | Reroute Signal received during flight replaces the remaining route; the old waypoint is never flown (`never()` check). The new route starts from its first waypoint | Passing |
| 5 | `activityFailureMarksMissionFailedAndRemainsFailedWorkflow` | Activity failure after 3 retries updates mission status to FAILED, does not mark it COMPLETED, and the Workflow itself ends failed. The event key `status:3:FAILED` depends on the number of transitions, so adding a new state changes it | Passing |
| 6 | `workflowCancellationDoesNotMarkMissionFailed` | Workflow cancellation is propagated and FAILED is not written. It does not check which state the mission ends in (there is no CANCELLED state yet) | Passing |
| 7 | offline then reconnect | SUSPENDED_OFFLINE -> RECOVERING -> IN_PROGRESS -> COMPLETED | Pending |
| 8 | offline then abort | abort wins during wait, ends ABORTED | Pending |
| 9 | duplicate reconnect / reconnect while online | ignored safely | Pending |
| 10 | Worker restart | history replays, Workflow continues (manual with Temporal UI + docker) | Pending |
| 11 | Activity StartToClose timeout, and `returnToBase` failing in the offline-timeout path | timeout counts as failure and retries; second message "return to base also failed" | Pending |
| 12 | Reroute invalid input and wrong state | invalid waypoints and reroute while offline/aborted are rejected | Pending |

## Mutation check (proof that test 3 really checks the 5-minute rule)
- First version used `getResult()` right after `env.sleep(6 min)`. It also passed with the timeout set to 10 minutes, because `getResult()` blocks and the test environment keeps skipping time until the workflow ends. So the sleep value did not matter.
- Fix: query the state with `getMissionState()` (Queries do not skip time) at 4 minutes (expect SUSPENDED_OFFLINE) and at 6 minutes (expect FAILED), and call `getResult()` only afterwards.
- Result: with `OFFLINE_TIMEOUT` = 10 min the test fails (state still SUSPENDED_OFFLINE at 6 min); with 5 min it passes.
- The FAILED business-status write and deterministic status event key are asserted by the workflow tests.

## Manual evidence (Hello World, package com.harry)
- Worker killed mid-Activity: Activity retried (Attempt 2) and finished. Durable execution.
- Signal `changeName` sent after 30 s `Workflow.await` timer fired: Timer Fired (Event 6), Signal received later (Event 11); Workflow had already moved on. Fix: longer await.
- Query is read-only and does not appear in Event History. Signal does ("Workflow Execution Signaled").

## Update `tests/TEST_PLAN.md`
Ticked: workflow starts (happy path), abort, offline timeout, reroute, and Activity failure after retries (test 5). Left unticked until each has a passing test or screenshot: reconnect, worker restart, Activity timeouts (test 11).
