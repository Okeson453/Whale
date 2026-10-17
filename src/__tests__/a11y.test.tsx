// @vitest-environment jsdom
import '../test-setup';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Modal, Button } from '../components/ui';

describe('Accessibility & Semantic HTML Verification', () => {
  it('Modal renders with accessible dialog structure and close button label', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Emergency Circuit Breaker">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByRole('heading', { level: 3, name: /emergency circuit breaker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close dialog/i })).toBeInTheDocument();
  });

  it('Buttons maintain focusable and accessible properties', () => {
    render(<Button aria-label="Confirm Execution">Execute</Button>);
    const button = screen.getByRole('button', { name: /confirm execution/i });
    expect(button).toHaveAttribute('aria-label', 'Confirm Execution');
    expect(button).not.toBeDisabled();
  });
});
