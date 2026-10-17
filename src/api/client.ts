import {
  OverviewData,
  RiskData,
  PositionsData,
  SystemHealthData,
  UserSession,
} from './types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('whale_auth_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const apiClient = {
  // Query methods
  getOverview: () => request<OverviewData>('/overview'),
  getRisk: () => request<RiskData>('/risk'),
  getPositions: () => request<PositionsData>('/positions'),
  getSystem: () => request<SystemHealthData>('/system'),

  // Controls
  tripCircuitBreaker: (reason: string) =>
    request<{ status: string; message: string; circuit_breaker: any }>('/controls/circuit-breaker/trip', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  resetCircuitBreaker: () =>
    request<{ status: string; message: string; circuit_breaker: any }>('/controls/circuit-breaker/reset', {
      method: 'POST',
    }),

  updateRiskSettings: (limits: {
    max_position_size_sol: number;
    max_total_exposure_sol: number;
    daily_loss_limit_sol: number;
    max_slippage_bps: number;
  }) =>
    request<{ status: string; message: string; limits: any }>('/controls/risk-settings', {
      method: 'POST',
      body: JSON.stringify(limits),
    }),

  setTradingMode: (mode: string, confirmLive = false) =>
    request<{ status: string; message: string; trading_mode: string }>('/controls/trading-mode', {
      method: 'POST',
      body: JSON.stringify({ mode, confirm_live: confirmLive }),
    }),

  exitPosition: (positionId: string, exitPercent: number, reason?: string) =>
    request<{ status: string; message: string; executed_amount: number; realized_pnl_usd: number }>(
      `/controls/positions/${positionId}/exit`,
      {
        method: 'POST',
        body: JSON.stringify({ exit_percent: exitPercent, reason }),
      }
    ),

  updateTrailingStop: (positionId: string, trailingStopPct: number) =>
    request<{ status: string; message: string; trailing_stop_pct: number }>(
      `/controls/positions/${positionId}/trailing-stop`,
      {
        method: 'POST',
        body: JSON.stringify({ trailing_stop_pct: trailingStopPct }),
      }
    ),

  whitelistToken: (token: {
    mint_address: string;
    symbol: string;
    name: string;
    decimals: number;
    is_whitelisted: boolean;
    is_blacklisted: boolean;
  }) =>
    request<{ status: string; message: string; token: any }>('/controls/whitelist', {
      method: 'POST',
      body: JSON.stringify(token),
    }),

  // Auth / Session
  verifySession: (token?: string) =>
    request<UserSession>('/auth/session', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
};
