# API Reference — Whale Surveillance Dashboard

All dashboard endpoints are exposed under `/api` and proxy seamlessly to the FastAPI backend.

## Query Endpoints

### `GET /api/overview`
Returns summary statistics, monitored whale wallets, and recent streaming signals.
- **Response**: `{ status: "success", summary: {...}, wallets: [...], recent_signals: [...] }`

### `GET /api/risk`
Returns current circuit breaker state, exposure limits, and approved token whitelist.
- **Response**: `{ circuit_breaker: {...}, limits: {...}, whitelist: [...] }`

### `GET /api/positions`
Returns active open holdings, mark-to-market valuations, trailing stop levels, and recent executions.
- **Response**: `{ summary: {...}, open_positions: [...], closed_positions: [...], executions: [...] }`

### `GET /api/system`
Returns real-time health watchdogs for Solana RPC, Jupiter Metis, Ingestion, and audit logs.
- **Response**: `{ status: "HEALTHY"|"DEGRADED", services: [...], audit_logs: [...] }`

---

## Operator Control Endpoints (Requires `Authorization: Bearer <token>`)

### `POST /api/controls/circuit-breaker/trip`
Manually trip the master circuit breaker.
- **Request Body**: `{ "reason": "string (min 3 chars)" }`

### `POST /api/controls/circuit-breaker/reset`
Reset the circuit breaker and re-arm execution.
- **Request Body**: `{}`

### `POST /api/controls/risk-settings`
Update risk parameters and exposure caps.
- **Request Body**:
  ```json
  {
    "max_position_size_sol": 5.0,
    "max_total_exposure_sol": 50.0,
    "daily_loss_limit_sol": 10.0,
    "max_slippage_bps": 150
  }
  ```

### `POST /api/controls/positions/{id}/exit`
Execute a manual partial or full exit on an open position.
- **Request Body**: `{ "exit_percent": 25 | 50 | 100, "reason": "string" }`

### `POST /api/controls/positions/{id}/trailing-stop`
Adjust trailing stop distance percentage.
- **Request Body**: `{ "trailing_stop_pct": 12.5 }`

### `POST /api/controls/whitelist`
Add or update a token in the approved whitelist.
- **Request Body**:
  ```json
  {
    "mint_address": "So11111111111111111111111111111111111111112",
    "symbol": "SOL",
    "name": "Wrapped SOL",
    "decimals": 9,
    "is_whitelisted": true,
    "is_blacklisted": false
  }
  ```
