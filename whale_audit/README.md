# Whale Surveillance Dashboard

Enterprise-grade real-time Solana whale surveillance, risk controls, position management, and system health monitoring dashboard.

## Overview

The Whale Surveillance Dashboard monitors high-conviction Solana whale wallets, screens decentralized exchange swaps (Raydium, PumpFun), applies pre-signing risk guardrails, and manages automated or operator-approved copy-trading executions.

### Key Architecture & Features

- **Four Dedicated Frontend Pages**:
  - `/` — **Intelligence Overview**: Live streaming whale signals, wallet rankings, 30d PnL, conviction scoring, and filtering.
  - `/risk` — **Risk & Restriction Controls**: Authoritative circuit breaker state, capital allocations, daily loss baselines, slippage tolerance, and token whitelist.
  - `/positions` — **Positions & Execution**: Active holdings mark-to-market prices, trailing stops, manual partial exit controls (25%, 50%, 100%), and execution audit history.
  - `/system` — **System Health & Audit**: Subsystem watchdog latency monitoring, trading mode toggles (Dry-Run / Simulation / Live), and immutable operator audit logs.
- **Safety First**:
  - Default mode is strictly `dry_run` with live execution disabled.
  - Atomic capital reservations prevent race conditions and over-allocation.
  - Evidence-based quote and valuation freshness verification.
  - Remote isolated signer architecture ensuring private keys are never handled client-side.
  - Zero hard-coded test credentials or production secrets.

## Development & Testing

### Python Backend
```bash
# Install dependencies
pip install -r whale_audit/requirements.txt

# Run backend unit and integration tests
python3 -m pytest whale_audit/tests/ -v

# Run FastAPI server directly
python3 -m uvicorn whale_audit.app.main:app --port 8001 --host 0.0.0.0
```

### React Frontend
```bash
# Install frontend dependencies
npm install

# Run frontend tests
npm run test

# Type check
npm run lint

# Build production bundle
npm run build

# Start full-stack development server (Express + Vite + FastAPI proxy on port 3000)
npm run dev
```

## Security & Trading Safety

1. **Circuit Breaker**: Trips automatically on consecutive execution failures or when daily loss breaches the persisted baseline.
2. **Pre-signing Guardrails**: Enforces token whitelisting, maximum slippage (BPS), and price divergence limits prior to transaction signing.
3. **Operator Authorization**: Critical control actions (tripping/resetting breakers, updating limits, manual exits) require valid Bearer token authorization.
