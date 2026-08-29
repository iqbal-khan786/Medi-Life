import React, { useState } from 'react';
import { ShieldCheck, User, KeyRound, UserPlus, HeartHandshake, ArrowRight, AlertCircle, CheckCircle2, Sparkles, Building2 } from 'lucide-react';
import { api } from '../services/api';
import Logo from './Logo';

export default function LoginModal({ onLoginSuccess }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Registration fields
  const [regForm, setRegForm] = useState({
    full_name: '',
    age: '',
    gender: 'Male',
    contact: '',
    emergency_contact: '',
    medical_history: '',
    password: ''
  });

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.login(userId, password);
      onLoginSuccess(data.user, data.role);
    } catch (err) {
      setError(err.message || 'Login failed. Check your ID and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffQuickLogin = async () => {
    setUserId('STAFF-01');
    setPassword('admin123');
    setError(null);
    setLoading(true);
    try {
      const data = await api.login('STAFF-01', 'admin123');
      onLoginSuccess(data.user, data.role);
    } catch (err) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await api.registerPatient(regForm);
      setSuccessMsg(`Patient account created! Your Patient ID is ${res.patient.id}. Directing to Intake & Portal...`);
      setTimeout(async () => {
        const loginRes = await api.login(res.patient.id, regForm.password || 'patient123');
        onLoginSuccess(loginRes.user, loginRes.role);
      }, 1200);
    } catch (err) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        
        {/* Top Header Banner */}
        <div className="p-6 sm:p-8 bg-slate-50/70 border-b border-slate-200 text-center flex flex-col items-center">
          <div className="mb-3">
            <Logo size="lg" showSubtitle={false} />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md">Healthcare Operations & Patient Self-Service Portal</p>

          {/* Mode Switch Pills */}
          <div className="mt-5 inline-flex bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => { setIsRegisterMode(false); setError(null); }}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                !isRegisterMode
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In to Portal
            </button>
            <button
              onClick={() => { setIsRegisterMode(true); setError(null); }}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                isRegisterMode
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register New Patient
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8">
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {!isRegisterMode ? (
            /* Sign In Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  User ID / Patient ID / Staff ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. P-1001 or STAFF-01"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:border-sky-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:border-sky-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm shadow-xs flex items-center justify-center space-x-2 transition disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* 1-Click Fast Staff Login Shortcut */}
              <div className="pt-6 border-t border-slate-200 mt-6">
                <div className="text-center text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
                  Quick Access Demo Accounts
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleStaffQuickLogin}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex items-center space-x-3"
                  >
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">1-Click Staff Access</div>
                      <div className="text-[10px] text-slate-500 font-mono">STAFF-01 (admin123)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setUserId('P-1001'); setPassword('patient123'); }}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex items-center space-x-3"
                  >
                    <div className="p-2 rounded-lg bg-sky-100 text-sky-800">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Patient Demo</div>
                      <div className="text-[10px] text-slate-500 font-mono">P-1001 (patient123)</div>
                    </div>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Patient Registration Form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suman Das"
                    value={regForm.full_name}
                    onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Age</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="30"
                    value={regForm.age}
                    onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Gender</label>
                  <select
                    value={regForm.gender}
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210"
                    value={regForm.contact}
                    onChange={(e) => setRegForm({ ...regForm, contact: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543211"
                    value={regForm.emergency_contact}
                    onChange={(e) => setRegForm({ ...regForm, emergency_contact: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Known Allergies / Medical History</label>
                  <input
                    type="text"
                    placeholder="e.g. Asthma, Penicillin allergy"
                    value={regForm.medical_history}
                    onChange={(e) => setRegForm({ ...regForm, medical_history: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Create Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Default is patient123"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm shadow-xs flex items-center justify-center space-x-2 transition disabled:opacity-50 mt-4"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Creating Account...' : 'Register & Enter Patient Portal'}</span>
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
