export interface WhaleWallet {
  id: number;
  address: string;
  label: string;
  tag: string;
  risk_tier: string;
  win_rate_30d: number;
  pnl_30d_sol: number;
  tx_count: number;
  is_active: boolean;
}

export interface WhaleSignal {
  id: string;
  wallet_address: string;
  wallet_label: string;
  token_address: string;
  token_symbol: string;
  action: 'BUY' | 'SELL';
  amount_sol: number;
  token_amount: number;
  price_usd: number;
  confidence_score: number;
  status: string;
  detected_at: string;
}

export interface OverviewData {
  status: string;
  summary: {
    active_whales_count: number;
    signals_detected_24h: number;
    total_tracked_volume_sol: number;
    high_conviction_signals: number;
  };
  wallets: WhaleWallet[];
  recent_signals: WhaleSignal[];
  timestamp: string;
}

export interface CircuitBreakerState {
  is_tripped: boolean;
  trip_reason: string | null;
  tripped_at: string | null;
  reset_at: string | null;
  daily_loss_sol: number;
  daily_baseline_sol: number;
  consecutive_failures: number;
  max_failures_threshold: number;
}

export interface RiskLimits {
  max_position_size_sol: number;
  max_total_exposure_sol: number;
  daily_loss_limit_sol: number;
  max_slippage_bps: number;
  current_exposure_sol: number;
  exposure_utilization_pct: number;
  trading_mode: string;
  live_trading_enabled: boolean;
}

export interface TokenWhitelistItem {
  id: number;
  mint_address: string;
  symbol: string;
  name: string;
  decimals: number;
  is_whitelisted: boolean;
  is_blacklisted: boolean;
  rugcheck_score: number;
  liquidity_usd: number;
}

export interface RiskData {
  circuit_breaker: CircuitBreakerState;
  limits: RiskLimits;
  whitelist: TokenWhitelistItem[];
  timestamp: string;
}

export interface PositionItem {
  id: string;
  token_symbol: string;
  token_address: string;
  entry_price_usd: number;
  current_price_usd: number;
  amount_tokens: number;
  invested_sol: number;
  unrealized_pnl_usd: number;
  unrealized_pnl_pct: number;
  trailing_stop_pct: number;
  highest_price_usd: number;
  opened_at: string;
  status: string;
}

export interface ClosedPositionItem {
  id: string;
  token_symbol: string;
  token_address: string;
  entry_price_usd: number;
  current_price_usd: number;
  amount_tokens: number;
  invested_sol: number;
  realized_pnl_usd: number;
  realized_pnl_pct: number;
  opened_at: string;
  closed_at: string;
  status: string;
}

export interface TradeExecutionItem {
  id: string;
  position_id: string | null;
  token_symbol: string;
  side: 'BUY' | 'SELL';
  route: string;
  input_amount: number;
  output_amount: number;
  executed_price: number;
  slippage_bps: number;
  priority_fee_sol: number;
  status: string;
  executed_at: string;
}

export interface PositionsData {
  summary: {
    open_positions_count: number;
    total_unrealized_pnl_usd: number;
    total_invested_sol: number;
    closed_positions_count: number;
  };
  open_positions: PositionItem[];
  closed_positions: ClosedPositionItem[];
  executions: TradeExecutionItem[];
  timestamp: string;
}

export interface ServiceStatus {
  name: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  latency_ms: number;
  endpoint: string;
  details: string;
}

export interface AuditLogItem {
  id: number;
  operator_id: string;
  action_type: string;
  payload: string;
  ip_address: string;
  status: string;
  details: string;
  timestamp: string;
}

export interface SystemHealthData {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  system_time: string;
  environment: string;
  trading_mode: string;
  services: ServiceStatus[];
  audit_logs: AuditLogItem[];
}

export interface UserSession {
  is_authenticated: boolean;
  user_id: string;
  role: 'operator' | 'viewer' | 'unauthenticated';
  can_execute: boolean;
  can_reset_breaker: boolean;
  environment: string;
  token: string | null;
}
