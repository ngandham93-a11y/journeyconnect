
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTicketById, deleteTicket } from '../utils/storage';
import { Ticket } from '../types';
import { getCurrentUser } from '../services/authService';
import { ArrowLeft, ArrowRight, User, MessageCircle, Phone, Trash2, AlertTriangle } from 'lucide-react';

export const TicketDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [revealContact, setRevealContact] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const currentUser = getCurrentUser();

  useEffect(() => {
    const fetchTicket = async () => {
        if (id) {
            const found = await getTicketById(id);
            setTicket(found);
        }
        setIsLoading(false);
    };
    fetchTicket();
  }, [id]);

  const handleMarkAsSold = () => {
    setShowConfirmModal(true);
  };

  const confirmSold = async () => {
    if (ticket && ticket.id) {
        setIsLoading(true);
        await deleteTicket(ticket.id);
        navigate('/', { replace: true });
    }
  };

  if (isLoading) {
    return (
       <div className="min-h-screen bg-slate-950 py-10 px-4 animate-pulse">
         <div className="max-w-5xl mx-auto">
            <div className="h-6 w-32 bg-slate-800 rounded mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden h-[500px]"></div>
                </div>
            </div>
         </div>
       </div>
    );
  }

  if (!ticket) return <div className="p-20 text-center text-slate-500">Ticket not found</div>;

  const isOwner = currentUser?.id === ticket.userId;
  const isAdmin = currentUser?.role === 'ADMIN';
  const canManage = isOwner || isAdmin;

  // Safe date parsing to avoid timezone shifts
  const dateParts = ticket.date.split('-');
  const displayDay = dateParts[2] || '--';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const displayMonth = dateParts[1] ? monthNames[parseInt(dateParts[1]) - 1] : '--';
  const displayYear = dateParts[0] || '';

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <button onClick={() => navigate('/')} className="flex items-center text-slate-400 hover:text-cyan-400 font-bold transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Search
            </button>
            
            {canManage && (
                <button 
                    onClick={handleMarkAsSold}
                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl transition-all font-bold text-sm"
                >
                    <Trash2 className="h-4 w-4" /> Mark as Sold & Remove
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main Details */}
            <div className="md:col-span-2 space-y-6">
                <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                    <div className="bg-gradient-to-r from-slate-900 to-slate-900 border-b border-slate-800 p-8 relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[60px] pointer-events-none"></div>
                        <div className="flex justify-between items-start relative">
                            <div>
                                <h1 className="text-3xl font-black text-white mb-1">{ticket.trainName}</h1>
                                <p className="text-slate-400 font-mono text-sm tracking-wide">#{ticket.trainNumber} • <span className="text-cyan-400 font-bold">{ticket.classType}</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-white">₹{ticket.price}</p>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">per passenger</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-8">
                        {/* Timeline */}
                        <div className="flex items-center justify-between mb-12 relative">
                             <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-800 -z-10"></div>

                             <div className="text-center bg-slate-900 px-4 z-10">
                                <p className="text-2xl font-black text-white">{ticket.departureTime}</p>
                                <div className="text-sm text-slate-400 font-medium mb-1">{displayDay} {displayMonth} {displayYear}</div>
                                <div className="bg-slate-800 px-3 py-1 rounded text-[10px] font-bold text-slate-300 uppercase tracking-wider inline-block">{ticket.fromStation}</div>
                             </div>

                             <div className="text-center bg-slate-900 px-2 z-10">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{ticket.duration}</div>
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-cyan-400">
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                             </div>

                             <div className="text-center bg-slate-900 px-4 z-10">
                                <p className="text-2xl font-black text-white">{ticket.arrivalTime}</p>
                                <div className="text-sm text-slate-400 font-medium mb-1">Arrival Date</div>
                                <div className="bg-slate-800 px-3 py-1 rounded text-[10px] font-bold text-slate-300 uppercase tracking-wider inline-block">{ticket.toStation}</div>
                             </div>
                        </div>

                        <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-5 mt-8">
                            <h4 className="font-bold text-amber-500 text-sm mb-1 flex items-center gap-2">Important Legal Notice</h4>
                            <p className="text-xs text-amber-200/70 leading-relaxed text-justify">
                              JourneyConnect is only a listing and discovery platform and is not authorised by Indian Railways or IRCTC to sell or transfer tickets. Most resale or transfer of railway tickets is prohibited under the Railways Act, 1989 (including Sections 142 and 143), and only limited name changes through official IRCTC procedures are legally allowed. Please use this service only in ways that fully comply with Indian Railways and IRCTC rules, and avoid any informal buying or selling that could lead to cancellation, penalties, or prosecution.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-5">Seller Info</h3>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-14 w-14 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center border border-slate-600 shadow-inner">
                            <User className="h-6 w-6 text-slate-300" />
                        </div>
                        <div>
                            <p className="font-bold text-white text-lg">{ticket.sellerName || 'Anonymous'}</p>
                        </div>
                    </div>
                    
                    {revealContact ? (
                       <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 animate-fade-in">
                          <div className="flex items-center gap-3 text-sm text-white">
                             <Phone className="h-4 w-4 text-cyan-400" />
                             {ticket.userContact}
                          </div>
                          <div className="text-xs text-slate-500 mt-2 text-center">
                             Please mention "JourneyConnect" when contacting.
                          </div>
                       </div>
                    ) : (
                       <button 
                         onClick={() => setRevealContact(true)}
                         className="w-full border border-slate-700 text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors text-sm"
                       >
                          Show Contact Info
                       </button>
                    )}
                </div>

                <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-6 shadow-xl">
                     <div className="flex justify-between items-center mb-6">
                        <span className="text-slate-400 text-sm font-medium">Total Price</span>
                        <span className="text-3xl font-black text-cyan-400">₹{ticket.price}</span>
                     </div>
                     <button 
                       onClick={() => setRevealContact(true)}
                       className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex justify-center items-center gap-2 text-lg"
                     >
                        Connect with Seller <MessageCircle className="h-5 w-5" />
                     </button>
                     <p className="text-center text-[10px] text-slate-500 mt-4 flex items-center justify-center gap-1 uppercase tracking-wider font-bold">
                        Direct Peer-to-Peer
                     </p>
                </div>
            </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-sm w-full p-6 animate-scale-up">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Confirm Removal</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Are you sure you want to mark this ticket as SOLD? This will permanently remove the listing.
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
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
