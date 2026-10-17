# Risk Management & Circuit Breaker Architecture

## 1. Centralized Circuit Breaker
The circuit breaker is the authoritative safety gateway for all automated trading actions.

### Automated Trip Triggers
- **Consecutive Execution Failures**: Automatically trips when consecutive execution or RPC communication failures reach `circuit_breaker_max_consecutive_failures` (default: 3).
- **Daily Loss Limit**: Automatically trips when cumulative daily losses breach `daily_loss_limit_sol` (default: 10 SOL) relative to the persisted daily baseline.
- **Manual Trip**: Authorized operators can immediately halt all trading actions from the UI or API.

### Reset Mechanism
- Resetting the circuit breaker clears the trip state, consecutive failure count, and resets the daily loss accumulator.
- Requires operator credentials and creates an immutable audit log record.

## 2. Capital Reservation Model
To prevent race conditions during high-volume signal detection:
1. Signal detected -> `CapitalReservationManager.request_reservation()`
2. Atomic check against `max_total_exposure_sol` and `max_position_size_sol`
3. If approved, capital is reserved in memory while pre-signing checks run
4. If transaction fills, reservation is converted into an open database position
5. If quote fails or is rejected, reservation is released immediately

## 3. Evidence-Based Freshness Verification
Never assumes quotes or valuations are valid. Explicitly measures:
$$\text{age} = \text{now}_{\text{UTC}} - \text{timestamp}_{\text{quote}}$$
If $\text{age} > 15\text{ seconds}$, quote is rejected as stale.
If $\text{age} < -1\text{ second}$, quote is rejected as future-dated anomaly.
