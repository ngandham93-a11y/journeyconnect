
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string[]; // Updated to array for multi-select
  onChange: (dates: string[]) => void;
  availableDates?: Set<string>;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value = [], onChange, availableDates = new Set() }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Boundaries: Today to 3 months from now
  const { today, maxDate, minDateStr, maxDateStr } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const max = new Date(now);
    max.setMonth(now.getMonth() + 3);
    
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      today: now,
      maxDate: max,
      minDateStr: formatDate(now),
      maxDateStr: formatDate(max)
    };
  }, []);

  const [viewDate, setViewDate] = useState(() => {
    if (value && value.length > 0) {
      const d = new Date(value[0]);
      return isNaN(d.getTime()) ? new Date(today) : d;
    }
    return new Date(today);
  });

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const canGoPrev = useMemo(() => {
    const firstOfCurrent = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const firstOfMin = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstOfCurrent > firstOfMin;
  }, [viewDate, today]);

  const canGoNext = useMemo(() => {
    const firstOfNext = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    const firstOfMax = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    return firstOfNext <= firstOfMax;
  }, [viewDate, maxDate]);

  const handlePrevMonth = () => {
    if (canGoPrev) {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (canGoNext) {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    }
  };

  const formatDateLocal = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const handleDateSelect = (day: number, isDisabled: boolean) => {
    if (isDisabled) return;
    const dateStr = formatDateLocal(viewDate.getFullYear(), viewDate.getMonth(), day);
    
    // Toggle logic for multi-select
    if (value.includes(dateStr)) {
        onChange(value.filter(d => d !== dateStr));
    } else {
        onChange([...value, dateStr]);
    }
  };

  const renderDays = () => {
    const days = [];
    const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const startDay = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`pad-${i}`} className="h-9 w-9" />);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = formatDateLocal(viewDate.getFullYear(), viewDate.getMonth(), d);
      const isOutOfRange = dateStr < minDateStr || dateStr > maxDateStr;
      const posting = availableDates.has(dateStr);
      const selected = value.includes(dateStr);
      const isCurrentDay = formatDateLocal(today.getFullYear(), today.getMonth(), today.getDate()) === dateStr;

      days.push(
        <button
          key={d}
          type="button"
          disabled={isOutOfRange}
          onClick={() => handleDateSelect(d, isOutOfRange)}
          className={`h-9 w-9 flex items-center justify-center rounded-lg text-sm transition-all relative group
            ${selected ? 'bg-cyan-500 text-white font-bold' : isOutOfRange ? 'text-slate-700 cursor-not-allowed' : 'hover:bg-slate-800 text-slate-300'}
            ${posting && !selected && !isOutOfRange ? 'text-emerald-400 font-black' : ''}
            ${isCurrentDay && !selected ? 'border border-cyan-500/50' : ''}
          `}
        >
          {d}
          {posting && !selected && !isOutOfRange && (
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full"></span>
          )}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus-within:border-cyan-500 transition-all flex items-center justify-between cursor-pointer group"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <CalendarIcon className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 shrink-0" />
          <span className={value.length > 0 ? 'text-white font-medium' : 'text-slate-600'}>
            {value.length === 0 ? 'Select Dates' : 
             value.length === 1 ? value[0] : 
             `${value.length} dates selected`}
          </span>
        </div>
        {value.length > 0 && (
          <X 
            className="h-4 w-4 text-slate-500 hover:text-white shrink-0" 
            onClick={(e) => { e.stopPropagation(); onChange([]); }} 
          />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-[60] mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 w-72 animate-fade-in left-0 md:left-auto md:right-0">
          <div className="flex items-center justify-between mb-4">
            <button 
              type="button" 
              onClick={handlePrevMonth} 
              disabled={!canGoPrev}
              className={`p-1 rounded-full transition-colors ${canGoPrev ? 'hover:bg-slate-800 text-slate-400' : 'text-slate-800 cursor-not-allowed'}`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h4 className="text-white font-bold text-sm">
              {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h4>
            <button 
              type="button" 
              onClick={handleNextMonth} 
              disabled={!canGoNext}
              className={`p-1 rounded-full transition-colors ${canGoNext ? 'hover:bg-slate-800 text-slate-400' : 'text-slate-800 cursor-not-allowed'}`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="h-8 w-8 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderDays()}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-4">
             <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Has Postings</span>
             </div>
             {value.length > 0 && (
                <button 
                  onClick={() => onChange([])}
                  className="text-[10px] text-cyan-400 font-black uppercase hover:text-cyan-300"
                >
                  Clear All
                </button>
             )}
          </div>
        </div>
      )}
    </div>
  );
};
