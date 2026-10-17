import React, { useState } from 'react';
import { useSession } from '../hooks/useSession';
import { Modal, Button } from './ui';
import { ShieldCheck, KeyRound } from 'lucide-react';

interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  actionTitle?: string;
}

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = 'Operator Action',
}) => {
  const { login } = useSession();
  const [tokenInput, setTokenInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError('Operator token cannot be empty.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const success = await login(tokenInput.trim());
    setSubmitting(false);

    if (success) {
      setTokenInput('');
      onClose();
      if (onSuccess) onSuccess();
    } else {
      setError('Invalid operator credentials. Access denied.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Authorization Required: ${actionTitle}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-xs text-slate-300">
          <KeyRound className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>
            This action requires validated Operator role authorization. Enter your operator security token to authenticate.
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="operator-token" className="block text-xs font-medium text-slate-300 mb-1">
            Operator Access Token
          </label>
          <input
            id="operator-token"
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Enter operator token..."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" loading={submitting}>
            <ShieldCheck className="w-4 h-4 mr-1" /> Authenticate & Proceed
          </Button>
        </div>
      </form>
    </Modal>
  );
};
