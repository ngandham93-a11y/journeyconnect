
import React, { useState } from 'react';
import { Ticket, TicketType } from '../types';
import { ArrowRight, IndianRupee, Trash2, AlertTriangle, Phone, User, X, BadgeCheck, Map, ShieldCheck, MessageSquare, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/authService';
import { deleteTicket } from '../utils/storage';

interface TicketCardProps {
  ticket: Ticket;
  onDelete?: (id: string) => void;
  matchType?: 'EXACT' | 'PARTIAL';
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onDelete, matchType }) => {
  const [isDeleted, setIsDeleted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const currentUser = getCurrentUser();
  const navigate = useNavigate();
  
  const isOffer = ticket.type === TicketType.OFFER;
  const isOwner = currentUser?.id === ticket.userId;
  const isAdmin = currentUser?.role === 'ADMIN';

  // Enhance container classes for match highlighting
  const containerClasses = `group relative bg-slate-900 rounded-2xl transition-all duration-300 overflow-hidden flex flex-col ${
    matchType === 'EXACT'
      ? 'border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] scale-[1.02] z-10'
      : matchType === 'PARTIAL'
      ? 'border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.15)] z-0'
      : 'border border-slate-800 hover:border-cyan-500/50 hover:shadow-[0_0_40px_-10px_rgba(6,182,212,0.15)] z-0'
  }`;

  const handleMarkSoldClick = () => {
    setShowConfirmModal(true);
  };

  const confirmSold = () => {
    deleteTicket(ticket.id);
    
    // Notify parent if callback exists to update counts
    if (onDelete) {
        onDelete(ticket.id);
    }
    
    setIsDeleted(true);
    setShowConfirmModal(false);
  };

  const handleConnectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentUser) {
        navigate('/login');
        return;
    }
    setShowContact(true);
  };

  if (isDeleted) return null;

  // Safe date parsing to avoid timezone shifts
  const dateParts = ticket.date.split('-');
  const displayDay = dateParts[2] || '--';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const displayMonth = dateParts[1] ? monthNames[parseInt(dateParts[1]) - 1] : '--';

  return (
    <>
      <div className={containerClasses}>
        {matchType === 'EXACT' && (
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500 z-20 shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
        )}
        {matchType === 'PARTIAL' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-500 z-20 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
        )}

        <div className="p-6 flex-1 flex flex-col relative z-30">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-white leading-tight group-hover:text-cyan-400 transition-colors">{ticket.trainName}</h3>
                <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">#{ticket.trainNumber}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider uppercase border ${
                  isOffer ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20' : 'bg-amber-950/30 text-amber-400 border-amber-500/20'
                  }`}>
                  {isOffer ? 'Available' : 'Requested'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider uppercase bg-slate-800 text-cyan-400 border border-slate-700">
                      {ticket.classType}
                  </span>
                  {ticket.berthType && ticket.berthType !== 'No Preference' && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider uppercase bg-slate-900 text-slate-300 border border-slate-800">
                        {ticket.berthType}
                    </span>
                  )}
                  
                  {matchType === 'EXACT' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-emerald-500 text-white shadow-lg shadow-emerald-900/50 gap-1">
                        <BadgeCheck className="h-3 w-3" /> Exact Match
                    </span>
                  )}
                  {matchType === 'PARTIAL' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-yellow-500 text-black shadow-lg shadow-yellow-900/50 gap-1">
                        <Map className="h-3 w-3" /> Route Match
                    </span>
                  )}
              </div>
            </div>
            <div className="text-right bg-slate-950 p-3 rounded-xl border border-slate-800 min-w-[70px] flex flex-col items-center shadow-inner">
               <div className="text-2xl font-black text-white leading-none">
                  {displayDay}
               </div>
               <div className="text-[10px] uppercase text-slate-500 font-bold mt-1 tracking-widest">
                  {displayMonth}
               </div>
            </div>
          </div>

          {/* Timeline Visual */}
          <div className="flex items-center justify-between text-slate-300 mb-6 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
              <div className="flex flex-col">
                  <span className="text-xl font-black text-white">{ticket.departureTime || '--:--'}</span>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide truncate max-w-[80px]" title={ticket.fromStation}>{ticket.fromStation.split(' ')[0]}</span>
              </div>
              
              <div className="flex-1 flex flex-col items-center px-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">{ticket.duration || '--'}</span>
                  <div className="w-full h-[2px] bg-slate-800 relative">
                      <div className="absolute top-1/2 left-0 w-2 h-2 bg-cyan-500 rounded-full -translate-y-1/2 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                      <div className="absolute top-1/2 right-0 w-2 h-2 bg-cyan-500 rounded-full -translate-y-1/2 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 p-1 rounded-full border border-slate-800">
                          <ArrowRight className="h-3 w-3 text-cyan-400" />
                      </div>
                  </div>
              </div>

              <div className="flex flex-col items-end">
                  <span className="text-xl font-black text-white">{ticket.arrivalTime || '--:--'}</span>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide truncate max-w-[80px]" title={ticket.toStation}>{ticket.toStation.split(' ')[0]}</span>
              </div>
          </div>

          {/* Comment & Price */}
          <div className="flex items-end justify-between mt-auto">
              <div className="flex-1 min-w-0 pr-4">
                {ticket.comment && (
                  <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/50 max-w-[200px]">
                    <MessageSquare className="h-3 w-3 text-cyan-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-400 leading-snug italic truncate overflow-hidden whitespace-nowrap" title={ticket.comment}>
                      {ticket.comment}
                    </p>
                  </div>
                )}
              </div>
              <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Price</div>
                  <div className="flex items-center justify-end text-cyan-400 font-black text-2xl drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                      <IndianRupee className="h-5 w-5 mr-0.5" />
                      {ticket.price.toLocaleString('en-IN')}
                  </div>
              </div>
          </div>

          {/* Actions */}
          <div className="mt-5 pt-5 border-t border-slate-800">
             {showContact ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 animate-fade-in mb-3">
                    <div className="flex justify-between items-start mb-3">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Poster Details</div>
                        <button onClick={() => setShowContact(false)} className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"><X className="h-3 w-3"/></button>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                            <User className="h-4 w-4 text-slate-400" />
                        </div>
                        <span className="font-bold text-white text-sm">{ticket.sellerName || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900 p-3 rounded-lg border border-slate-800 group/phone cursor-pointer active:scale-95 transition-transform" onClick={() => {navigator.clipboard.writeText(ticket.userContact); alert("Copied!");}}>
                        <Phone className="h-4 w-4 text-cyan-400" />
                        <span className="font-mono text-lg text-cyan-400 font-bold tracking-wide flex-1">{ticket.userContact}</span>
                        <span className="text-[10px] text-slate-600 group-hover/phone:text-cyan-500 uppercase font-bold">Tap to Copy</span>
                    </div>
                </div>
             ) : (
                <button
                  onClick={handleConnectClick}
                  className={`w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                    isOffer 
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-900/20" 
                    : "bg-slate-800 text-cyan-400 hover:bg-slate-700 border border-slate-700"
                  }`}
                >
                    {isOffer ? 'Connect Ticket holder' : 'Connect Requestor'}
                </button>
             )}

             {/* Fix: replaced 'x' typo with '(isOwner || isAdmin)' check */}
             {(isOwner || isAdmin) && !showContact && (
              <button
                onClick={handleMarkSoldClick}
                className="w-full mt-2 flex justify-center items-center gap-2 py-3 px-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-sm font-bold hover:bg-red-500 hover:text-white transition-all duration-200"
              >
                <Trash2 className="h-4 w-4" /> Delete Listing
              </button>
             )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-sm w-full p-6 animate-scale-up">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Confirm Removal</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Are you sure you want to delete this listing?
              </p>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmSold}
                  className="py-2.5 px-4 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
