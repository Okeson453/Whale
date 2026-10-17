import { describe, it, expect } from 'vitest';
import { formatSol, formatUsd, formatPercent, formatAddress, formatTimeAgo } from '../lib/format';
import { getStatusBadgeVariant } from '../lib/status';

describe('Format & Status System Integration', () => {
  it('formats SOL amounts correctly', () => {
    expect(formatSol(5.25)).toBe('5.25 SOL');
    expect(formatSol(0)).toBe('0.00 SOL');
    expect(formatSol(1250.5, 1)).toBe('1,250.5 SOL');
  });

  it('formats USD values and micro prices properly', () => {
    expect(formatUsd(1500.5)).toBe('$1,500.50');
    expect(formatUsd(0.000025)).toBe('$0.000025');
    expect(formatUsd(0.95)).toBe('$0.9500');
  });

  it('formats percentage gains and losses with signs', () => {
    expect(formatPercent(12.5)).toBe('+12.50%');
    expect(formatPercent(-4.2)).toBe('-4.20%');
  });

  it('truncates Solana addresses safely', () => {
    const address = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
    expect(formatAddress(address, 4)).toBe('7xKX...gAsU');
  });

  it('maps status badges to corresponding color tokens', () => {
    expect(getStatusBadgeVariant('HEALTHY').text).toContain('emerald');
    expect(getStatusBadgeVariant('CRITICAL').text).toContain('rose');
    expect(getStatusBadgeVariant('WARNING').text).toContain('amber');
    expect(getStatusBadgeVariant('CLOSED').text).toContain('slate');
  });
});
