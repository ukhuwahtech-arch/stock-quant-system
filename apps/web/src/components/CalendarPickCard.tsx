"use client";

interface WeekDay {
  label: string;
  date: string;
  displaySub: string;
}

interface CalendarPickCardProps {
  availableYears: number[];
  weekYear: number;
  onYearChange: (year: number) => void;
  selectedMonthIndex: number;
  onMonthChange: (monthIndex: number) => void;
  monthWeeks: WeekDay[][];
  selectedWeekIndex: number;
  activeDayTab: string;
  onDayChange: (dateStr: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function CalendarPickCard({
  availableYears,
  weekYear,
  onYearChange,
  selectedMonthIndex,
  onMonthChange,
  monthWeeks,
  selectedWeekIndex,
  activeDayTab,
  onDayChange,
  onPrevWeek,
  onNextWeek,
}: CalendarPickCardProps) {
  const currentWeekDays = monthWeeks[selectedWeekIndex] || monthWeeks[0] || [];

  return (
    <div className="flex flex-col gap-3 mb-6 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/80">
      {/* Top bar: Years and Months */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-3 border-b border-zinc-800/60">
        {/* Years */}
        <div className="flex items-center gap-1 shrink-0">
          {availableYears.map((y) => (
            <button
              key={y}
              onClick={() => onYearChange(y)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                weekYear === y
                  ? "bg-emerald-500 text-zinc-950 shadow"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Months */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {MONTH_NAMES.map((name, idx) => {
            const isSelected = selectedMonthIndex === idx;
            return (
              <button
                key={name}
                onClick={() => onMonthChange(idx)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom bar: Prev Week (<), Mon-Fri Day Cards, Next Week (>) */}
      <div className="flex items-center gap-3">
        {/* Previous Week Button */}
        <button
          onClick={onPrevWeek}
          title="Previous Week"
          className="w-10 h-14 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold text-base transition-all cursor-pointer border border-zinc-700/80 shrink-0 shadow"
        >
          &lt;
        </button>

        {/* Week Days Grid */}
        <div className="grid grid-cols-5 gap-2 flex-1">
          {currentWeekDays.map((tab) => {
            const isActive = activeDayTab === tab.date;
            return (
              <button
                key={tab.date}
                onClick={() => onDayChange(tab.date)}
                className={`flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-all cursor-pointer w-full text-center ${
                  isActive
                    ? "bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                <span className="text-xs font-semibold leading-tight">{tab.label}</span>
                <span className={`text-[10px] mt-1 leading-tight ${isActive ? "text-zinc-900 font-medium" : "text-zinc-500"}`}>
                  {tab.displaySub}
                </span>
              </button>
            );
          })}
        </div>

        {/* Next Week Button */}
        <button
          onClick={onNextWeek}
          title="Next Week"
          className="w-10 h-14 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold text-base transition-all cursor-pointer border border-zinc-700/80 shrink-0 shadow"
        >
          &gt;
        </button>
      </div>
    </div>
  );
}