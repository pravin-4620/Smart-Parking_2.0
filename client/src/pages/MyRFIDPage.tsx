import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api.js';
import { CreditCard, Plus, Trash2, ShieldCheck, Loader2 } from 'lucide-react';

export const MyRFIDPage: React.FC = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardNumber, setCardNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/rfid-cards');
      setCards(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiClient.post('/rfid-cards', { uid: cardNumber });
      setCardNumber('');
      fetchCards();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to link card');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm('Unlink this RFID card?')) return;
    try {
      await apiClient.delete(`/rfid-cards/${id}`);
      fetchCards();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Unlink failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-7 h-7 text-indigo-600" /> RFID Smart Passes
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Physical RFID card tags for tap-to-enter automated boom barrier access.
        </p>
      </div>

      {/* Link New RFID Card Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800">Link New RFID Card</h2>
        <form onSubmit={handleAddCard} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="RFID Card Number (12 digits)"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value.toUpperCase())}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
          />
          <button
            type="submit"
            disabled={submitting || !cardNumber}
            className="py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Link Pass
          </button>
        </form>
      </div>

      {/* RFID Cards Grid */}
      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No RFID Cards Linked</h3>
          <p className="text-xs text-slate-400 mt-1">Enter your card number above to link a physical pass.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((c) => (
            <div
              key={c._id}
              className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col justify-between space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <h3 className="font-bold text-base mt-1 text-slate-100">Smart Parking Pass</h3>
                </div>
                <button
                  onClick={() => handleDeleteCard(c._id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-between items-end border-t border-slate-800 pt-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">CARD ID</span>
                  <span className="font-mono text-sm font-bold text-indigo-300">{c.uid}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">STATUS</span>
                  <span className="font-black text-emerald-400 text-sm">READY</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
