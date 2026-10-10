import { AuthLayout } from '../../components/ui/MobilityUI';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordApi } from '../../services/authService';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const res = await forgotPasswordApi({ email });
      setMessage(res.message);
    } catch {
      setError('Request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout><div className="auth-panel max-w-md mx-auto my-12 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Forgot Password</h2>
        <p className="text-slate-500 text-sm mt-1">Enter your registered email to reset password</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-sky-600 text-white font-medium py-2.5 rounded-lg hover:bg-sky-700 transition-colors text-sm disabled:opacity-50"
        >
          {isLoading ? 'Submitting...' : 'Send Reset Instructions'}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        Remember your password?{' '}
        <Link to="/login" className="text-sky-600 font-semibold hover:underline">
          Sign In
        </Link>
      </div>
    </div></AuthLayout>
  );
};
