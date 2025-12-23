
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { Lock, Phone, Loader2, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Ref for the phone number input
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    phoneInputRef.current?.focus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (pin.length !== 4) {
        setError('PIN must be 4 digits.');
        setLoading(false);
        return;
    }

    const user = await login(phone, pin);
    if (user) {
        navigate('/');
    } else {
        setError('Access Denied. Incorrect Number or PIN (or check your internet).');
        setLoading(false);
    }
  };

  const handlePhoneChange = (val: string) => {
    const numeric = val.replace(/\D/g, '').slice(0, 10);
    setPhone(numeric);
  };

  const handlePinChange = (val: string) => {
    const numeric = val.replace(/\D/g, '').slice(0, 4);
    setPin(numeric);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px] -z-10"></div>

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white mb-2">Private Access</h1>
            <p className="text-slate-400 text-sm">Enter your assigned credentials</p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center font-bold">
                {error}
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Registered Phone Number</label>
                <div className="relative">
                    <Phone className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                    <input 
                        ref={phoneInputRef}
                        type="tel" 
                        inputMode="numeric"
                        required
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="9876543210"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all outline-none"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">4-Digit PIN</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                    <input 
                        type="password"
                        inputMode="numeric" 
                        required
                        value={pin}
                        onChange={(e) => handlePinChange(e.target.value)}
                        placeholder="****"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all outline-none tracking-widest text-lg"
                    />
                </div>
            </div>

            <button 
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                    <>
                        Login <ArrowRight className="h-4 w-4" />
                    </>
                )}
            </button>
        </form>

        <div className="mt-8 text-center pt-8 border-t border-slate-800">
            <p className="text-slate-600 text-xs">
                This is a private platform. Contact the administrator if you have lost your PIN.
            </p>
        </div>
      </div>
    </div>
  );
};
