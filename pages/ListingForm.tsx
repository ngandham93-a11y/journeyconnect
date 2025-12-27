
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseTicketIntent, lookupTrainInfo, getUpdatedTrainTimings } from '../services/geminiService';
import { getCurrentUser } from '../services/authService';
import { saveTicket, getStoredTickets, calculateDuration } from '../utils/storage';
import { TicketType, TrainClass, TicketStatus, Ticket } from '../types';
import { Sparkles, Loader2, IndianRupee, ArrowRight, X, TrainFront, MessageSquare, LayoutGrid, Package, User } from 'lucide-react';
import { TicketCard } from '../components/TicketCard';
import { StationInput } from '../components/StationInput';
import { CustomDatePicker } from '../components/CustomDatePicker';

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
    berthType: 'Standard Box',
    price: '' as string | number, 
    comment: '',
    userContact: currentUser?.phoneNumber || '',
    sellerName: currentUser?.name || 'User'
  });

  const getWordCount = (str: string) => str.trim().split(/\s+/).filter(Boolean).length;
  const wordCount = getWordCount(formData.comment);

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
      alert("Could not parse shipment details. Please fill manually.");
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
            setFetchError('Could not fetch transport details. Enter manually.');
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
        return dateMatch;
    });
  };

  const finalizeSubmission = async () => {
    if (!currentUser) return;
    setLoading(true);
    if (!formData.date) {
        setLoading(false);
        alert("Dispatch Date is mandatory.");
        return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
        setLoading(false);
        alert("Proposed fee is mandatory.");
        return;
    }
    if (wordCount > 10) {
        setLoading(false);
        alert("Details must be within 10 words.");
        return;
    }
    
    const newTicket: Ticket = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      ...formData,
      price: Number(formData.price),
      duration: "Calculated",
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
          <div className="absolute inset-0 bg-cyan-500/5"></div>
          <h2 className="relative text-3xl font-black text-white mb-2">Register Shipment</h2>
          <p className="relative text-slate-400">Posting as <span className="text-cyan-400 font-bold">{currentUser.name}</span></p>
        </div>

        <div className="p-8">
          <div className="mb-8 bg-slate-950/50 p-6 rounded-2xl border border-slate-800 relative group flex flex-col justify-between overflow-hidden">
             <label className="block text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> AI LOGISTICS HELPER
             </label>
             <div className="flex gap-3">
                <input 
                  type="text" 
                  value={naturalInput}
                  onChange={(e) => setNaturalInput(e.target.value)}
                  placeholder="e.g. 'Delivering a small box from Mumbai to Pune on 25th Dec'..."
                  className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-4 h-12 text-white outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button type="button" onClick={handleAIParse} disabled={loading} className="bg-purple-600/20 text-purple-400 border border-purple-500/50 px-6 h-12 rounded-xl text-sm font-bold hover:bg-purple-600 hover:text-white transition-all">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Auto-Fill'}
                </button>
             </div>
          </div>

          <form onSubmit={handlePreSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="md:col-span-2">
                  <label className={labelClass}>Are you a Courier or a Sender?</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setFormData({...formData, type: TicketType.OFFER})} className={`py-4 rounded-xl border font-bold transition-all flex flex-col items-center gap-1 ${formData.type === TicketType.OFFER ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                      <Package className="h-5 w-5 mb-1" />
                      <span>I am Traveling (Courier Space)</span>
                    </button>
                    <button type="button" onClick={() => setFormData({...formData, type: TicketType.REQUEST})} className={`py-4 rounded-xl border font-bold transition-all flex flex-col items-center gap-1 ${formData.type === TicketType.REQUEST ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                      <User className="h-5 w-5 mb-1" />
                      <span>I need a Courier (Parcel)</span>
                    </button>
                  </div>
               </div>
               
               <div>
                  <label className={labelClass}>Transport Mode / Train Number</label>
                  <div className="relative">
                    <TrainFront className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                    <input type="text" placeholder="e.g. 12101 or Flight AI302" value={formData.trainNumber} onChange={(e) => handleTrainNumberChange(e.target.value)} className={`${inputClass} pl-10`} />
                    {fetchingTrain && <Loader2 className="absolute right-4 top-3.5 h-4 w-4 text-cyan-500 animate-spin" />}
                  </div>
               </div>

               <div>
                  <label className={labelClass}>Vehicle Name</label>
                  <input type="text" placeholder="e.g. Rajdhani Express" value={formData.trainName} onChange={(e) => setFormData({...formData, trainName: e.target.value})} className={inputClass} />
               </div>

               <div><StationInput label="From City" value={formData.fromStation} onChange={(v) => setFormData({...formData, fromStation: v})} required /></div>
               <div><StationInput label="To City" value={formData.toStation} onChange={(v) => setFormData({...formData, toStation: v})} required /></div>

               <div>
                  <label className={labelClass}>Dispatch Date <span className="text-red-500">*</span></label>
                  <CustomDatePicker 
                    value={formData.date} 
                    onChange={(v) => setFormData({...formData, date: v})} 
                  />
                  {formData.type === TicketType.REQUEST && (
                    <div className="mt-3 flex items-center gap-2">
                        <input type="checkbox" id="flexD" checked={isFlexibleDate} onChange={e => setIsFlexibleDate(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-cyan-500" />
                        <label htmlFor="flexD" className="text-xs text-slate-400">Flexible Date (+/- 2 days)</label>
                    </div>
                  )}
               </div>

               <div>
                  <label className={labelClass}>Proposed Fee (₹) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                    <input type="number" required placeholder="Proposed delivery cost" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className={`${inputClass} pl-10`} />
                  </div>
               </div>

               <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className={labelClass}>Parcel / Journey Details (Max 10 words)</label>
                    <span className={`text-[10px] font-bold ${wordCount > 10 ? 'text-red-500' : 'text-slate-500'}`}>
                      {wordCount}/10 words
                    </span>
                  </div>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                    <textarea 
                      rows={2}
                      placeholder="e.g. 'One small envelope only', 'Large bag space available'..." 
                      value={formData.comment} 
                      onChange={(e) => setFormData({...formData, comment: e.target.value})} 
                      className={`${inputClass} pl-10 resize-none`} 
                    />
                  </div>
               </div>
            </div>

            <div className="pt-8 border-t border-slate-800 flex justify-end gap-4">
                <button type="button" onClick={() => navigate('/')} className="px-6 py-3 rounded-xl text-slate-400 font-bold hover:bg-slate-800 transition-colors">Cancel</button>
                <button type="submit" disabled={loading || wordCount > 10} className="px-10 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold disabled:opacity-50 shadow-lg shadow-cyan-900/20 hover:scale-[1.02] transition-all">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Register Listing'}
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
                   <h3 className="text-xl font-black text-white">Couriers Available!</h3>
                   <p className="text-sm text-slate-400">Found {similarTickets.length} traveler(s) on your route.</p>
                </div>
              </div>
              <button onClick={() => setShowMatchModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 bg-slate-950/50">
               <div className="bg-cyan-900/10 border border-cyan-500/20 p-4 rounded-xl flex items-start gap-3">
                  <Package className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-cyan-100">
                    Travelers are already available on this route! You can contact them directly instead of posting a request.
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
                  Ignore & Post Anyway
               </button>
               <button onClick={() => navigate('/')} className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2">
                  Browse Shipments <ArrowRight className="h-4 w-4" />
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
