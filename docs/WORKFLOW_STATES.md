# Suggested mission states

| State | Meaning | Example next states |
|---|---|---|
| CREATED | Accepted | SCHEDULED / FAILED |
| SCHEDULED | Workflow started | IN_PROGRESS / FAILED |
| IN_PROGRESS | Delivery underway | SUSPENDED_OFFLINE / RETURNING / COMPLETED / FAILED |
| SUSPENDED_OFFLINE | Durable wait for reconnect/timeout | RECOVERING / RETURNING / FAILED |
| RECOVERING | Reconnect validated | IN_PROGRESS / RETURNING / FAILED |
| RETURNING | Returning to base | COMPLETED / FAILED |
| COMPLETED | Finished | terminal |
| ABORTED | Abort handled | terminal |
| FAILED | Unrecoverable per policy | terminal or explicit retry |

Use Temporal signals and workflow conditions for offline/reconnect. Define offline timeout, retries, Activity timeouts and abort/reroute rules with mentor. Test worker restart while workflow is waiting and inspect Temporal Web UI/history.
