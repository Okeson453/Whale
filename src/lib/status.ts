export function getStatusBadgeVariant(status: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const normalized = (status || '').toUpperCase();

  switch (normalized) {
    case 'HEALTHY':
    case 'FILLED':
    case 'EXECUTED':
    case 'APPROVED':
    case 'OPEN':
    case 'SUCCESS':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-400',
      };

    case 'WARNING':
    case 'PARTIALLY_CLOSED':
    case 'PARTIALLY_FILLED':
    case 'DEGRADED':
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        dot: 'bg-amber-400',
      };

    case 'CRITICAL':
    case 'FAILED':
    case 'REJECTED':
    case 'DOWN':
    case 'TRIPPED':
      return {
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        dot: 'bg-rose-400',
      };

    case 'CLOSED':
    case 'DETECTED':
    case 'PENDING':
    default:
      return {
        bg: 'bg-slate-800',
        text: 'text-slate-300',
        border: 'border-slate-700',
        dot: 'bg-slate-400',
      };
  }
}
