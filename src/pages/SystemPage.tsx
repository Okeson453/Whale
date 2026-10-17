import React, { useState, useMemo } from 'react';
import { useResource } from '../hooks/useResource';
import { useSession } from '../hooks/useSession';
import { apiClient } from '../api/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  ErrorMessage,
  SkeletonLoader,
  Modal,
} from '../components/ui';
import { formatTimeAgo } from '../lib/format';
import { AuthGateModal } from '../components/AuthGate';
import {
  Cpu,
  Server,
  ShieldCheck,
  Search,
  Filter,
  Download,
  AlertTriangle,
  RefreshCw,
  Terminal,
} from 'lucide-react';

export const SystemPage: React.FC = () => {
  const { data, loading, error, refetch } = useResource(
    () => apiClient.getSystem(),
    { pollingIntervalMs: 10000 }
  );
  const { isOperator } = useSession();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [tradingModeModalOpen, setTradingModeModalOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string>('dry_run');
  const [confirmLive, setConfirmLive] = useState<boolean>(false);
  const [savingMode, setSavingMode] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [logFilter, setLogFilter] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const executeOrAuth = (action: () => void) => {
    if (!isOperator) {
      setPendingAction(() => action);
      setAuthModalOpen(true);
    } else {
      action();
    }
  };

  const handleModeChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMode(true);
    try {
      await apiClient.setTradingMode(selectedMode, confirmLive);
      setTradingModeModalOpen(false);
      setNotification({
        type: 'success',
        message: `System trading mode successfully updated to ${selectedMode.toUpperCase()}`,
      });
      await refetch();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setSavingMode(false);
    }
  };

  const handleExportLogs = () => {
    if (!data?.audit_logs) return;
    const blob = new Blob([JSON.stringify(data.audit_logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whale_surveillance_audit_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = useMemo(() => {
    if (!data?.audit_logs) return [];
    if (!logFilter) return data.audit_logs;
    return data.audit_logs.filter(
      (log) =>
        log.action_type.toLowerCase().includes(logFilter.toLowerCase()) ||
        log.operator_id.toLowerCase().includes(logFilter.toLowerCase()) ||
        log.details?.toLowerCase().includes(logFilter.toLowerCase())
    );
  }, [data?.audit_logs, logFilter]);

  const services = data?.services || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-cyan-400" /> System Health & Audit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Component watchdogs, isolated signer service verification, and immutable operator audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (data) setSelectedMode(data.trading_mode);
              executeOrAuth(() => setTradingModeModalOpen(true));
            }}
          >
            <Server className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Change Trading Mode
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} loading={loading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Watchdog
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

      {/* Subsystems Watchdog Grid */}
      <div>
        <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-300 mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" /> Infrastructure & Subsystem Watchdogs
        </h2>
        {loading && !data ? (
          <SkeletonLoader lines={3} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((srv) => (
              <Card key={srv.name} className="hover:border-slate-700 transition-colors">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-slate-200">{srv.name}</h3>
                      <p className="text-[11px] font-mono text-slate-500">{srv.endpoint}</p>
                    </div>
                    <Badge status={srv.status}>{srv.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">{srv.details}</p>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Latency</span>
                    <span
                      className={`font-bold ${
                        srv.latency_ms < 50
                          ? 'text-emerald-400'
                          : srv.latency_ms < 150
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {srv.latency_ms} ms
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Operator Audit Logs Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <Terminal className="w-4 h-4 text-cyan-400" /> Immutable Operator Action Log
            </CardTitle>
            <CardDescription>
              Chronological ledger of security trips, parameter revisions, and manual exits.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExportLogs}>
              <Download className="w-3.5 h-3.5 mr-1" /> Export JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-3 border-b border-slate-800/80 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-500 ml-2" />
            <input
              type="text"
              placeholder="Filter audit logs by action type, operator, or details..."
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="w-full bg-transparent border-0 text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-mono"
            />
            {logFilter && (
              <button
                onClick={() => setLogFilter('')}
                className="text-xs text-slate-500 hover:text-slate-300 font-mono px-2"
              >
                Clear
              </button>
            )}
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No audit logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Operator</th>
                    <th className="py-2.5 px-4">Action Type</th>
                    <th className="py-2.5 px-4">Details</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {formatTimeAgo(log.timestamp)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200">{log.operator_id}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-bold text-[11px]">
                          {log.action_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-sans max-w-md truncate">
                        {log.details || log.payload}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge status={log.status}>{log.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Trading Mode Modal */}
      <Modal
        isOpen={tradingModeModalOpen}
        onClose={() => setTradingModeModalOpen(false)}
        title="Change Execution Trading Mode"
      >
        <form onSubmit={handleModeChange} className="space-y-4">
          <p className="text-xs text-slate-400">
            Select the operational environment mode for copy-trade order submission.
          </p>

          <div className="space-y-2">
            {[
              {
                id: 'dry_run',
                name: 'Dry-Run Mode (Safe Prototyping)',
                desc: 'Simulates transaction parsing, quote evaluation, and order matching with zero real wallet funds.',
              },
              {
                id: 'simulation',
                name: 'Simulation Mode (Shadow Execution)',
                desc: 'Generates real Jupiter quote routes and verifies pre-signing guardrails without signing or broadcasting.',
              },
              {
                id: 'live',
                name: 'Live Mainnet Execution (Funded)',
                desc: 'Broadens transactions to Solana mainnet via isolated remote signer. Requires explicit confirmation.',
              },
            ].map((m) => (
              <label
                key={m.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedMode === m.id
                    ? 'bg-slate-800 border-cyan-500/50'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="tradingMode"
                  value={m.id}
                  checked={selectedMode === m.id}
                  onChange={() => setSelectedMode(m.id)}
                  className="mt-1"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">{m.name}</span>
                  <span className="text-[11px] text-slate-400">{m.desc}</span>
                </div>
              </label>
            ))}
          </div>

          {selectedMode === 'live' && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2 text-xs text-rose-300">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> High-Risk Action
              </div>
              <p>
                Live trading submits real blockchain transactions on Solana. Ensure your remote signer is configured and funds are properly isolated.
              </p>
              <label className="flex items-center gap-2 pt-1 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmLive}
                  onChange={(e) => setConfirmLive(e.target.checked)}
                />
                <span>I acknowledge and confirm live trading risks</span>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTradingModeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={selectedMode === 'live' ? 'danger' : 'primary'}
              size="sm"
              disabled={selectedMode === 'live' && !confirmLive}
              loading={savingMode}
            >
              Set Trading Mode
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
        actionTitle="Operator System Controls"
      />
    </div>
  );
};
