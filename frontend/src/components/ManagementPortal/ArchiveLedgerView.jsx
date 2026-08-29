import React, { useState } from 'react';
import { Database, FileSpreadsheet, Download, Search, ShieldCheck, Clock, Eye, X, Printer, Calendar, Building2, Bed, Pill, FlaskConical } from 'lucide-react';
import PrintReceiptModal from '../PrintReceiptModal';
import { api } from '../../services/api';

export default function ArchiveLedgerView({ archivedRecords }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordForInvoice, setSelectedRecordForInvoice] = useState(null);

  const filteredRecords = archivedRecords.filter((rec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rec.patient_name?.toLowerCase().includes(q) ||
      rec.patient_id?.toLowerCase().includes(q) ||
      rec.disease_condition?.toLowerCase().includes(q) ||
      rec.archive_id?.toString().includes(q)
    );
  });

  const handleExportExcel = () => {
    window.location.href = api.getExcelExportUrl();
  };

  return (
    <div className="space-y-5">
      
      {/* Top Banner with Excel Export Action */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Permanent Patient History & Immutable Archival Ledger
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Records archived automatically upon patient settlement & discharge. Data is permanently preserved for audit, medical history, and reporting.
          </p>
        </div>

        {/* 1-Click Excel Export Button */}
        <button
          onClick={handleExportExcel}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center space-x-2 transition flex-shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Ledger to Excel (.xlsx)</span>
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Search and Table Container */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        
        {/* Search Bar Header */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search archive by patient name, ID, disease, or archive ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-teal-600 shadow-2xs"
            />
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Preserved Records: <strong className="text-slate-900">{filteredRecords.length}</strong> / {archivedRecords.length}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-5">Archive #</th>
                <th className="py-3.5 px-4">Patient Information</th>
                <th className="py-3.5 px-4">Primary Condition</th>
                <th className="py-3.5 px-4">Room & Duration</th>
                <th className="py-3.5 px-4">Admission & Discharge</th>
                <th className="py-3.5 px-4">Settled Amount</th>
                <th className="py-3.5 px-5 text-right">Ledger Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No historic records found matching your search.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  let wardBed = rec.ward_and_bed_details;
                  if (typeof wardBed === 'string') {
                    try { wardBed = JSON.parse(wardBed); } catch (e) { wardBed = {}; }
                  }

                  return (
                    <tr key={rec.archive_id} className="hover:bg-slate-50/80 transition">
                      
                      {/* Archive ID */}
                      <td className="py-3.5 px-5 font-mono text-slate-600">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-teal-800 font-bold border border-slate-200">
                          #{rec.archive_id}
                        </span>
                      </td>

                      {/* Patient Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{rec.patient_name}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{rec.patient_id}</div>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 mt-1 inline-block font-semibold">
                          {rec.classification || 'Outpatient'}
                        </span>
                      </td>

                      {/* Disease */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-800 font-medium line-clamp-2">
                          {rec.disease_condition}
                        </p>
                      </td>

                      {/* Ward & Bed History */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {wardBed?.ward || 'General'} ({wardBed?.bed_id || 'Day Care'})
                        </div>
                        <div className="text-slate-500 text-[11px]">{wardBed?.floor || 'Main Facility'}</div>
                        <div className="text-[10px] text-teal-700 font-bold font-mono mt-0.5">
                          {rec.total_days || 1} Day(s) Stayed
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div><span className="text-slate-400">Adm:</span> {rec.admission_date ? new Date(rec.admission_date).toLocaleDateString() : 'N/A'}</div>
                        <div><span className="text-slate-400">Dis:</span> {rec.discharge_date ? new Date(rec.discharge_date).toLocaleDateString() : 'N/A'}</div>
                      </td>

                      {/* Total Paid */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black text-emerald-700 text-sm">
                          ₹{parseFloat(rec.total_amount_paid || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {rec.payment_method || 'Paid & Cleared'}
                        </div>
                      </td>

                      {/* View Bill Button */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedRecordForInvoice(rec)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-teal-800 hover:text-teal-900 rounded-lg text-[11px] font-bold border border-slate-200 transition inline-flex items-center space-x-1.5 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-teal-600" />
                          <span>View Bill</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Downloadable / Printable Bill & Day-by-Day Timeline Modal */}
      {selectedRecordForInvoice && (
        <PrintReceiptModal
          receiptData={selectedRecordForInvoice}
          onClose={() => setSelectedRecordForInvoice(null)}
        />
      )}
    </div>
  );
}
