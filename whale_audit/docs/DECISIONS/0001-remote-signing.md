# Architecture Decision Records (ADRs)

## 0001: Remote Isolated Signing
- **Status**: Accepted
- **Context**: Copy-trading execution requires signing Solana transactions. Storing private keys on client browsers or general-purpose web workers creates critical compromise vectors.
- **Decision**: Private keys reside strictly in an isolated signer service or hardware enclave. Web and worker nodes prepare serialized transactions and validate guardrails before requesting isolated signatures.

## 0002: Centralized Risk Engine & Authoritative Circuit Breaker
- **Status**: Accepted
- **Context**: Dispersed safety limits across frontend and worker processes lead to desynchronization and bypasses.
- **Decision**: All execution pathways must consult `CircuitBreakerManager` and `ExecutionGuardrails` on the authoritative backend.

## 0003: Atomic Capital Reservations
- **Status**: Accepted
- **Context**: Concurrent whale signals can simultaneously attempt to enter positions, breaching total exposure caps.
- **Decision**: Implement in-process lock-based capital reservations verified against persisted active database exposure before routing quotes.

## 0004: Evidence-Based Freshness
- **Status**: Accepted
- **Context**: Stale quotes in volatile DEX markets cause massive slippage losses.
- **Decision**: Reject all quotes and valuations older than 15-30 seconds using verified delta timestamps.
