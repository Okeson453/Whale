import React, { useState, useMemo } from 'react';
import { useResource } from '../hooks/useResource';
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
  SkeletonLoader,
  ErrorMessage,
} from '../components/ui';
import {
  formatSol,
  formatUsd,
  formatPercent,
  formatAddress,
  formatTimeAgo,
} from '../lib/format';
import {
  Activity,
  Users,
  Compass,
  Zap,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const { data, loading, error, isStale, refetch } = useResource(
    () => apiClient.getOverview(),
    { pollingIntervalMs: 15000 }
  );

  const [tagFilter, setTagFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filtered signals
  const filteredSignals = useMemo(() => {
    if (!data?.recent_signals) return [];
    return data.recent_signals.filter((s) => {
      const matchesSearch =
        s.token_symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.wallet_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.wallet_address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [data?.recent_signals, searchQuery]);

  // Filtered wallets
  const filteredWallets = useMemo(() => {
    if (!data?.wallets) return [];
    return data.wallets.filter((w) => {
      if (tagFilter !== 'ALL' && !w.tag.toLowerCase().includes(tagFilter.toLowerCase())) {
        return false;
      }
      if (searchQuery) {
        return (
          w.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return true;
    });
  }, [data?.wallets, tagFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-cyan-400" /> Intelligence Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time Solana on-chain surveillance, whale conviction flows, and smart wallet clustering.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStale && (
            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
              Data Stale • Refreshing
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing || loading}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Feed
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={refetch} />}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Whales"
          value={data?.summary?.active_whales_count ?? '--'}
          subValue="Tracked high-conviction entities"
          icon={<Users className="w-5 h-5 text-cyan-400" />}
          color="cyan"
        />
        <StatCard
          label="24h Signals"
          value={data?.summary?.signals_detected_24h ?? '--'}
          subValue="DEX & PumpFun transactions"
          icon={<Zap className="w-5 h-5 text-amber-400" />}
          color="amber"
        />
        <StatCard
          label="Tracked Volume"
          value={data ? formatSol(data.summary.total_tracked_volume_sol) : '--'}
          subValue="Cumulative 24h whale swaps"
          icon={<Activity className="w-5 h-5 text-emerald-400" />}
          color="emerald"
        />
        <StatCard
          label="High Conviction"
          value={data?.summary?.high_conviction_signals ?? '--'}
          subValue="Score >= 80/100"
          icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}
          color="cyan"
        />
      </div>

      {/* Filters & Search Toolbar */}
      <Card>
        <CardContent className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search token, wallet label or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
            {['ALL', 'Smart Trader', 'Meme Sniper', 'Institutional', 'Insider'].map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tag)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  tagFilter === tag
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Signals & Whale Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Real-time Whale Signals Feed */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>
                  <Activity className="w-4 h-4 text-cyan-400" /> Live Whale Swaps & Signals
                </CardTitle>
                <CardDescription>
                  Streaming swaps detected by Solana mempool and DEX listeners.
                </CardDescription>
              </div>
              <Badge variant="info">{filteredSignals.length} Active</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {loading && !data ? (
                <div className="p-6">
                  <SkeletonLoader lines={5} />
                </div>
              ) : filteredSignals.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No signals found matching your current filter criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Time</th>
                        <th className="py-2.5 px-4">Entity</th>
                        <th className="py-2.5 px-4">Action</th>
                        <th className="py-2.5 px-4">Token</th>
                        <th className="py-2.5 px-4 text-right">Volume</th>
                        <th className="py-2.5 px-4 text-center">Score</th>
                        <th className="py-2.5 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredSignals.map((sig) => (
                        <tr key={sig.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {formatTimeAgo(sig.detected_at)}
                          </td>
                          <td className="py-3 px-4 font-sans">
                            <div className="font-semibold text-slate-200">
                              {sig.wallet_label || formatAddress(sig.wallet_address)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {formatAddress(sig.wallet_address)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 font-bold ${
                                sig.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {sig.action === 'BUY' ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownRight className="w-3.5 h-3.5" />
                              )}
                              {sig.action}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-200">{sig.token_symbol}</div>
                            <div className="text-[10px] text-slate-400">{formatUsd(sig.price_usd)}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-100">
                            {formatSol(sig.amount_sol)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                sig.confidence_score >= 80
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {sig.confidence_score.toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge status={sig.status}>{sig.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Top Whale Entities Leaderboard */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>
                  <Users className="w-4 h-4 text-cyan-400" /> Monitored Whales
                </CardTitle>
                <CardDescription>Historical win rates & 30-day SOL performance.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading && !data ? (
                <div className="p-6">
                  <SkeletonLoader lines={4} />
                </div>
              ) : filteredWallets.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">No wallets found.</div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {filteredWallets.map((w) => (
                    <div key={w.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm text-slate-200">{w.label}</p>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {formatAddress(w.address, 6)}
                          </p>
                        </div>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                          {w.tag}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800/60 text-center font-mono text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Win Rate</span>
                          <span className="text-emerald-400 font-bold">{w.win_rate_30d}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">30d PnL</span>
                          <span className="text-cyan-400 font-bold">+{w.pnl_30d_sol} SOL</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Swaps</span>
                          <span className="text-slate-300 font-bold">{w.tx_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
