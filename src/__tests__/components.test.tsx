// @vitest-environment jsdom
import '../test-setup';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, Badge, StatCard, ErrorMessage } from '../components/ui';

describe('UI Components', () => {
  it('renders Button with variants and handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} variant="primary">Click Me</Button>);
    
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables Button when loading is true', () => {
    render(<Button loading>Processing</Button>);
    const btn = screen.getByRole('button', { name: /processing/i });
    expect(btn).toBeDisabled();
  });

  it('renders Badge with appropriate status styles', () => {
    render(<Badge status="HEALTHY">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders StatCard with value and label', () => {
    render(
      <StatCard
        label="Tracked Volume"
        value="125.5 SOL"
        subValue="+12% today"
        trend="up"
        color="emerald"
      />
    );
    expect(screen.getByText(/tracked volume/i)).toBeInTheDocument();
    expect(screen.getByText('125.5 SOL')).toBeInTheDocument();
  });

  it('renders ErrorMessage with retry button', () => {
    const handleRetry = vi.fn();
    render(<ErrorMessage message="RPC Connection Failed" onRetry={handleRetry} />);
    
    expect(screen.getByText('RPC Connection Failed')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
