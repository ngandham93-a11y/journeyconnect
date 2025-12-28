
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseTicketIntent, lookupTrainInfo, getUpdatedTrainTimings } from '../services/geminiService';
import { getCurrentUser } from '../services/authService';
import { saveTicket, getStoredTickets, calculateDuration } from '../utils/storage';
import { TicketType, TrainClass, TicketStatus, Ticket } from '../types';
import { Sparkles, Loader2, IndianRupee, AlertCircle, ArrowRight, X, TrainFront, Info, MessageSquare, LayoutGrid } from 'lucide-react';
import { TicketCard } from '../components/TicketCard';
import { StationInput } from '../components/StationInput';
import { CustomDatePicker } from '../components/CustomDatePicker';

const BERTH_TYPES = [
  'No Preference',
  'Lower Berth (LB)',
  'Middle Berth (MB)',
  'Upper Berth (UB)',
  'Side Lower (SL)',
  'Side Upper (SU)',
  'Window Seat',
  'Aisle Seat'
];

export const ListingForm: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!currentUser) {
        navigate('/login');
    }
  }, [currentUser?.id, navigate]);

  const [loading, setLoading] = useState(false);
  const [fetchingTrain, setFetchingTrain] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [naturalInput, setNaturalInput] = useState('');
  
  const [isFlexibleDate, setIsFlexibleDate] = useState(false);
  const [isFlexibleClass, setIsFlexibleClass] = useState(false);

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [similarTickets, setSimilarTickets] = useState<Ticket[]>([]);
  
  const [formData, setFormData] = useState({
    type: TicketType.OFFER,
    trainNumber: '',
    trainName: '',
    fromStation: '',
    toStation: '',
    date: '',
    departureTime: '',
    arrivalTime: '',
    classType: TrainClass.SL,
    berthType: 'No Preference',
    price: '' as string | number, 
    comment: '',
    userContact: currentUser?.phoneNumber || '',
    sellerName: currentUser?.name || 'User'
  });

  const getWordCount = (str: string) => str.trim().split(/\s+/).filter(Boolean).length;
  const wordCount = getWordCount(formData.comment);

  // Effect to update timings when train number and stations are filled
  useEffect(() => {
    const updateTimings = async () => {
        if (formData.trainNumber.length === 5 && formData.fromStation.length > 3 && formData.toStation.length > 3) {
            setFetchingTrain(true);
            const details = await getUpdatedTrainTimings(formData.trainNumber, formData.fromStation, formData.toStation);
            setFetchingTrain(false);
            
            if (details) {
                setFormData(prev => ({
                    ...prev,
                    departureTime: details.departureTime || prev.departureTime,
                    arrivalTime: details.arrivalTime || prev.arrivalTime
                }));
            }
        }
    };

    const timeoutId = setTimeout(updateTimings, 1500); 
    return () => clearTimeout(timeoutId);
  }, [formData.trainNumber, formData.fromStation, formData.toStation]);

  const handleAIParse = async () => {
    if (!naturalInput) return;
    setLoading(true);
    try {
      const parsed = await parseTicketIntent(naturalInput);
      if (parsed) {
        setFormData(prev => ({
          ...prev,
          type: parsed.type === 'REQUEST' ? TicketType.REQUEST : TicketType.OFFER,
          trainNumber: parsed.trainNumber || prev.trainNumber,
          trainName: parsed.trainName || prev.trainName,
          fromStation: parsed.fromStation || prev.fromStation,
          toStation: parsed.toStation || prev.toStation,
          date: parsed.date || prev.date,
          classType: (parsed.classType as TrainClass) || prev.classType,
          price: parsed.price || prev.price,
          departureTime: parsed.departureTime || prev.departureTime
        }));
      }
    } catch (e) {
      alert("Could not parse. Please fill manually.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrainNumberChange = async (val: string) => {
    const numericVal = val.replace(/\D/g, '');
    if (numericVal.length > 5) return;

    setFormData(prev => ({ ...prev, trainNumber: numericVal }));
    setFetchError('');

    if (numericVal.length === 5) {
        setFetchingTrain(true);
        const info = await lookupTrainInfo(numericVal);
        setFetchingTrain(false);
        
        if (info) {
            setFormData(prev => ({
                ...prev,
                trainName: info.trainName || prev.trainName,
                fromStation: info.fromStation || prev.fromStation,
                toStation: info.toStation || prev.toStation,
                departureTime: info.departureTime || prev.departureTime,
                arrivalTime: info.arrivalTime || prev.arrivalTime
            }));
        } else {
            setFetchError('Could not fetch details. Check API Key or enter manually.');
        }
    }
  };

  const findMatches = async (): Promise<Ticket[]> => {
    const all = await getStoredTickets();
    return all.filter(t => t.type === TicketType.OFFER && t.status === TicketStatus.OPEN).filter(t => {
        const boardingMatch = t.fromStation.toLowerCase().trim() === formData.fromStation.toLowerCase().trim();
        const destMatch = t.toStation.toLowerCase().includes(formData.toStation.toLowerCase()) || 
                          formData.toStation.toLowerCase().includes(t.toStation.toLowerCase());

        if (!boardingMatch || !destMatch) return false;

        let dateMatch = t.date === formData.date;
        if (!dateMatch && isFlexibleDate && formData.date) {
            const tDate = new Date(t.date).getTime();
            const fDate = new Date(formData.date).getTime();
            if (Math.abs(tDate - fDate) / (1000 * 3600 * 24) <= 2) dateMatch = true;
        }

        let classMatch = t.classType === formData.classType;
        if (!classMatch && isFlexibleClass) classMatch = true;

        return dateMatch && classMatch;
    });
  };

  const finalizeSubmission = async () => {
    if (!currentUser) return;
    setLoading(true);

    if (!formData.trainNumber || formData.trainNumber.length !== 5) {
        setLoading(false);
        alert("Valid 5-digit Train Number is mandatory.");
        return;
    }

    if (!formData.date) {
        setLoading(false);
        alert("Travel Date is mandatory.");
        return;
    }

    if (!formData.price || Number(formData.price) <= 0) {
        setLoading(false);
        alert("Valid Price is mandatory.");
        return;
    }

    if (wordCount > 10) {
        setLoading(false);
        alert("Comment must be within 10 words.");
        return;
    }
    
    const duration = calculateDuration(formData.departureTime, formData.arrivalTime);

    const newTicket: Ticket = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      ...formData,
      price: Number(formData.price),
      duration,
      status: TicketStatus.OPEN,
      createdAt: Date.now(),
      amenities: [],
      isFlexibleDate,
      isFlexibleClass
    };
    
    await saveTicket(newTicket);
    setLoading(false);
    navigate('/');
  };

  const handlePreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.type === TicketType.REQUEST) {
        setLoading(true);
        const matches = await findMatches();
        setLoading(false);
        if (matches.length > 0) {
            setSimilarTickets(matches);
            setShowMatchModal(true);
            return;
        }
    }
    finalizeSubmission();
  };

  const inputClass = "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all outline-none";
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2";

  if (!currentUser) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 relative">
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
        <div className="relative bg-slate-900 p-8 border-b border-slate-800">
          <h2 className="relative text-3xl font-black text-white mb-2">Post a Ticket</h2>
          <p className="relative text-slate-400">Posting as <span className="text-cyan-400 font-bold">{currentUser.name}</span></p>
        </div>

        <div className="p-8">
          <div className="mb-8 bg-slate-950/50 p-6 rounded-2xl border border-slate-800 relative group flex flex-col justify-between overflow-hidden">
             <label className="block text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> AI AUTOFILL
             </label>
             <div className="flex gap-3">
                <input 
                  type="text" 
                  value={naturalInput}
                  onChange={(e) => setNaturalInput(e.target.value)}
                  placeholder="Paste SMS here..."
                  className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-4 h-12 text-white outline-none"
                />
                <button type="button" onClick={handleAIParse} disabled={loading} className="bg-purple-600/20 text-purple-400 border border-purple-500/50 px-6 h-12 rounded-xl text-sm font-bold">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fill Form'}
                </button>
             </div>
          </div>

          <form onSubmit={handlePreSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="md:col-span-2">
                  <label className={labelClass}>Purpose</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setFormData({...formData, type: TicketType.OFFER})} className={`py-3 rounded-xl border font-bold transition-all ${formData.type === TicketType.OFFER ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>Submit</button>
                    <button type="button" onClick={() => setFormData({...formData, type: TicketType.REQUEST})} className={`py-3 rounded-xl border font-bold transition-all ${formData.type === TicketType.REQUEST ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>Request</button>
                  </div>
               </div>
               
               <div>
                  <label className={labelClass}>Train Number <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <TrainFront className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                    <input type="text" required placeholder="5-digit Number" value={formData.trainNumber} onChange={(e) => handleTrainNumberChange(e.target.value)} className={`${inputClass} pl-10`} />
                    {fetchingTrain && <Loader2 className="absolute right-4 top-3.5 h-4 w-4 text-cyan-500 animate-spin" />}
                  </div>
                  {fetchError && <p className="text-[10px] text-red-500 mt-1">{fetchError}</p>}
               </div>

               <div>
                  <label className={labelClass}>Train Name</label>
                  <input type="text" required placeholder="Train Name" value={formData.trainName} onChange={(e) => setFormData({...formData, trainName: e.target.value})} className={inputClass} />
               </div>

               <div><StationInput label="From" value={formData.fromStation} onChange={(v) => setFormData({...formData, fromStation: v})} required /></div>
               <div><StationInput label="To" value={formData.toStation} onChange={(v) => setFormData({...formData, toStation: v})} required /></div>

               <div>
                  <label className={labelClass}>Travel Date <span className="text-red-500">*</span></label>
                  {/* FIX: CustomDatePicker expects string[] for multi-select, but ListingForm needs a single date.
                      We wrap the single date in an array and take the latest selection from the result to maintain compatibility. */}
                  <CustomDatePicker 
                    value={formData.date ? [formData.date] : []} 
                    onChange={(v) => setFormData({...formData, date: v.length > 0 ? v[v.length - 1] : ''})} 
                  />
                  {formData.type === TicketType.REQUEST && (
                    <div className="mt-3 flex items-center gap-2">
                        <input type="checkbox" id="flexD" checked={isFlexibleDate} onChange={e => setIsFlexibleDate(e.target.checked)} className="rounded bg-slate-900 border-slate-700" />
                        <label htmlFor="flexD" className="text-xs text-slate-400">Flexible (+/- 2 days)</label>
                    </div>
                  )}
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div><label className={labelClass}>Dep</label><input type="time" value={formData.departureTime} onChange={(e) => setFormData({...formData, departureTime: e.target.value})} className={`${inputClass} [color-scheme:dark]`} /></div>
                 <div><label className={labelClass}>Arr</label><input type="time" value={formData.arrivalTime} onChange={(e) => setFormData({...formData, arrivalTime: e.target.value})} className={`${inputClass} [color-scheme:dark]`} /></div>
               </div>

               <div>
                  <label className={labelClass}>Class</label>
                  <select value={formData.classType} onChange={(e) => setFormData({...formData, classType: e.target.value as TrainClass})} className={inputClass}>
                    {Object.values(TrainClass).map(c => (<option key={c} value={c}>{c}</option>))}
                  </select>
                  {formData.type === TicketType.REQUEST && (
                    <div className="mt-3 flex items-center gap-3">
                        <input type="checkbox" id="flexC" checked={isFlexibleClass} onChange={e => setIsFlexibleClass(e.target.checked)} className="rounded bg-slate-900 border-slate-700" />
                        <label htmlFor="flexC" className="text-xs text-slate-400">Any Class (Flexible)</label>
                    </div>
                  )}
               </div>

               <div>
                  <label className={labelClass}>Berth / Seat Type</label>
                  <div className="relative">
                    <LayoutGrid className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                    <select value={formData.berthType} onChange={(e) => setFormData({...formData, berthType: e.target.value})} className={`${inputClass} pl-10`}>
                      {BERTH_TYPES.map(bt => (<option key={bt} value={bt}>{bt}</option>))}
                    </select>
                  </div>
               </div>

               <div>
                  <label className={labelClass}>Price (₹) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                    <input type="number" required placeholder="0" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className={`${inputClass} pl-10`} />
                  </div>
               </div>

               <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className={labelClass}>Comment (Upto 10 words)</label>
                    <span className={`text-[10px] font-bold ${wordCount > 10 ? 'text-red-500' : 'text-slate-500'}`}>
                      {wordCount}/10 words
                    </span>
                  </div>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                    <textarea 
                      rows={2}
                      placeholder="Optional details..." 
                      value={formData.comment} 
                      onChange={(e) => setFormData({...formData, comment: e.target.value})} 
                      className={`${inputClass} pl-10 resize-none`} 
                    />
                  </div>
               </div>
            </div>

            <div className="pt-8 border-t border-slate-800 flex justify-end gap-4">
                <button type="button" onClick={() => navigate('/')} className="px-6 py-3 rounded-xl text-slate-400 font-bold">Cancel</button>
                <button type="submit" disabled={loading || wordCount > 10} className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold disabled:opacity-50">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
                </button>
            </div>
          </form>
        </div>
      </div>

      {showMatchModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center">
                   <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-white">Matches Found!</h3>
                   <p className="text-sm text-slate-400">We found {similarTickets.length} ticket(s) matching your request.</p>
                </div>
              </div>
              <button onClick={() => setShowMatchModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 bg-slate-950/50">
               <div className="bg-cyan-900/10 border border-cyan-500/20 p-4 rounded-xl flex items-start gap-3">
                  <Info className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-cyan-100">
                    Instead of posting a request, you might want to grab one of these directly!
                    {isFlexibleDate && " (Includes results from flexible dates)"}
                  </p>
               </div>
               <div className="grid gap-4">
                  {similarTickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
               </div>
            </div>
            <div className="p-6 bg-slate-900 border-t border-slate-800 rounded-b-3xl flex flex-col md:flex-row gap-4 justify-between items-center">
               <button onClick={finalizeSubmission} className="text-slate-400 hover:text-white font-bold text-sm underline decoration-slate-600 underline-offset-4 hover:decoration-white transition-all">
                  Ignore & Post Request Anyway
               </button>
               <button onClick={() => navigate('/')} className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2">
                  Browse All Tickets <ArrowRight className="h-4 w-4" />
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
