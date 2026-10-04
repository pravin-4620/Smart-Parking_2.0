import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api.js';
import { User, ShieldCheck, Lock, Save, Loader2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/users/profile');
      const data = res.data.data;
      setProfile(data);
      setName(data.name || '');
      setPhone(data.phone || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setProfileMsg(null);
      await apiClient.patch('/users/profile', { name, phone });
      setProfileMsg('Profile details updated successfully!');
      fetchProfile();
    } catch (err: any) {
      setProfileMsg(err.response?.data?.message || 'Profile update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPassword(true);
      setPasswordMsg(null);
      await apiClient.patch('/users/password', { currentPassword, newPassword });
      setPasswordMsg('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg(err.response?.data?.message || 'Password change failed');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
          <User className="w-8 h-8" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{profile?.name}</h1>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
              {profile?.role}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{profile?.email}</p>
        </div>
      </div>

      {/* Edit Profile Info */}
      <form onSubmit={handleUpdateProfile} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-600" /> General Profile Settings
        </h2>

        {profileMsg && (
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold">
            {profileMsg}
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Mobile Phone Number</label>
          <input
            type="text"
            placeholder="+91 9999900000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
          />
        </div>

        <button
          type="submit"
          disabled={savingProfile}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
        >
          {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
        </button>
      </form>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Lock className="w-5 h-5 text-indigo-600" /> Security & Password
        </h2>

        {passwordMsg && (
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold">
            {passwordMsg}
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Current Password</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">New Password</label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
          />
        </div>

        <button
          type="submit"
          disabled={savingPassword || !currentPassword || !newPassword}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50"
        >
          {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Update Password
        </button>
      </form>
    </div>
  );
};
