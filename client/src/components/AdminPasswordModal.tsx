import React, { useState } from 'react';
import { categoryApi } from '../services/categoryApi';
import { Eye, EyeOff, KeyRound, Lock, X } from 'lucide-react';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Accesso Amministratore',
  description = 'Inserisci la password di amministrazione per continuare.',
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Inserisci la password');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await categoryApi.verifyAdminPassword(password.trim());
    setLoading(false);

    if (result.success) {
      setPassword('');
      onSuccess();
      onClose();
    } else {
      setError(result.error || 'Password amministratore errata.');
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-semibold rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Password di amministrazione..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-3 pl-4 pr-11 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/80 text-sm font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex space-x-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:scale-98 transition-all font-semibold text-slate-300 rounded-xl text-xs sm:text-sm"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:scale-98 transition-all font-bold text-slate-950 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-lg shadow-amber-500/20"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? 'Verifica...' : 'Accedi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
