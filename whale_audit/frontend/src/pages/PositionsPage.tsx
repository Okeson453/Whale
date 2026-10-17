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
import {
  formatSol,
  formatUsd,
  formatPercent,
  formatTimeAgo,
} from '../lib/format';
import { AuthGateModal } from '../components/AuthGate';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  History,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { PositionItem } from '../api/types';

export const PositionsPage: React.FC = () => {
  const { data, loading, error, refetch } = useResource(
    () => apiClient.getPositions(),
    { pollingIntervalMs: 15000 }
  );
  const { isOperator } = useSession();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionItem | null>(null);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Exit form
  const [exitPercent, setExitPercent] = useState<number>(100);
  const [exitReason, setExitReason] = useState<string>('Manual operator exit');
  const [exiting, setExiting] = useState(false);

  // Stop form
  const [trailingStopPct, setTrailingStopPct] = useState<string>('15.0');
  const [savingStop, setSavingStop] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const executeOrAuth = (action: () => void) => {
    if (!isOperator) {
      setPendingAction(() => action);
      setAuthModalOpen(true);
    } else {
      action();
    }
  };

  const handleExitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosition) return;

    setExiting(true);
    try {
      const res = await apiClient.exitPosition(selectedPosition.id, exitPercent, exitReason);
      setExitModalOpen(false);
      setNotification({
        type: 'success',
        message: `${res.message} (Realized: ${formatUsd(res.realized_pnl_usd)})`,
      });
      await refetch();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setExiting(false);
    }
  };

  const handleStopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosition) return;

    const pct = parseFloat(trailingStopPct);
    if (isNaN(pct) || pct < 1 || pct > 50) return;

    setSavingStop(true);
    try {
      await apiClient.updateTrailingStop(selectedPosition.id, pct);
      setStopModalOpen(false);
      setNotification({
        type: 'success',
        message: `Trailing stop updated to ${pct}% for ${selectedPosition.token_symbol}`,
      });
      await refetch();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setSavingStop(false);
    }
  };

  const summary = data?.summary;
  const openPositions = data?.open_positions || [];
  const closedPositions = data?.closed_positions || [];
  const executions = data?.executions || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-cyan-400" /> Positions & Execution
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Active positions, unrealized PnL, trailing stops, and copy-trade transaction history.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} loading={loading}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Positions
        </Button>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Open Positions"
          value={summary?.open_positions_count ?? '--'}
          subValue="Active copy-trade holdings"
          icon={<Briefcase className="w-5 h-5 text-cyan-400" />}
          color="cyan"
        />
        <StatCard
          label="Unrealized PnL"
          value={summary ? formatUsd(summary.total_unrealized_pnl_usd) : '--'}
          subValue="Mark-to-market valuation"
          trend={summary && summary.total_unrealized_pnl_usd >= 0 ? 'up' : 'down'}
          icon={
            summary && summary.total_unrealized_pnl_usd >= 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-400" />
            )
          }
          color={summary && summary.total_unrealized_pnl_usd >= 0 ? 'emerald' : 'rose'}
        />
        <StatCard
          label="Capital Invested"
          value={summary ? formatSol(summary.total_invested_sol) : '--'}
          subValue="Current locked SOL allocation"
          icon={<Layers className="w-5 h-5 text-cyan-400" />}
          color="cyan"
        />
        <StatCard
          label="Closed Trades"
          value={summary?.closed_positions_count ?? '--'}
          subValue="Historical realized trades"
          icon={<History className="w-5 h-5 text-slate-300" />}
          color="cyan"
        />
      </div>

      {/* Section 1: Active Open Positions Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <Briefcase className="w-4 h-4 text-cyan-400" /> Active Holdings & Positions
            </CardTitle>
            <CardDescription>
              Real-time mark-to-market prices and trailing stop risk monitors.
            </CardDescription>
          </div>
          <Badge variant="info">{openPositions.length} Open</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="p-6">
              <SkeletonLoader lines={4} />
            </div>
          ) : openPositions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No active open positions. The bot is waiting for high-conviction whale signals.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Asset</th>
                    <th className="py-2.5 px-4 text-right">Entry Price</th>
                    <th className="py-2.5 px-4 text-right">Mark Price</th>
                    <th className="py-2.5 px-4 text-right">Holdings</th>
                    <th className="py-2.5 px-4 text-right">Invested</th>
                    <th className="py-2.5 px-4 text-right">Unrealized PnL</th>
                    <th className="py-2.5 px-4 text-center">Trailing Stop</th>
                    <th className="py-2.5 px-4 text-center">Opened</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {openPositions.map((pos) => {
                    const isProfit = pos.unrealized_pnl_usd >= 0;
                    return (
                      <tr key={pos.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-100 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          {pos.token_symbol}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          {formatUsd(pos.entry_price_usd)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-100 font-bold">
                          {formatUsd(pos.current_price_usd)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {pos.amount_tokens.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300 font-bold">
                          {formatSol(pos.invested_sol)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-bold ${
                              isProfit ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isProfit ? '+' : ''}
                            {formatUsd(pos.unrealized_pnl_usd)} ({formatPercent(pos.unrealized_pnl_pct)})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedPosition(pos);
                              setTrailingStopPct(pos.trailing_stop_pct.toString());
                              executeOrAuth(() => setStopModalOpen(true));
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] cursor-pointer"
                          >
                            <Sliders className="w-3 h-3 text-cyan-400" />
                            {pos.trailing_stop_pct}%
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 text-[11px]">
                          {formatTimeAgo(pos.opened_at)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setSelectedPosition(pos);
                              setExitPercent(100);
                              executeOrAuth(() => setExitModalOpen(true));
                            }}
                            className="text-xs py-1 px-2.5"
                          >
                            <LogOut className="w-3 h-3 mr-1" /> Exit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Recent Trade Executions Feed */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <History className="w-4 h-4 text-cyan-400" /> Execution Audit Log
            </CardTitle>
            <CardDescription>
              Jupiter Metis swap transactions with real-time slippage and priority fee records.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {executions.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No trade executions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Time</th>
                    <th className="py-2.5 px-4">Side</th>
                    <th className="py-2.5 px-4">Asset</th>
                    <th className="py-2.5 px-4">Route</th>
                    <th className="py-2.5 px-4 text-right">Price</th>
                    <th className="py-2.5 px-4 text-center">Slippage</th>
                    <th className="py-2.5 px-4 text-right">Priority Fee</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {executions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {formatTimeAgo(exec.executed_at)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            exec.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {exec.side === 'BUY' ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {exec.side}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200">{exec.token_symbol}</td>
                      <td className="py-3 px-4 text-slate-400 font-sans">{exec.route}</td>
                      <td className="py-3 px-4 text-right text-slate-200">
                        {formatUsd(exec.executed_price)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-slate-300">{exec.slippage_bps} bps</span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {formatSol(exec.priority_fee_sol, 4)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge status={exec.status}>{exec.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Exit Modal */}
      <Modal
        isOpen={exitModalOpen}
        onClose={() => setExitModalOpen(false)}
        title={`Execute Manual Position Exit: ${selectedPosition?.token_symbol || ''}`}
      >
        <form onSubmit={handleExitSubmit} className="space-y-4">
          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-xs space-y-1 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Current Price:</span>
              <span className="text-slate-100 font-bold">{formatUsd(selectedPosition?.current_price_usd || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Holdings:</span>
              <span className="text-slate-100">{selectedPosition?.amount_tokens.toLocaleString()} tokens</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Select Exit Allocation
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setExitPercent(pct)}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold font-mono transition-colors cursor-pointer ${
                    exitPercent === pct
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {pct}% {pct === 100 ? '(Full Close)' : ''}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Operator Reason / Note
            </label>
            <input
              type="text"
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setExitModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" loading={exiting}>
              Confirm {exitPercent}% Exit
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Trailing Stop Modal */}
      <Modal
        isOpen={stopModalOpen}
        onClose={() => setStopModalOpen(false)}
        title={`Adjust Trailing Stop: ${selectedPosition?.token_symbol || ''}`}
      >
        <form onSubmit={handleStopSubmit} className="space-y-4">
          <p className="text-xs text-slate-400">
            Sets the dynamic stop-loss percentage below the highest mark price achieved since entry.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Trailing Stop Distance (%)
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="50"
              required
              value={trailingStopPct}
              onChange={(e) => setTrailingStopPct(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStopModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={savingStop}>
              Update Stop Distance
            </Button>
          </div>
        </form>
      </Modal>

      {/* Auth Gate */}
      <AuthGateModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
        actionTitle="Operator Execution Controls"
      />
    </div>
  );
};
