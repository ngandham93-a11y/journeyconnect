
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TrainFront, PlusCircle, LogIn, LogOut, Shield } from 'lucide-react';
import { getCurrentUser, logout } from '../services/authService';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    navigate('/login'); 
  };

  const isActive = (path: string) => location.pathname === path 
    ? 'text-cyan-400 bg-cyan-950/30 border-cyan-500/20' 
    : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-900 border-transparent';

  const handleLogoClick = () => {
    // Dispatch a custom event that Home.tsx will listen for to reset filters
    window.dispatchEvent(new CustomEvent('reset-filters'));
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <Link 
            to="/" 
            onClick={handleLogoClick}
            className="flex items-center gap-3 group"
          >
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-cyan-900/20">
              <TrainFront className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white group-hover:text-cyan-400 transition-colors">
              Journey<span className="text-cyan-400">Connect</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            
            {user && (
              <Link 
                to="/give" 
                className={`p-2.5 rounded-xl border transition-all duration-300 flex items-center justify-center font-bold text-sm ${isActive('/give')}`}
                title="Give Up Ticket"
              >
                <div className="relative">
                   <PlusCircle className="h-5 w-5 text-red-500 animate-pulse" />
                   <div className="absolute inset-0 bg-red-500/50 rounded-full blur-[6px] animate-pulse"></div>
                </div>
              </Link>
            )}

            <div className="h-6 w-px bg-slate-800 mx-2"></div>

            {user ? (
              <div className="flex items-center gap-4">
                 <div className="flex flex-col items-end group">
                    <span className="text-sm font-bold text-white flex items-center gap-1 group-hover:text-cyan-400 transition-colors">
                      {user.role === 'ADMIN' && <Shield className="h-3 w-3 text-emerald-400" />}
                      {user.name}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{user.role}</span>
                 </div>
                 <button 
                   onClick={handleLogout}
                   className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                   title="Logout"
                 >
                   <LogOut className="h-5 w-5" />
                 </button>
              </div>
            ) : (
              <Link to="/login" className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-lg border border-slate-700 hover:bg-slate-800 transition-all flex items-center gap-2 text-sm">
                <LogIn className="h-4 w-4" />
                Login
              </Link>
            )}
          </nav>

          {/* Mobile Nav */}
          <div className="md:hidden flex items-center gap-3">
             {user && (
                <Link 
                  to="/give" 
                  className="flex items-center gap-2 bg-slate-900/50 border border-slate-700/50 px-3 py-2 rounded-xl active:scale-95 transition-all"
                  title="Give Up Ticket"
                >
                  <div className="relative">
                     <PlusCircle className="h-6 w-6 text-red-500 animate-pulse" />
                     <div className="absolute inset-0 bg-red-500/50 rounded-full blur-[8px] animate-pulse"></div>
                  </div>
                </Link>
             )}

             {!user ? (
                <Link to="/login" className="p-2 text-slate-400 hover:text-white transition-colors">
                  <LogIn className="h-6 w-6" />
                </Link>
             ) : (
                <button 
                   onClick={handleLogout}
                   className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                 >
                   <LogOut className="h-6 w-6" />
               </button>
             )}
          </div>
        </div>
      </div>
    </header>
  );
};
