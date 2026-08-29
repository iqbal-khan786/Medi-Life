import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import PatientDashboard from './components/PatientPortal/PatientDashboard';
import ManagementDashboard from './components/ManagementPortal/ManagementDashboard';
import { api } from './services/api';
import { Activity, ShieldCheck, User, RefreshCw, HeartHandshake, CheckCircle2, Radio } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState(null); // 'patient' or 'management'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Patient State
  const [patientDashboardData, setPatientDashboardData] = useState(null);

  // Management State
  const [stats, setStats] = useState(null);
  const [patientsQueue, setPatientsQueue] = useState([]);
  const [beds, setBeds] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [archivedRecords, setArchivedRecords] = useState([]);

  // Check LocalStorage session on load
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('medilife_user');
      const savedRole = localStorage.getItem('medilife_role');
      if (savedUser && savedRole) {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setCurrentRole(savedRole);
      }
    } catch (e) {
      console.error('Session restore error:', e);
    }
  }, []);

  // Fetch data for Patient Portal
  const loadPatientData = useCallback(async (patientId, silent = false) => {
    if (!patientId) return;
    try {
      if (!silent) setIsRefreshing(true);
      const data = await api.getPatientDashboard(patientId);
      setPatientDashboardData(data);
    } catch (err) {
      console.error('Failed to load patient dashboard:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Fetch data for Management Portal
  const loadManagementData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const [statsData, queueData, bedsData, docsData, archiveData] = await Promise.all([
        api.getStats().catch(() => null),
        api.getPatientsQueue().catch(() => []),
        api.getBeds().catch(() => []),
        api.getDoctors().catch(() => []),
        api.getArchivedRecords().catch(() => [])
      ]);

      setStats(statsData);
      setPatientsQueue(queueData);
      setBeds(bedsData);
      setDoctors(docsData);
      setArchivedRecords(archiveData);
    } catch (err) {
      console.error('Failed to load management data:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Master Data Refresh Trigger
  const refreshCurrentPortalData = useCallback(async (silent = false) => {
    if (currentRole === 'patient' && currentUser?.id) {
      await loadPatientData(currentUser.id, silent);
    } else if (currentRole === 'management') {
      await loadManagementData(silent);
    }
  }, [currentRole, currentUser, loadPatientData, loadManagementData]);

  // Initial Load on user/role change
  useEffect(() => {
    if (currentUser) {
      refreshCurrentPortalData(false);
    }
  }, [currentUser, currentRole, refreshCurrentPortalData]);

  // REAL-TIME AUTO-SYNC POLLING: Every 3 seconds in background
  useEffect(() => {
    if (!currentUser) return;

    const intervalId = setInterval(() => {
      refreshCurrentPortalData(true);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [currentUser, refreshCurrentPortalData]);

  // Handle successful login
  const handleLoginSuccess = (user, role) => {
    setCurrentUser(user);
    setCurrentRole(role);
    localStorage.setItem('medilife_user', JSON.stringify(user));
    localStorage.setItem('medilife_role', role);
  };

  // Handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRole(null);
    setPatientDashboardData(null);
    localStorage.removeItem('medilife_user');
    localStorage.removeItem('medilife_role');
  };

  // Switch Portal (For Staff to view Patient mode)
  const handleSwitchPortal = () => {
    const nextRole = currentRole === 'management' ? 'patient' : 'management';
    setCurrentRole(nextRole);
    if (nextRole === 'patient') {
      loadPatientData(currentUser?.id || 'P-1001');
    } else {
      loadManagementData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        currentRole={currentRole}
        onLogout={handleLogout}
        onSwitchPortal={handleSwitchPortal}
        onRefresh={() => refreshCurrentPortalData(false)}
        isRefreshing={isRefreshing}
      />

      {/* Live Sync Status Bar */}
      {currentUser && (
        <div className="bg-white border-b border-slate-200 px-4 py-2 text-center shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-700">Hospital Real-Time Sync Active</span>
              <span className="hidden sm:inline text-slate-400">• Auto-updating every 3 seconds</span>
            </div>
            <div className="text-slate-500 text-xs font-medium bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
              {currentRole === 'management' ? 'Operations Monitoring Mode' : 'Patient Care Portal'}
            </div>
          </div>
        </div>
      )}

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentUser ? (
          /* Login & Registration Screen */
          <LoginModal onLoginSuccess={handleLoginSuccess} />
        ) : currentRole === 'patient' ? (
          /* Patient Portal View */
          <PatientDashboard
            currentUser={currentUser}
            dashboardData={patientDashboardData}
            onRefresh={() => refreshCurrentPortalData(false)}
          />
        ) : (
          /* Management Portal View */
          <ManagementDashboard
            currentUser={currentUser}
            stats={stats}
            patientsQueue={patientsQueue}
            beds={beds}
            doctors={doctors}
            archivedRecords={archivedRecords}
            onRefresh={() => refreshCurrentPortalData(false)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-medium text-slate-600">Medi Life Hospital Management System</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-500">
            <span>General & AC Room Pricing Active</span>
            <span>•</span>
            <span>PDF Generator & Excel Ledger Ready</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
