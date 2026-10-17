export function formatSol(amount: number, decimals: number = 2): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0.00 SOL';
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} SOL`;
}

export function formatUsd(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '$0.00';
  if (Math.abs(amount) < 0.0001 && amount !== 0) {
    return `$${amount.toFixed(6)}`;
  }
  if (Math.abs(amount) < 1.0) {
    return `$${amount.toFixed(4)}`;
  }
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(pct: number): string {
  if (isNaN(pct) || pct === null || pct === undefined) return '0.0%';
  const prefix = pct > 0 ? '+' : '';
  return `${prefix}${pct.toFixed(2)}%`;
}

export function formatAddress(address: string, chars: number = 4): string {
  if (!address || address.length < chars * 2) return address || '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatTimeAgo(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
