import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto my-16 text-center bg-white p-8 rounded-xl shadow-sm border border-slate-200 space-y-4">
      <div className="flex justify-center">
        <ShieldAlert className="w-16 h-16 text-red-500 bg-red-50 p-3 rounded-full" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">403 - Access Denied</h1>
      <p className="text-slate-500 text-sm">
        You do not have permission to access this resource or page. Please contact an administrator if you believe this is an error.
      </p>
      <div className="pt-4">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 bg-sky-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Home</span>
        </Link>
      </div>
    </div>
  );
};
