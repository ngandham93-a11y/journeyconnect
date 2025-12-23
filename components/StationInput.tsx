import React, { useState, useEffect, useRef } from 'react';
import { INDIAN_STATIONS } from '../utils/constants';
import { MapPin } from 'lucide-react';

interface StationInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const StationInput: React.FC<StationInputProps> = ({ label, value, onChange, placeholder, required }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    
    if (val.length > 0) {
      const filtered = INDIAN_STATIONS.filter(station => 
        station.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleFocus = () => {
    if (value && value.length > 0) {
      const filtered = INDIAN_STATIONS.filter(station => 
        station.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    }
  };

  const handleSelect = (station: string) => {
    onChange(station);
    setShowSuggestions(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</label>
      <div className="relative">
        <MapPin className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
        <input 
            type="text" 
            required={required}
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all outline-none"
        />
      </div>
      
      {showSuggestions && value.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
            {suggestions.length > 0 ? (
                suggestions.map((station) => (
                    <div 
                        key={station}
                        onClick={() => handleSelect(station)}
                        className="px-4 py-3 text-sm text-slate-300 hover:bg-cyan-900/20 hover:text-cyan-400 cursor-pointer border-b border-slate-800/50 last:border-0"
                    >
                        {station}
                    </div>
                ))
            ) : (
                <div className="px-4 py-3 text-sm text-slate-500 italic text-center">
                    No matching stations found
                </div>
            )}
        </div>
      )}
    </div>
  );
};