import React from 'react';
import { GlobalEvent } from '../types';
import { Terminal } from 'lucide-react';

interface TerminalConsoleProps {
  logs: string[];
  activeEvent: GlobalEvent | null;
  eventHistory: GlobalEvent[];
  eventChancePercent: number;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({
  logs,
  activeEvent,
  eventHistory,
  eventChancePercent,
}) => {
  return (
    <div className="w-full h-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col font-mono text-xs shadow-2xl">
      {/* Terminal Titlebar */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-lime-400" />
          <span className="font-bold text-lime-400 text-xs tracking-wider">
            C:\TI_BATTLEGROUND\events.sys
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400">
            Risco de Evento: <strong className="text-amber-400">{Math.round(eventChancePercent)}%</strong>
          </span>
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
          </div>
        </div>
      </div>

      {/* Terminal Console Output Body */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-black/90 text-lime-400 min-h-[110px] max-h-[160px] scrollbar-thin scrollbar-thumb-slate-800">
        {/* Active Event Banner if present */}
        {activeEvent && (
          <div className="p-2 bg-lime-950/80 border border-lime-400/80 rounded shadow-[0_0_15px_rgba(163,230,53,0.3)] animate-pulse mb-2">
            <div className="flex items-center gap-2 font-black text-lime-300 text-sm">
              <span>&gt;&gt;</span>
              <span>{activeEvent.title}</span>
            </div>
            <p className="text-lime-200 text-xs mt-1 leading-relaxed">
              {activeEvent.description}
            </p>
          </div>
        )}

        {/* Historical Events (Dimmed color) */}
        {eventHistory.length > 0 && (
          <div className="space-y-1">
            {eventHistory.slice(-4).reverse().map((evt) => {
              const isActive = activeEvent && activeEvent.id === evt.id;
              if (isActive) return null; // already shown above
              return (
                <div key={evt.id} className="text-slate-500 text-[11px] leading-tight opacity-50 hover:opacity-100 transition-opacity">
                  <span className="text-slate-600">[{evt.timestamp}]</span> {evt.title} - {evt.description}
                </div>
              );
            })}
          </div>
        )}

        {/* General Action Logs */}
        {logs.length > 0 && (
          <div className="border-t border-slate-900 pt-1 space-y-0.5 text-[11px]">
            {logs.slice(-5).map((log, index) => (
              <div key={index} className="text-lime-500/90 flex items-start gap-1">
                <span className="text-lime-600 select-none">&gt;</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        )}

        {/* Active Prompt Cursor */}
        <div className="flex items-center gap-1 text-lime-400 text-xs pt-1">
          <span>C:\TI_BATTLEGROUND&gt;</span>
          <span className="w-2 h-3.5 bg-lime-400 inline-block animate-pulse" />
        </div>
      </div>
    </div>
  );
};
