import React, { useState, useEffect } from 'react';
import { 
  X, CreditCard, QrCode, Building, CheckCircle2, ShieldCheck, 
  Printer, ArrowRight, DollarSign, Calendar, Clock, AlertTriangle, 
  Download, FileText, Award, ShieldAlert, Sparkles, RefreshCw, Banknote
} from 'lucide-react';
import { api } from '../../services/api';
import PrintReceiptModal from '../PrintReceiptModal';

export default function BillingDischargeModal({ admission = {}, billing = {}, patient = {}, timeline = [], onClose, onDischarged }) {
  const [paymentMethod, setPaymentMethod] = useState('GovCard'); // GovCard, UPI, Card, NetBanking, Cash
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardHolder, setCardHolder] = useState(patient?.full_name || 'Patient');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  
  // Government Scheme Card Details
  const patientId = patient?.id || patient?.patient_id || admission?.patient_id || 'P-1004';
  const [govCardType, setGovCardType] = useState('Ayushman Bharat PM-JAY');
  const [govCardNumber, setGovCardNumber] = useState(`PMJAY-9821-4402-${patientId.replace(/[^0-9]/g, '') || '1004'}`);
  const [cardData, setCardData] = useState({
    totalLimit: 500000.0,
    usedAmount: 0.0,
    remainingBalance: 500000.0
  });
  const [loadingCard, setLoadingCard] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState(null);
  const [error, setError] = useState(null);
  const [showFullInvoiceModal, setShowFullInvoiceModal] = useState(false);

  // Fetch persistent Government Card Balance for this patient from server
  useEffect(() => {
    async function loadCardBalance() {
      if (!patientId) return;
      setLoadingCard(true);
      try {
        const data = await api.getGovCardBalance(patientId);
        if (data) {
          setCardData({
            totalLimit: parseFloat(data.totalLimit || 500000),
            usedAmount: parseFloat(data.usedAmount || 0),
            remainingBalance: parseFloat(data.remainingBalance !== undefined ? data.remainingBalance : 500000)
          });
          if (data.cardId) setGovCardNumber(data.cardId);
          if (data.cardType) setGovCardType(data.cardType);
        }
      } catch (err) {
        console.error('Failed to load card balance:', err);
      } finally {
        setLoadingCard(false);
      }
    }
    loadCardBalance();
  }, [patientId]);

  // Check if patient is in an AC Room vs General Ward
  const isAcRoom = (admission?.ward_name && admission.ward_name.includes('AC')) || 
                   (admission?.preferred_ward && admission.preferred_ward.includes('AC'));

  const totalStayDays = billing?.totalDays || 1;

  // Calculate adjusted costs if Government Card is selected
  const isGovCard = paymentMethod === 'GovCard';

  // Under Government Card:
  // - Meds: Free (Covered)
  // - Tests: Free (Covered)
  // - Doctor Consultation: Free (Covered)
  // - Dietary Food: Free (Covered)
  // - General Ward: Free (Covered)
  // - AC Room: Half price = ₹300/day deducted from Card
  const cardBedRate = isAcRoom ? 300 : 0;
  const cardBedTotal = totalStayDays * cardBedRate;
  const cardMedTotal = billing?.medTotal || 0;
  const cardTestTotal = billing?.testTotal || 0;

  // Exact amount deducted from the patient's Government Card:
  const cardDeductionAmount = isGovCard ? (cardBedTotal + cardMedTotal + cardTestTotal) : 0;

  // Net payable out of pocket by patient (₹0 when using Government Card)
  const adjustedGrandTotal = isGovCard ? 0 : (billing?.grandTotal || 0);

  // Persistent Card Balance Math
  const startingCardBalance = cardData.remainingBalance !== undefined ? cardData.remainingBalance : 500000.0;
  const afterDischargeBalance = Math.max(0, startingCardBalance - cardDeductionAmount);

  const handlePayAndDischarge = async () => {
    if (!admission?.admission_id) {
      setError('Invalid admission ID. Cannot process payment.');
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      let modeString = '';
      if (paymentMethod === 'GovCard') {
        modeString = `${govCardType} (Card #${govCardNumber}) - ₹5 Lakh Cashless Scheme (Deducted: ₹${cardDeductionAmount.toFixed(2)})`;
      } else if (paymentMethod === 'UPI') {
        modeString = `UPI (${upiId || 'Quick QR Scan'})`;
      } else if (paymentMethod === 'Card') {
        modeString = `Credit/Debit Card (Ending in ${cardNumber.slice(-4) || '8821'})`;
      } else if (paymentMethod === 'Cash') {
        modeString = `Cash Payment at Billing Counter`;
      } else {
        modeString = `Net Banking (${selectedBank})`;
      }

      const res = await api.payAndDischarge(admission.admission_id, modeString, {
        gov_card_applied: isGovCard,
        gov_card_type: govCardType,
        gov_card_number: govCardNumber
      });
      
      setSuccessReceipt(res.receipt);
      if (onDischarged) onDischarged(res.receipt);
    } catch (err) {
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl my-8">
        
        {/* Modal Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Itemized Billing & Hospital Discharge</h3>
              <p className="text-xs text-slate-500">Review final fees, apply Government Health Cards, and settle account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successReceipt ? (
            /* Discharge Success View */
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-emerald-900">Payment Confirmed & Patient Discharged</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  Bed <span className="font-semibold text-slate-900">{successReceipt.bedDetails?.bed_id || 'Day Care / OPD'}</span> has been released. The record is permanently preserved in the hospital ledger.
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Number:</span>
                  <span className="font-mono font-bold text-sky-700">{successReceipt.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient Name:</span>
                  <span className="font-bold text-slate-800">{successReceipt.patientName} ({successReceipt.patientId})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Stay Duration:</span>
                  <span className="text-slate-800 font-semibold">{successReceipt.totalDays} Day(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="text-slate-900 font-medium">{successReceipt.paymentMode || successReceipt.payment_method || 'Online Settlement'}</span>
                </div>

                {successReceipt.itemized?.isGovCardApplied && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>Government Card Deducted:</span>
                      <span className="font-mono text-emerald-800">- ₹{parseFloat(successReceipt.itemized?.cardDeduction || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-emerald-700">
                      <span>Updated Remaining Card Balance:</span>
                      <span className="font-mono font-black text-emerald-900">
                        ₹{parseFloat(successReceipt.itemized?.cardRemainingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold">
                  <span className="text-slate-900">Amount Paid by Patient:</span>
                  <span className="font-mono text-emerald-700 font-black">
                    ₹{parseFloat(successReceipt.grandTotal || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowFullInvoiceModal(true)}
                  className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Download / Print Official PDF Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Close Window
                </button>
              </div>

              {/* Printable PDF Invoice Modal */}
              {showFullInvoiceModal && (
                <PrintReceiptModal
                  receiptData={successReceipt}
                  onClose={() => setShowFullInvoiceModal(false)}
                />
              )}
            </div>
          ) : (
            /* Live Billing Breakdown & Payment Methods View */
            <div className="space-y-6">
              {/* Itemized Cost Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      {isAcRoom ? '❄️ AC Deluxe Room Inpatient Stay' : '🛏️ General Ward Inpatient Stay'}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {totalStayDays} Day(s) Stay • Bed: {admission?.assigned_bed_id || 'OPD / Day Care'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {isGovCard ? (isAcRoom ? '₹300 / day' : '₹0 / day (Free)') : `₹${billing?.bedDailyRate || 350} / day`}
                    </span>
                  </div>
                </div>

                {/* Sub-Items */}
                <div className="space-y-2 text-xs">
                  {/* Bed */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Room Accommodation ({totalStayDays} days)</span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {isGovCard ? (
                        isAcRoom ? (
                          <span>
                            <span className="line-through text-slate-400 mr-1.5">₹{(totalStayDays * 600).toFixed(2)}</span>
                            <span className="text-emerald-700 font-bold">₹{(totalStayDays * 300).toFixed(2)}</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold">₹0.00 (100% Free)</span>
                        )
                      ) : (
                        `₹${(billing?.bedTotal || 0).toFixed(2)}`
                      )}
                    </span>
                  </div>

                  {/* Medicines */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Pharmacy Prescriptions ({admission?.medicines?.length || 0} meds)</span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {isGovCard ? (
                        <span className="text-emerald-700 font-bold">₹0.00 (100% Free)</span>
                      ) : (
                        `₹${(billing?.medTotal || 0).toFixed(2)}`
                      )}
                    </span>
                  </div>

                  {/* Tests */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Diagnostic Tests ({admission?.lab_tests?.length || 0} tests)</span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {isGovCard ? (
                        <span className="text-emerald-700 font-bold">₹0.00 (100% Free)</span>
                      ) : (
                        `₹${(billing?.testTotal || 0).toFixed(2)}`
                      )}
                    </span>
                  </div>

                  {/* Doctor Consultation */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Doctor Consultation ({admission?.assigned_doctor || 'Attending Physician'})</span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {isGovCard ? (
                        <span className="text-emerald-700 font-bold">₹0.00 (100% Free)</span>
                      ) : (
                        `₹${(billing?.doctorTotal || 200).toFixed(2)}`
                      )}
                    </span>
                  </div>

                  {/* Food */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Dietary Food & Nursing</span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {isGovCard ? (
                        <span className="text-emerald-700 font-bold">₹0.00 (100% Free)</span>
                      ) : (
                        `₹${(billing?.foodTotal || 100).toFixed(2)}`
                      )}
                    </span>
                  </div>

                  {/* Total Amount Due */}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-sm font-bold">
                    <div>
                      <span className="text-slate-900 block">Total Amount Due (Patient Payable)</span>
                      {isGovCard && (
                        <span className="text-[11px] text-emerald-700 font-bold">
                          🎉 Deducted from Govt. Card: - ₹{cardDeductionAmount.toFixed(2)} (100% Cashless)
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {isGovCard && (
                        <span className="text-xs text-slate-400 line-through block font-mono">
                          ₹{(billing?.grandTotal || 0).toFixed(2)}
                        </span>
                      )}
                      <span className="text-emerald-700 font-mono text-xl font-black">
                        ₹{adjustedGrandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment / Scheme Methods */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                  Select Settlement Method / Healthcare Scheme
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                  
                  {/* Government Card Option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('GovCard')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                      paymentMethod === 'GovCard'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs font-bold ring-1 ring-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <Award className="w-5 h-5 mb-1 text-emerald-600" />
                    <span className="text-xs font-bold">Govt. Card</span>
                    <span className="text-[10px] text-emerald-700 font-bold">₹5L Cover</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                      paymentMethod === 'UPI'
                        ? 'bg-sky-50 border-sky-500 text-sky-800 shadow-xs font-bold ring-1 ring-sky-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <QrCode className="w-5 h-5 mb-1 text-sky-600" />
                    <span className="text-xs font-bold">UPI / QR</span>
                    <span className="text-[10px] text-slate-400">Instant</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Card')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                      paymentMethod === 'Card'
                        ? 'bg-sky-50 border-sky-500 text-sky-800 shadow-xs font-bold ring-1 ring-sky-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mb-1 text-sky-600" />
                    <span className="text-xs font-bold">Card</span>
                    <span className="text-[10px] text-slate-400">Debit/Credit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('NetBanking')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                      paymentMethod === 'NetBanking'
                        ? 'bg-sky-50 border-sky-500 text-sky-800 shadow-xs font-bold ring-1 ring-sky-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Building className="w-5 h-5 mb-1 text-sky-600" />
                    <span className="text-xs font-bold">NetBanking</span>
                    <span className="text-[10px] text-slate-400">All Banks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                      paymentMethod === 'Cash'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs font-bold ring-1 ring-amber-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Banknote className="w-5 h-5 mb-1 text-amber-600" />
                    <span className="text-xs font-bold">Cash</span>
                    <span className="text-[10px] text-slate-400">Counter</span>
                  </button>
                </div>

                {/* Tab 1: Government Scheme Card */}
                {paymentMethod === 'GovCard' && (
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-300 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <Award className="w-5 h-5 text-emerald-700" />
                        <span className="font-bold text-xs text-emerald-950">
                          National / State Cashless Healthcare Scheme
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full font-mono">
                        ₹5,00,000 Annual Cover
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Select Scheme Card Type</label>
                        <select
                          value={govCardType}
                          onChange={(e) => setGovCardType(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                        >
                          <option value="Ayushman Bharat PM-JAY">Ayushman Bharat (PM-JAY Golden Card)</option>
                          <option value="State Green Card / Swasthya Sathi">State Govt. Green Card / Swasthya Sathi</option>
                          <option value="MJPJAY / State Scheme">MJPJAY / State Healthcare Card</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Government Health Card Number *</label>
                        <input
                          type="text"
                          placeholder="e.g. PMJAY-9821-4402-9912"
                          value={govCardNumber}
                          onChange={(e) => setGovCardNumber(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* LIVE GOVERNMENT CARD PASSBOOK & PERSISTENT BALANCE TRACKER */}
                    <div className="p-3.5 bg-white rounded-xl border border-emerald-300 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900 border-b border-emerald-100 pb-1.5">
                        <span className="flex items-center space-x-1.5">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                          <span>Government Card Passbook & Balance Tracker</span>
                        </span>
                        <span className="text-[10px] text-emerald-700 font-mono">
                          Beneficiary: {patient?.full_name || admission?.patient_name || patientId}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Available Before Settle:</span>
                          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                            ₹{startingCardBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                          <span className="text-[10px] text-emerald-700 uppercase font-bold block">Fees Deducted This Visit:</span>
                          <span className="font-mono font-bold text-emerald-800 text-xs sm:text-sm">
                            - ₹{cardDeductionAmount.toFixed(2)}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
                          <span className="text-[10px] text-emerald-900 uppercase font-bold block">Remaining Card Balance:</span>
                          <span className="font-mono font-black text-emerald-900 text-xs sm:text-sm">
                            ₹{afterDischargeBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-emerald-900 pt-1 space-y-0.5">
                        <p className="font-semibold text-emerald-800 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>All Diagnostic Tests, Medicines, Doctor Fees & General Bed are 100% Free!</span>
                        </p>
                        {isAcRoom ? (
                          <p className="text-slate-600 pl-4 text-[10px]">
                            • AC Deluxe Room is 50% Subsidized (₹300/day is deducted from Card).
                          </p>
                        ) : (
                          <p className="text-slate-600 pl-4 text-[10px]">
                            • General Ward Bed is 100% Cashless (₹0.00 Net Settleable).
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: UPI */}
                {paymentMethod === 'UPI' && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-24 h-24 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-xs">
                      <QrCode className="w-20 h-20 text-slate-800" />
                    </div>
                    <div className="space-y-2 flex-1 w-full">
                      <div className="text-xs font-bold text-slate-800">Scan QR with GPay / PhonePe / Paytm / BHIM</div>
                      <p className="text-[11px] text-slate-500">Or enter your VPA / UPI ID below for direct request:</p>
                      <input
                        type="text"
                        placeholder="e.g. yourname@oksbi"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Tab 3: Card */}
                {paymentMethod === 'Card' && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Cardholder Name</label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Card Number (Visa / MasterCard / RuPay)</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Expiry Date</label>
                        <input
                          type="text"
                          defaultValue="08/29"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">CVV Security Code</label>
                        <input
                          type="password"
                          defaultValue="•••"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Net Banking */}
                {paymentMethod === 'NetBanking' && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 block">Select Your Bank</label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Punjab National Bank">Punjab National Bank (PNB)</option>
                      <option value="Bank of Baroda">Bank of Baroda</option>
                    </select>
                  </div>
                )}

                {/* Tab 5: Cash Counter */}
                {paymentMethod === 'Cash' && (
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-300 space-y-1.5">
                    <div className="flex items-center space-x-2 text-xs font-bold text-amber-900">
                      <Banknote className="w-4 h-4 text-amber-700" />
                      <span>Cash Settlement at Hospital Billing Counter</span>
                    </div>
                    <p className="text-xs text-amber-800">
                      Please collect the cash receipt from Desk #3 (Ground Floor Reception). Clicking below will generate an official hospital receipt and discharge the patient.
                    </p>
                  </div>
                )}
              </div>

              {/* Pay & Discharge Final Trigger */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-500 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>256-Bit Encrypted Healthcare Settlement</span>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={handlePayAndDischarge}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-2 transition disabled:opacity-50"
                  >
                    {processing ? (
                      <span>Clearing Balance & Discharging...</span>
                    ) : (
                      <>
                        <span>
                          {isGovCard 
                            ? 'Claim ₹5 Lakh Benefit & Settle (₹0.00)' 
                            : `Pay ₹${(adjustedGrandTotal || billing?.grandTotal || 0).toFixed(2)} & Settle`}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
