
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStoredTickets, deleteTicket } from '../utils/storage';
import { Ticket, TicketType, TrainClass } from '../types';
import { TicketCard } from '../components/TicketCard';
import { findMatchesAI, analyzeRouteMatches } from '../services/geminiService';
import { getCurrentUser } from '../services/authService';
import { Search, Loader2, Sparkles, Filter, X, MapPin, ArrowDown, Lock, Calendar, RefreshCw, FilterX, Ticket as TicketIcon } from 'lucide-react';
import { StationInput } from '../components/StationInput';
import { CustomDatePicker } from '../components/CustomDatePicker';

const TicketSkeleton = () => (
  <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 animate-pulse flex flex-col h-[380px]">
    <div className="flex justify-between items-start mb-6">
      <div className="space-y-3">
        <div className="h-7 w-48 bg-slate-800 rounded-lg"></div>
        <div className="flex gap-2">
            <div className="h-5 w-20 bg-slate-800 rounded-md"></div>
            <div className="h-5 w-12 bg-slate-800 rounded-md"></div>
        </div>
      </div>
      <div className="h-16 w-16 bg-slate-800 rounded-xl"></div>
    </div>
    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800/50 mb-6 flex items-center justify-between">
      <div className="space-y-2">
         <div className="h-6 w-16 bg-slate-800 rounded"></div>
         <div className="h-3 w-10 bg-slate-800 rounded"></div>
      </div>
      <div className="flex-1 mx-4 flex items-center justify-center">
         <div className="w-full h-0.5 bg-slate-800"></div>
      </div>
      <div className="space-y-2 flex flex-col items-end">
         <div className="h-6 w-16 bg-slate-800 rounded"></div>
         <div className="h-3 w-10 bg-slate-800 rounded"></div>
      </div>
    </div>
    <div className="mt-auto">
       <div className="flex flex-col items-end mb-5">
           <div className="h-3 w-20 bg-slate-800 rounded mb-1"></div>
           <div className="h-8 w-32 bg-slate-800 rounded-lg"></div>
       </div>
       <div className="h-12 w-full bg-slate-800 rounded-xl"></div>
    </div>
  </div>
);

export const Home: React.FC = () => {
  const currentUser = getCurrentUser();
  const navigate = useNavigate();

  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [aiMatches, setAiMatches] = useState<string[] | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showResetToast, setShowResetToast] = useState(false);

  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [routeMatches, setRouteMatches] = useState<{ exact: string[], partial: string[] }>({ exact: [], partial: [] });
  const [isRouteAnalyzing, setIsRouteAnalyzing] = useState(false);
  
  const [filterType, setFilterType] = useState<'ALL' | TicketType>('ALL');
  const [selectedClasses, setSelectedClasses] = useState<TrainClass[]>([]);
  const [filterDate, setFilterDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'PRICE_ASC' | 'PRICE_DESC' | 'DATE'>('DATE');
  const [showMyListings, setShowMyListings] = useState(false);
  const [matchFilter, setMatchFilter] = useState<'ALL' | 'EXACT' | 'PARTIAL'>('ALL');

  // Compute unique dates with postings for the green indicator
  const datesWithPostings = useMemo(() => {
    return new Set(allTickets.map(t => t.date));
  }, [allTickets]);

  const fetchTickets = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setIsSyncing(true);
    try {
        const tickets = await getStoredTickets();
        setAllTickets(tickets);
    } catch (e) {
        console.error("Home: Failed to fetch tickets", e);
    } finally {
        setIsLoading(false);
        setIsSyncing(false);
    }
  }, []);

  const handleClearAll = useCallback(() => {
    // Check if any filters were actually active to avoid spamming toast
    const hasActiveFilters = searchQuery || routeFrom || routeTo || filterType !== 'ALL' || selectedClasses.length > 0 || filterDate || showMyListings;
    
    if (hasActiveFilters) {
      setSearchQuery('');
      setAiMatches(null);
      setRouteFrom('');
      setRouteTo('');
      setRouteMatches({ exact: [], partial: [] });
      setFilterType('ALL');
      setSelectedClasses([]);
      setFilterDate('');
      setSortBy('DATE');
      setShowMyListings(false);
      setMatchFilter('ALL');

      // Show the "Filters removed" notification
      setShowResetToast(true);
      setTimeout(() => setShowResetToast(false), 2000);
    }
  }, [searchQuery, routeFrom, routeTo, filterType, selectedClasses, filterDate, showMyListings]);

  useEffect(() => {
    fetchTickets();
    
    // Listen for the reset-filters event triggered by Header.tsx
    window.addEventListener('reset-filters', handleClearAll);
    return () => window.removeEventListener('reset-filters', handleClearAll);
  }, [fetchTickets, handleClearAll]);

  const handleDeleteTicket = async (id: string) => {
    setAllTickets(prev => prev.filter(t => t.id !== id));
    await deleteTicket(id);
  };

  useEffect(() => {
    if (!routeFrom || !routeTo) {
        setRouteMatches({ exact: [], partial: [] });
        setMatchFilter('ALL');
        return;
    }

    const timer = setTimeout(async () => {
        setIsRouteAnalyzing(true);
        const matchesData = await analyzeRouteMatches(routeFrom, routeTo, allTickets);
        setRouteMatches(matchesData || { exact: [], partial: [] });
        setIsRouteAnalyzing(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [routeFrom, routeTo, allTickets]);

  useEffect(() => {
    let result = [...allTickets];

    // 1) Text + AI search
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      const textMatches = result.filter(t =>
        t.trainName.toLowerCase().includes(lowerQ) ||
        t.fromStation.toLowerCase().includes(lowerQ) ||
        t.toStation.toLowerCase().includes(lowerQ) ||
        t.trainNumber.includes(lowerQ)
      );

      if (aiMatches !== null) {
        const aiFound = result.filter(t => aiMatches.includes(t.id));
        const combinedMap = new Map<string, Ticket>();
        [...textMatches, ...aiFound].forEach(t => combinedMap.set(t.id, t));
        result = Array.from(combinedMap.values());
      } else {
        result = textMatches;
      }
    }

    // 2) Route filters
    if (routeFrom && routeTo) {
      if (!isRouteAnalyzing) {
        const exact = routeMatches?.exact || [];
        const partial = routeMatches?.partial || [];
        
        if (matchFilter === 'EXACT') {
          result = result.filter(t => exact.includes(t.id));
        } else if (matchFilter === 'PARTIAL') {
          result = result.filter(t => partial.includes(t.id));
        } else {
          const validIds = [...exact, ...partial];
          if (validIds.length > 0) {
            result = result.filter(t => validIds.includes(t.id));
          } else if (routeFrom.length > 3 && routeTo.length > 3) {
             result = result.filter(t => 
               t.fromStation.toLowerCase().includes(routeFrom.toLowerCase()) && 
               t.toStation.toLowerCase().includes(routeTo.toLowerCase())
             );
          }
        }
      }
    } else {
      if (routeFrom) {
        result = result.filter(t =>
          t.fromStation.toLowerCase().includes(routeFrom.toLowerCase())
        );
      }
      if (routeTo) {
        result = result.filter(t =>
          t.toStation.toLowerCase().includes(routeTo.toLowerCase())
        );
      }
    }

    // 3) Ticket type filter
    if (filterType !== 'ALL') {
      result = result.filter(t => t.type === filterType);
    }

    // 4) Class filter
    if (selectedClasses.length > 0) {
      result = result.filter(t => {
        if (selectedClasses.includes(t.classType)) return true;
        if (t.type === TicketType.REQUEST && t.isFlexibleClass) return true;
        return false;
      });
    }

    // 5) Date filter
    if (filterDate) {
      result = result.filter(t => t.date === filterDate);
    }

    // 6) My listings
    if (showMyListings && currentUser) {
      result = result.filter(t => t.userId === currentUser.id);
    }

    // 7) Sorting
    if (sortBy === 'PRICE_ASC') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'PRICE_DESC') result.sort((a, b) => b.price - a.price);
    else if (sortBy === 'DATE') result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setFilteredTickets(result);
  }, [allTickets, filterType, selectedClasses, filterDate, sortBy, searchQuery, aiMatches, showMyListings, currentUser?.id, routeFrom, routeTo, routeMatches, isRouteAnalyzing, matchFilter]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsAiSearching(true);
    try {
        const aiMatchedIds = await findMatchesAI(searchQuery, allTickets);
        setAiMatches(aiMatchedIds);
    } catch (error) {
        console.error("AI Search failed", error);
        setAiMatches(null);
    } finally {
        setIsAiSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setAiMatches(null);
  };

  const handleClearRoute = () => {
    setRouteFrom('');
    setRouteTo('');
    setRouteMatches({ exact: [], partial: [] });
    setMatchFilter('ALL');
  };

  const toggleClass = (cls: TrainClass) => {
    if (selectedClasses.includes(cls)) {
      setSelectedClasses(selectedClasses.filter(c => c !== cls));
    } else {
      setSelectedClasses([...selectedClasses, cls]);
    }
  };

  const getMatchType = (id: string): 'EXACT' | 'PARTIAL' | undefined => {
    if (routeMatches?.exact?.includes(id)) return 'EXACT';
    if (routeMatches?.partial?.includes(id)) return 'PARTIAL';
    return undefined;
  };

  const handleMatchFilterClick = (type: 'EXACT' | 'PARTIAL') => {
    if (matchFilter === type) {
        setMatchFilter('ALL');
    } else {
        setMatchFilter(type);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      {/* Toast Notification */}
      {showResetToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-cyan-950 border border-cyan-500/40 text-cyan-400 px-6 py-2.5 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center gap-2 font-bold <sm:text-xs text-sm backdrop-blur-md">
            <FilterX className="h-4 w-4" />
            Filters removed
          </div>
        </div>
      )}

      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
           Share the <span className="text-cyan-400">Journey</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg mb-8">
           Connect instantly with fellow travelers send your parcels instantly overnight within cities
        </p>
        <div className="flex flex-wrap justify-center gap-4">
            <Link to="/give" className="group relative px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl font-bold text-white shadow-lg shadow-emerald-900/20 hover:scale-105 transition-all">
                <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-3">
                    <TicketIcon className="h-6 w-6" />
                    <span className="text-lg">I have a spare ticket</span>
                </div>
            </Link>
            <button 
                onClick={() => document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-3"
            >
                <Search className="h-5 w-5" />
                <span>I need a ticket</span>
            </button>
        </div>
      </div>

      <div id="search-section" className="mb-10">
        <div className="bg-slate-900 rounded-3xl shadow-2xl shadow-black/50 border border-slate-800 overflow-hidden relative">
           <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
           <div className="p-6 md:p-8">
               <form onSubmit={handleSearch} className="flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row gap-3">
                      <div className="hidden md:block flex-1 relative group">
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                        <input 
                          type="text" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by train name, number, or simply say 'AC ticket to Goa'"
                          className="w-full bg-slate-950 pl-12 pr-12 py-3.5 rounded-xl border border-slate-800 focus:border-cyan-500 text-white placeholder-slate-600 focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-inner"
                        />
                        {searchQuery && (
                          <button type="button" onClick={handleClearSearch} className="absolute right-4 top-3.5 p-0.5 hover:bg-slate-800 rounded-full transition-colors">
                            <X className="h-4 w-4 text-slate-500 hover:text-white" />
                          </button>
                        )}
                      </div>
                      <button 
                        type="submit"
                        disabled={isAiSearching}
                        className="hidden md:flex px-8 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/20 items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isAiSearching ? <Loader2 className="animate-spin h-5 w-5" /> : <Sparkles className="h-4 w-4" />}
                        {isAiSearching ? 'AI Search...' : 'Smart Search'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowMobileFilters(!showMobileFilters)}
                        className="md:hidden px-4 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        <Filter className="h-4 w-4" /> Apply Filters
                      </button>
                  </div>
                  <div className="flex items-center gap-4 px-2">
                     <div className="h-px bg-slate-800 flex-1"></div>
                     <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="h-3 w-3" /> Find by Route
                     </span>
                     <div className="h-px bg-slate-800 flex-1"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                          <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 group-focus-within:border-cyan-500/50 transition-colors">
                            <StationInput label="From Station" value={routeFrom} onChange={setRouteFrom} placeholder="Origin (e.g. Mumbai)" />
                          </div>
                      </div>
                      <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                          <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 group-focus-within:border-cyan-500/50 transition-colors">
                            <StationInput label="To Station" value={routeTo} onChange={setRouteTo} placeholder="Destination (e.g. Surat)" />
                          </div>
                      </div>
                  </div>
               </form>
               {(routeFrom || routeTo) && (
                   <div className="mt-4 pt-4 border-t border-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-3 min-h-[30px] animate-fade-in">
                        {isRouteAnalyzing ? (
                            <div className="text-cyan-400 text-xs font-bold flex items-center gap-2 animate-pulse bg-cyan-950/30 px-3 py-1.5 rounded-full border border-cyan-500/20">
                                <Loader2 className="animate-spin h-3 w-3" /> Analyzing connectivity...
                            </div>
                        ) : (
                           <div className="flex gap-4 text-xs font-bold">
                                <button 
                                  onClick={() => handleMatchFilterClick('EXACT')}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                                    matchFilter === 'EXACT' 
                                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                                    : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/40'
                                  }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${matchFilter === 'EXACT' ? 'bg-white' : 'bg-emerald-500 animate-pulse'}`}></span> 
                                    Exact Match ({routeMatches.exact.length})
                                </button>
                                <button 
                                  onClick={() => handleMatchFilterClick('PARTIAL')}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                                    matchFilter === 'PARTIAL' 
                                    ? 'bg-yellow-500 border-yellow-400 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
                                    : 'bg-yellow-950/30 border-yellow-500/20 text-yellow-400 hover:bg-yellow-900/40'
                                  }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${matchFilter === 'PARTIAL' ? 'bg-black' : 'bg-yellow-500'}`}></span> 
                                    Route Match ({routeMatches.partial.length})
                                </button>
                           </div>
                        )}
                        <button onClick={handleClearRoute} className="text-slate-500 hover:text-white text-xs font-semibold flex items-center gap-1 hover:underline decoration-slate-600 underline-offset-4">
                            Clear Route Filters <X className="h-3 w-3" />
                        </button>
                   </div>
               )}
           </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className={`md:w-72 flex-shrink-0 space-y-6 ${showMobileFilters ? 'block' : 'hidden md:block'}`}>
           <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    <Filter className="h-4 w-4 text-cyan-400" /> Apply Filters
                </h3>
                {showMobileFilters && <button onClick={() => setShowMobileFilters(false)}><X className="h-4 w-4 text-slate-400" /></button>}
              </div>
              {currentUser && (
                <div className="mb-8 p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-xl flex items-center justify-between">
                    <span className="text-sm font-bold text-cyan-400">Show My Active Listings</span>
                    <button 
                        onClick={() => setShowMyListings(!showMyListings)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${showMyListings ? 'bg-cyan-500' : 'bg-slate-700'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showMyListings ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
              )}
              <div className="mb-8">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Calendar className="h-3 w-3" /> Travel Date
                </label>
                <CustomDatePicker 
                  value={filterDate} 
                  onChange={setFilterDate} 
                  availableDates={datesWithPostings} 
                />
              </div>
              <div className="mb-8">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Type</label>
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value as any)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-cyan-500 outline-none"
                >
                    <option value="ALL">All Listings</option>
                    <option value={TicketType.OFFER}>Available Offerings</option>
                    <option value={TicketType.REQUEST}>Requests</option>
                 </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Class</label>
                <div className="space-y-3">
                    {Object.values(TrainClass).map(cls => (
                        <label key={cls} className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer group" title={cls}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedClasses.includes(cls) ? 'bg-cyan-500 border-cyan-500' : 'border-slate-700 bg-slate-950 group-hover:border-slate-500'}`}>
                                {selectedClasses.includes(cls) && <div className="w-2 h-2 bg-white rounded-sm" />}
                            </div>
                            <input type="checkbox" checked={selectedClasses.includes(cls)} onChange={() => toggleClass(cls)} className="hidden" />
                            {cls}
                        </label>
                    ))}
                </div>
              </div>
              <button 
                onClick={() => fetchTickets(true)} 
                disabled={isSyncing}
                className="w-full mt-6 py-2 bg-slate-800 text-xs font-bold text-slate-400 rounded-lg hover:text-white transition-colors border border-slate-700 flex items-center justify-center gap-2"
              >
                {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Refresh Listings
              </button>
           </div>
        </div>

        <div className="flex-1">
           <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-2">
                 <span className="text-sm text-slate-400 font-medium">Found <span className="text-white font-bold">{filteredTickets.length}</span> tickets</span>
                 {isSyncing && <Loader2 className="h-3 w-3 text-cyan-500 animate-spin" />}
               </div>
               <div className="flex items-center gap-2">
                   <ArrowDown className="h-4 w-4 text-slate-600" />
                   <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-transparent border-none text-sm text-cyan-400 font-bold cursor-pointer focus:ring-0">
                       <option value="DATE">Newest First</option>
                       <option value="PRICE_ASC">Price: Low to High</option>
                       <option value="PRICE_DESC">Price: High to Low</option>
                   </select>
               </div>
           </div>

           <div className="space-y-4">
            {isLoading ? (
                <><TicketSkeleton /><TicketSkeleton /><TicketSkeleton /></>
            ) : filteredTickets.length > 0 ? (
                filteredTickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} onDelete={handleDeleteTicket} matchType={getMatchType(ticket.id)} />
                ))
            ) : (
                <div className={`rounded-2xl p-16 text-center border ${!currentUser ? 'bg-slate-900/50 border-red-500/20 relative overflow-hidden' : 'bg-slate-900 border-slate-800 border-dashed'}`}>
                    {!currentUser && <div className="absolute inset-0 bg-red-500/5 backdrop-blur-[1px]"></div>}
                    <div className="relative z-10">
                        <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 border ${!currentUser ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-950 border-slate-800'}`}>
                            {!currentUser ? <Lock className="h-8 w-8 text-red-500" /> : <Search className="h-8 w-8 text-slate-700" />}
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-white">
                            {!currentUser ? 'Login Required to View More' : 'No tickets found'}
                        </h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                            {!currentUser ? "Please login to unlock full search capabilities." : "Try adjusting your filters or search query."}
                        </p>
                        {!currentUser && <button onClick={() => navigate('/login')} className="mt-6 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20">Login to Unlock</button>}
                        {currentUser && (searchQuery || (routeFrom || routeTo) || filterDate || filterType !== 'ALL' || selectedClasses.length > 0) && (
                            <button onClick={handleClearAll} className="mt-4 text-cyan-400 text-sm hover:underline">Clear All Filters</button>
                        )}
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
