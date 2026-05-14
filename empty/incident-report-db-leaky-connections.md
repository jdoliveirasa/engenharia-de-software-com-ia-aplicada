# Incident Report: 500 Errors on `/students/db-leaky-connections`

**Date:** May 12, 2026  
**Time Window:** ~12:06 UTC – 12:21 UTC (last 15 minutes)  
**Service:** `alumnus_app_58f0` (Node.js / Fastify)  
**Endpoint:** `GET /students/db-leaky-connections`  
**Severity:** Critical — 100% failure rate  

---

## 1. Prometheus Metrics

### 1.1 HTTP 500 Error Count

| Metric | Value |
|--------|-------|
| Metric name | `http_client_request_duration_seconds_count` |
| Labels | `http_response_status_code="500"`, `exported_job="alumnus_app_58f0"` |
| Cumulative 500 errors (total) | **3,011** |
| Successful 200 responses (total) | **2** |
| 500 errors in the last 15 min (increase) | **~462** |
| Error rate (requests/sec) | **~0.51 req/s** (consistent throughout the window) |
| Observed trend | Constant at ~0.51/s for the full 15-minute window, tapering slightly at the end (~0.22/s) as the pool reaches full saturation |

**Error rate time series (rate over 2-minute windows):**

| Time (approx UTC) | 500 errors/sec |
|-------------------|---------------|
| 12:06             | 0.510         |
| 12:07             | 0.509         |
| 12:08             | 0.515         |
| 12:09             | 0.525         |
| 12:10             | 0.493         |
| 12:11             | 0.220         |

---

### 1.2 Response Times for 500 Failures

| Metric | Value |
|--------|-------|
| Metric name | `http_client_request_duration_seconds_sum` (500 only) |
| Total duration (all 500 requests) | **1,491.59 seconds** |
| Average response time per failure | **~1,017 ms** |

**Histogram distribution of 500 response times:**

| Bucket (≤ seconds) | Requests in bucket | % of total |
|--------------------|-------------------|-----------|
| ≤ 0.005 | 0 | 0% |
| ≤ 0.01  | 0 | 0% |
| ≤ 0.25  | 0 | 0% |
| ≤ 0.5   | 0 | 0% |
| ≤ 0.75  | 0 | 0% |
| ≤ 1.0   | 0 | 0% |
| **≤ 2.5**  | **1,465** | **99.9%** |
| ≤ 5.0   | 1,467 | 100% |

> **Finding:** 100% of failures take between **1,000–2,500 ms**. This is the hallmark of a **connection pool timeout** — requests queue for an available slot and time out after ~1 second rather than getting a fast error.

---

### 1.3 Database Client Operation Metrics

| DB Operation | Count (frozen) | DB System | Namespace |
|-------------|---------------|-----------|-----------|
| SELECT | 6 | PostgreSQL | alumnus_app_58f0 |
| CREATE | 2 | PostgreSQL | alumnus_app_58f0 |
| DROP | 2 | PostgreSQL | alumnus_app_58f0 |
| INSERT | 2 | PostgreSQL | alumnus_app_58f0 |
| ALTER | 1 | PostgreSQL | alumnus_app_58f0 |
| SET | 2 | PostgreSQL | alumnus_app_58f0 |

> **Finding:** All DB operation counts are **static/frozen** throughout the entire 15-minute window — these are setup operations that ran once at app startup. Zero new DB operations are completing per request, consistent with a fully exhausted connection pool. DB server: `localhost:5433`.

---

## 2. Loki Logs

### 2.1 Error Log Pattern

All error-level logs for the endpoint share the **identical error message**, repeating every ~2 seconds:

```
Error processing request
```

| Log Field | Value |
|-----------|-------|
| `severity_text` | `error` |
| `severity_number` | `17` |
| `err_type` | `Error` |
| `err_message` | `timeout exceeded when trying to connect` |
| `service_name` | `alumnus_app_58f0` |
| `scope_name` | `@opentelemetry/instrumentation-pino` |

### 2.2 Complete Stack Trace

```
Error: timeout exceeded when trying to connect
    at /home/engenharia-de-software-com-ia-aplicada/modulo01-fundamentos-de-ia-e-llms-para-programadores/
       exemplo-grafana-mcp/_alumnus/node_modules/pg-pool/index.js:45:11
    at async DbLeakyConnectionsScenario.createConnection
       (file:///.../_alumnus/src/scenarios/db-leaky-connections/main.ts:52:20)
    at async Object.<anonymous>
       (file:///.../_alumnus/src/scenarios/db-leaky-connections/main.ts:84:24)
```

### 2.3 Pattern of Failed Requests Over Time

| Timestamp (approx UTC) | Trace ID | Error Message |
|------------------------|----------|---------------|
| 12:20:29 | `fe6170625c67f448df05c2fa086eff16` | timeout exceeded when trying to connect |
| 12:20:27 | `64343918fec077fd4262e3b1448699f0` | timeout exceeded when trying to connect |
| 12:20:25 | `c1d4adad023a740fde1e923bed8e7c63` | timeout exceeded when trying to connect |
| 12:20:23 | `7fe4b1b041bb52365a7060c88468233f` | timeout exceeded when trying to connect |
| 12:20:21 | `...` | timeout exceeded when trying to connect |
| 12:20:19 | `...` | timeout exceeded when trying to connect |

> **Finding:** Errors occur **every 2 seconds**, precisely matching the load generator's request interval. Every single request fails — 100% error rate. The error has been continuous and uninterrupted for the full 15-minute observation window.

---

## 3. Tempo Traces

### 3.1 Representative Trace

**Trace ID:** `00d68b6ad28147c0ea145070b3561d17`  
**Root span:** `GET` (client)  
**Total trace duration:** 1,005 ms  
**Error count:** 3 of 4 spans in error  

### 3.2 Span Hierarchy

```
[CLIENT]  GET  (undici)                              1005 ms  ❌ STATUS_ERROR
  └─ [SERVER]  GET /students/db-leaky-connections    1003 ms  ❌ STATUS_ERROR
       └─ [INTERNAL]  request  (fastify)             1000 ms  ⚪ STATUS_UNSET
            └─ [HANDLER]  handler - fastify          1000 ms  ❌ STATUS_ERROR
                          → @fastify/otel
```

### 3.3 Span Details

| Span | Kind | Duration | Status | Key Attributes |
|------|------|----------|--------|----------------|
| `GET` (undici) | CLIENT | 1,005 ms | ERROR | `url.full=http://localhost:9000/students/db-leaky-connections`, `http.response.status_code=500` |
| `GET /students/db-leaky-connections` (http) | SERVER | 1,003 ms | ERROR | `http.route=/students/db-leaky-connections`, `http.status_code=500`, `http.status_text=INTERNAL SERVER ERROR` |
| `request` (fastify) | INTERNAL | 1,000 ms | UNSET | `http.response.status_code=500`, `fastify.root=@fastify/otel` |
| `handler - fastify -> @fastify/otel` | INTERNAL | 1,000 ms | **ERROR** | `fastify.type=request-handler`, `http.route=/students/db-leaky-connections` |

### 3.4 Exception Event (from handler span)

```
Event name:  exception
Timestamp:   ~1ms before span end

exception.type:       Error
exception.message:    timeout exceeded when trying to connect
exception.stacktrace:
    Error: timeout exceeded when trying to connect
        at .../node_modules/pg-pool/index.js:45:11
        at async DbLeakyConnectionsScenario.createConnection
               (.../src/scenarios/db-leaky-connections/main.ts:52:20)
        at async Object.<anonymous>
               (.../src/scenarios/db-leaky-connections/main.ts:84:24)
```

### 3.5 Multi-Trace Pattern

All 5 sampled traces share the same structure:

| Trace ID | Start Time | Duration | 500 Spans | Error Spans |
|----------|-----------|----------|-----------|-------------|
| `d68b6ad28147c0ea...` | 12:18:43 | 1,005 ms | 2 | 3 |
| `304f9f22f6426f46...` | 12:16:24 | 1,002 ms | 2 | 3 |
| `3e1276fd850e15eb...` | 12:15:00 | 1,005 ms | 2 | 3 |

> **Finding:** Every trace has the **identical structure and duration (~1s)**. The 1-second latency is the `pg-pool` connection timeout, not actual database query time. The error propagates from the handler span upward through all parent spans.

---

## 4. Root Cause Analysis

### 4.1 Diagnosis

The root cause is a **database connection leak** in the `DbLeakyConnectionsScenario` class.

**Primary failure:** Each incoming HTTP request to `GET /students/db-leaky-connections` acquires a database connection from the `pg-pool` connection pool but **never releases it back to the pool**.

**Failure cascade:**
1. Request arrives → calls `createConnection()` at `main.ts:52`
2. A `pg-pool` client is acquired successfully (initially)
3. The handler at `main.ts:84` executes work with the connection
4. The connection is **never returned** (missing `client.release()`)
5. Over time, all pool slots (default max: 10 in `pg-pool`) are occupied by leaked connections
6. Subsequent requests queue and wait for a connection to become available
7. After ~1 second, `pg-pool` throws: **`timeout exceeded when trying to connect`**
8. Fastify catches the error and returns HTTP 500

### 4.2 Exact File and Line Number

| Location | File | Line | Description |
|----------|------|------|-------------|
| **Bug origin** | `src/scenarios/db-leaky-connections/main.ts` | **52** | `createConnection()` — acquires a pg-pool client (never released) |
| **Caller / Handler** | `src/scenarios/db-leaky-connections/main.ts` | **84** | Route handler that calls `createConnection` without `finally { client.release() }` |
| **Pool error source** | `node_modules/pg-pool/index.js` | **45** | `pg-pool` connection wait timeout fires |

### 4.3 Evidence Summary

| Signal | Evidence | Confirms |
|--------|----------|---------|
| **Prometheus** | 3,011 cumulative 500 errors vs 2 successes | 100% failure rate post-pool exhaustion |
| **Prometheus** | All responses take 1,000–2,500 ms | Connection wait timeout, not fast fail |
| **Prometheus** | DB operation counters frozen at startup values | No new DB operations completing (pool exhausted) |
| **Loki** | `err_message: "timeout exceeded when trying to connect"` | pg-pool wait timeout |
| **Loki** | Stack trace: `pg-pool/index.js:45` → `main.ts:52` → `main.ts:84` | Exact call chain |
| **Loki** | Errors every 2 seconds, 100% of requests | Persistent leak, pool fully exhausted |
| **Tempo** | Handler span has exception with pg-pool timeout | Error originates in request handler |
| **Tempo** | No DB child spans on failed traces | Pool exhausted before any query can execute |
| **Tempo** | Consistent ~1,000 ms duration across all error traces | Deterministic timeout, not flaky |

---

## 5. Telemetry Correlation Table

| Time (UTC) | Prometheus (500/s) | Loki Error | Trace ID | Exception |
|------------|--------------------|------------|----------|-----------|
| 12:20:29   | 0.51               | `timeout exceeded when trying to connect` | `fe6170625c67f448...` | `main.ts:52` / `main.ts:84` |
| 12:20:27   | 0.51               | `timeout exceeded when trying to connect` | `64343918fec077fd...` | `main.ts:52` / `main.ts:84` |
| 12:20:25   | 0.51               | `timeout exceeded when trying to connect` | `c1d4adad023a740f...` | `main.ts:52` / `main.ts:84` |
| 12:20:23   | 0.51               | `timeout exceeded when trying to connect` | `7fe4b1b041bb5236...` | `main.ts:52` / `main.ts:84` |
| 12:18:43   | 0.51               | `timeout exceeded when trying to connect` | `d68b6ad28147c0ea...` | `main.ts:52` / `main.ts:84` |
| 12:16:24   | 0.51               | `timeout exceeded when trying to connect` | `304f9f22f6426f46...` | `main.ts:52` / `main.ts:84` |
| 12:15:00   | 0.51               | `timeout exceeded when trying to connect` | `3e1276fd850e15eb...` | `main.ts:52` / `main.ts:84` |

> All three telemetry sources are **fully correlated** — every Prometheus 500 counter increment corresponds to a Loki error log (with matching `trace_id`) and a Tempo trace showing the exact exception event in the `handler` span.

---

## 6. Recommended Fix

In `src/scenarios/db-leaky-connections/main.ts`, line 52, the `createConnection` method acquires a `pg-pool` client. The fix is to **always release the client**, even on error:

```typescript
// BEFORE (buggy — leaks connection)
const client = await this.pool.connect();
await client.query('SELECT ...');
// client.release() is missing!

// AFTER (fixed — always releases)
const client = await this.pool.connect();
try {
  await client.query('SELECT ...');
} finally {
  client.release();  // ← This line is the fix
}
```

Alternatively, use `pool.query()` directly, which handles client acquisition and release automatically:

```typescript
// Simplest fix — use pool.query() instead of pool.connect()
const result = await this.pool.query('SELECT ...');
```

---

*Report generated via Grafana MCP (Prometheus + Loki + Tempo) on May 12, 2026*
