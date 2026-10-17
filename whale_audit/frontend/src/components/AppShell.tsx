import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './nav';
import { useSession } from '../hooks/useSession';
import { useResource } from '../hooks/useResource';
import { apiClient } from '../api/client';
import { AuthGateModal } from './AuthGate';
import { Button } from './ui';
import {
  ShieldAlert,
  Radio,
  Clock,
  Menu,
  X,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  Lock,
} from 'lucide-react';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, isOperator, logout } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [resettingBreaker, setResettingBreaker] = useState(false);

  // Poll risk status for global circuit breaker banner
  const { data: riskData, refetch: refetchRisk } = useResource(
    () => apiClient.getRisk(),
    { pollingIntervalMs: 10000 }
  );

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isBreakerTripped = riskData?.circuit_breaker?.is_tripped ?? false;
  const tripReason = riskData?.circuit_breaker?.trip_reason;

  const handleResetBreaker = async () => {
    if (!isOperator) {
      setAuthModalOpen(true);
      return;
    }
    setResettingBreaker(true);
    try {
      await apiClient.resetCircuitBreaker();
      await refetchRisk();
    } catch (err: any) {
      alert(`Failed to reset circuit breaker: ${err.message}`);
    } finally {
      setResettingBreaker(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Emergency Tripped Banner */}
      {isBreakerTripped && (
        <div className="bg-rose-950/90 border-b border-rose-500/50 px-4 py-2 text-rose-200 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>
              <strong>EMERGENCY CIRCUIT BREAKER TRIPPED:</strong> {tripReason || 'Automated safety halt triggered. All executions blocked.'}
            </span>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={handleResetBreaker}
            loading={resettingBreaker}
            className="shrink-0 text-xs py-1 px-3"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Breaker
          </Button>
        </div>
      )}

      {/* Main Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Status */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <Radio className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                  WHALE<span className="text-cyan-400">SURVEILLANCE</span>
                </span>
                <span className="text-[10px] tracking-widest text-slate-400 font-mono block -mt-1">
                  SOLANA EXECUTION
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Main Navigation">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                      isActive
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Status Badges */}
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
            {/* Live Mode Badge */}
            <div className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="uppercase text-[11px] font-bold text-cyan-300">
                {riskData?.limits?.trading_mode || 'DRY-RUN'}
              </span>
            </div>

            {/* Operator Auth Status */}
            {isOperator ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <UserCheck className="w-3.5 h-3.5" />
                <span>OPERATOR</span>
                <button
                  onClick={logout}
                  className="text-slate-400 hover:text-slate-200 ml-1 underline cursor-pointer"
                  title="Logout"
                >
                  Exit
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>VIEWER</span>
              </button>
            )}

            {/* Clock */}
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{currentTime}</span>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive ? 'bg-slate-800 text-cyan-400' : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Role: {user.role}</span>
              {!isOperator && (
                <Button size="sm" variant="outline" onClick={() => setAuthModalOpen(true)}>
                  Operator Login
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Whale Surveillance & Copy-Trade Engine v1.0 • Pre-signing Validation Active</span>
          <span className="text-amber-500/80 font-mono">SAFE DEFAULT: LIVE TRADING DISABLED • DRY-RUN MODE</span>
        </div>
      </footer>

      {/* Operator Auth Gate Modal */}
      <AuthGateModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        actionTitle="Operator Mode Access"
      />
    </div>
  );
};
