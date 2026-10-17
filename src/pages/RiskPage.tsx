import React, { useState } from 'react';
import { useResource } from '../hooks/useResource';
import { useSession } from '../hooks/useSession';
import { apiClient } from '../api/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  StatCard,
  Badge,
  Button,
  ErrorMessage,
  SkeletonLoader,
  Modal,
} from '../components/ui';
import { formatSol, formatAddress } from '../lib/format';
import { AuthGateModal } from '../components/AuthGate';
import {
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle,
  PlusCircle,
  TrendingDown,
  Layers,
  Percent,
} from 'lucide-react';

export const RiskPage: React.FC = () => {
  const { data, loading, error, refetch } = useResource(() => apiClient.getRisk(), {
    pollingIntervalMs: 10000,
  });
  const { isOperator } = useSession();

  // Modals & form state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [editLimitsOpen, setEditLimitsOpen] = useState(false);
  const [addTokenOpen, setAddTokenOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Form states
  const [tripReason, setTripReason] = useState('');
  const [submittingTrip, setSubmittingTrip] = useState(false);
  const [resettingBreaker, setResettingBreaker] = useState(false);

  // Limits form
  const [maxPositionSize, setMaxPositionSize] = useState('5.0');
  const [maxExposure, setMaxExposure] = useState('50.0');
  const [dailyLossLimit, setDailyLossLimit] = useState('10.0');
  const [maxSlippage, setMaxSlippage] = useState('150');
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsError, setLimitsError] = useState<string | null>(null);

  // New token form
  const [tokenMint, setTokenMint] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenDecimals, setTokenDecimals] = useState('9');
  const [savingToken, setSavingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const executeOrAuth = (action: () => void) => {
    if (!isOperator) {
      setPendingAction(() => action);
      setAuthModalOpen(true);
    } else {
      action();
    }
  };

  const handleTripBreaker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripReason.trim()) return;

    setSubmittingTrip(true);
    try {
      await apiClient.tripCircuitBreaker(tripReason.trim());
      setTripModalOpen(false);
      setTripReason('');
      setNotification({ type: 'success', message: 'Master circuit breaker manually tripped.' });
      await refetch();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setSubmittingTrip(false);
    }
  };

  const handleResetBreaker = async () => {
    setResettingBreaker(true);
    try {
      await apiClient.resetCircuitBreaker();
      setNotification({ type: 'success', message: 'Circuit breaker reset. Trading execution re-armed.' });
      await refetch();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setResettingBreaker(false);
    }
  };

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    setLimitsError(null);

    const pos = parseFloat(maxPositionSize);
    const exp = parseFloat(maxExposure);
    const loss = parseFloat(dailyLossLimit);
    const slip = parseInt(maxSlippage, 10);

    if (isNaN(pos) || pos <= 0 || isNaN(exp) || exp <= 0 || isNaN(loss) || loss <= 0 || isNaN(slip) || slip < 10) {
      setLimitsError('Please enter valid positive values for all parameters.');
      return;
    }

    if (pos > exp) {
      setLimitsError('Max single position size cannot exceed max total portfolio exposure.');
      return;
    }

    setSavingLimits(true);
    try {
      await apiClient.updateRiskSettings({
        max_position_size_sol: pos,
        max_total_exposure_sol: exp,
        daily_loss_limit_sol: loss,
        max_slippage_bps: slip,
      });
      setEditLimitsOpen(false);
      setNotification({ type: 'success', message: 'Risk parameters successfully updated in database.' });
      await refetch();
    } catch (err: any) {
      setLimitsError(err.message);
    } finally {
      setSavingLimits(false);
    }
  };

  const handleAddToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setTokenError(null);

    if (tokenMint.trim().length < 32) {
      setTokenError('Invalid Solana mint address (must be base58 address).');
      return;
    }
    if (!tokenSymbol.trim() || !tokenName.trim()) {
      setTokenError('Symbol and Name are required.');
      return;
    }

    setSavingToken(true);
    try {
      await apiClient.whitelistToken({
        mint_address: tokenMint.trim(),
        symbol: tokenSymbol.trim().toUpperCase(),
        name: tokenName.trim(),
        decimals: parseInt(tokenDecimals, 10) || 9,
        is_whitelisted: true,
        is_blacklisted: false,
      });
      setAddTokenOpen(false);
      setTokenMint('');
      setTokenSymbol('');
      setTokenName('');
      setNotification({ type: 'success', message: `Token ${tokenSymbol.toUpperCase()} added to whitelist.` });
      await refetch();
    } catch (err: any) {
      setTokenError(err.message);
    } finally {
      setSavingToken(false);
    }
  };

  const cb = data?.circuit_breaker;
  const limits = data?.limits;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-400" /> Risk & Restriction Controls
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative circuit breaker state, capital allocations, pre-signing guardrails, and token whitelist.
          </p>
        </div>

        {/* Master Breaker Actions */}
        <div className="flex items-center gap-2">
          {cb?.is_tripped ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => executeOrAuth(handleResetBreaker)}
              loading={resettingBreaker}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Circuit Breaker
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => executeOrAuth(() => setTripModalOpen(true))}
              className="text-rose-400 border-rose-500/40 hover:bg-rose-500/10"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-400" /> Trip Emergency Halt
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (limits) {
                setMaxPositionSize(limits.max_position_size_sol.toString());
                setMaxExposure(limits.max_total_exposure_sol.toString());
                setDailyLossLimit(limits.daily_loss_limit_sol.toString());
                setMaxSlippage(limits.max_slippage_bps.toString());
              }
              executeOrAuth(() => setEditLimitsOpen(true));
            }}
          >
            <Sliders className="w-3.5 h-3.5 mr-1" /> Configure Limits
          </Button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={refetch} />}

      {/* Circuit Breaker Status Banner Card */}
      <Card glow={cb?.is_tripped ? 'rose' : 'none'}>
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                  cb?.is_tripped
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                    : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                }`}
              >
                {cb?.is_tripped ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <CheckCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">
                    Master Circuit Breaker: {cb?.is_tripped ? 'TRIPPED (HALTED)' : 'ARMED & OPERATIONAL'}
                  </h2>
                  <Badge variant={cb?.is_tripped ? 'danger' : 'success'}>
                    {cb?.is_tripped ? 'HALTED' : 'ACTIVE'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {cb?.is_tripped
                    ? `Reason: ${cb.trip_reason || 'Manual safety trip'}`
                    : 'Pre-signing guardrails and loss monitoring protecting copy-trade execution.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono text-xs w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Daily Loss / Baseline</span>
                <span className="text-rose-400 font-bold">
                  {cb ? formatSol(cb.daily_loss_sol) : '--'} / {cb ? formatSol(cb.daily_baseline_sol) : '--'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Consecutive Fails</span>
                <span className="text-amber-400 font-bold">
                  {cb?.consecutive_failures ?? 0} / {cb?.max_failures_threshold ?? 3}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capital & Exposure Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Max Position Size"
          value={limits ? formatSol(limits.max_position_size_sol) : '--'}
          subValue="Single copy-trade limit"
          icon={<Layers className="w-5 h-5 text-cyan-400" />}
          color="cyan"
        />
        <StatCard
          label="Total Exposure Cap"
          value={limits ? formatSol(limits.max_total_exposure_sol) : '--'}
          subValue={`Current: ${limits ? formatSol(limits.current_exposure_sol) : '--'}`}
          icon={<Sliders className="w-5 h-5 text-indigo-400" />}
          color="cyan"
        />
        <StatCard
          label="Daily Loss Limit"
          value={limits ? formatSol(limits.daily_loss_limit_sol) : '--'}
          subValue="Auto-trips breaker on breach"
          icon={<TrendingDown className="w-5 h-5 text-rose-400" />}
          color="rose"
        />
        <StatCard
          label="Max Slippage Tolerance"
          value={limits ? `${limits.max_slippage_bps} BPS` : '--'}
          subValue={`${limits ? (limits.max_slippage_bps / 100).toFixed(2) : '--'}% max adverse slippage`}
          icon={<Percent className="w-5 h-5 text-amber-400" />}
          color="amber"
        />
      </div>

      {/* Exposure Utilization Bar */}
      {limits && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">PORTFOLIO EXPOSURE UTILIZATION</span>
              <span className="text-slate-200 font-bold">
                {limits.exposure_utilization_pct}% ({formatSol(limits.current_exposure_sol)} / {formatSol(limits.max_total_exposure_sol)})
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  limits.exposure_utilization_pct > 80
                    ? 'bg-rose-500'
                    : limits.exposure_utilization_pct > 50
                    ? 'bg-amber-400'
                    : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, limits.exposure_utilization_pct)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Token Whitelist Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Approved Token Whitelist
            </CardTitle>
            <CardDescription>
              Verified SPL mint addresses with safety rugcheck scores and automated liquidity depth monitoring.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => executeOrAuth(() => setAddTokenOpen(true))}
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Add Token
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="p-6">
              <SkeletonLoader lines={4} />
            </div>
          ) : !data?.whitelist || data.whitelist.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">No tokens configured.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Symbol</th>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Mint Address</th>
                    <th className="py-2.5 px-4 text-center">Decimals</th>
                    <th className="py-2.5 px-4 text-center">Safety Score</th>
                    <th className="py-2.5 px-4 text-right">Liquidity Depth</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.whitelist.map((token) => (
                    <tr key={token.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-100">{token.symbol}</td>
                      <td className="py-3 px-4 font-sans text-slate-300">{token.name}</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {formatAddress(token.mint_address, 8)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400">{token.decimals}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                            token.rugcheck_score >= 90
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {token.rugcheck_score}/100
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-200">
                        ${token.liquidity_usd.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant={token.is_blacklisted ? 'danger' : 'success'}>
                          {token.is_blacklisted ? 'BLACKLISTED' : 'APPROVED'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trip Confirmation Modal */}
      <Modal
        isOpen={tripModalOpen}
        onClose={() => setTripModalOpen(false)}
        title="Confirm Emergency Circuit Breaker Trip"
      >
        <form onSubmit={handleTripBreaker} className="space-y-4">
          <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg">
            WARNING: Tripping the circuit breaker immediately halts all automated copy-trade executions and rejects incoming signals until manually reset.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Reason for Emergency Halt <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={tripReason}
              onChange={(e) => setTripReason(e.target.value)}
              placeholder="e.g. Unscheduled RPC latency spike or market spread blowout"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setTripModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" loading={submittingTrip}>
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Trip Circuit Breaker
            </Button>
          </div>
        </form>
      </Modal>

      {/* Configure Limits Modal */}
      <Modal
        isOpen={editLimitsOpen}
        onClose={() => setEditLimitsOpen(false)}
        title="Configure Risk & Exposure Parameters"
      >
        <form onSubmit={handleSaveLimits} className="space-y-4">
          {limitsError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-lg">
              {limitsError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Max Position Size (SOL)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="50"
                value={maxPositionSize}
                onChange={(e) => setMaxPositionSize(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Total Exposure Cap (SOL)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="500"
                value={maxExposure}
                onChange={(e) => setMaxExposure(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Daily Loss Limit (SOL)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="100"
                value={dailyLossLimit}
                onChange={(e) => setDailyLossLimit(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Max Slippage (BPS)
              </label>
              <input
                type="number"
                step="10"
                min="10"
                max="1000"
                value={maxSlippage}
                onChange={(e) => setMaxSlippage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditLimitsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={savingLimits}>
              Save Risk Parameters
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Token Modal */}
      <Modal isOpen={addTokenOpen} onClose={() => setAddTokenOpen(false)} title="Whitelist New SPL Token">
        <form onSubmit={handleAddToken} className="space-y-4">
          {tokenError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-lg">
              {tokenError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Token Mint Address
            </label>
            <input
              type="text"
              required
              value={tokenMint}
              onChange={(e) => setTokenMint(e.target.value)}
              placeholder="e.g. EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Symbol</label>
              <input
                type="text"
                required
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                placeholder="e.g. JUP"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500 uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Decimals</label>
              <input
                type="number"
                min="0"
                max="18"
                value={tokenDecimals}
                onChange={(e) => setTokenDecimals(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Token Name</label>
            <input
              type="text"
              required
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="e.g. Jupiter Exchange Token"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAddTokenOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={savingToken}>
              Add to Whitelist
            </Button>
          </div>
        </form>
      </Modal>

      {/* Operator Auth Gate */}
      <AuthGateModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
        actionTitle="Operator Risk Controls"
      />
    </div>
  );
};
