import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from '../hooks/useSession';

export function renderWithProviders(ui: React.ReactElement) {
  return rtlRender(
    <BrowserRouter>
      <SessionProvider>{ui}</SessionProvider>
    </BrowserRouter>
  );
}
