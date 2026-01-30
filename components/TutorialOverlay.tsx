import React from 'react';
import { T } from '../translations';

interface TutorialOverlayProps {
  step: number;
  onNext: () => void;
  onClose: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onClose }) => {
  const steps = T.tutorial.steps;
  const current = steps[step - 1];
  
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none flex flex-col justify-end items-end p-4 md:p-10">
      <div className="bg-stone-900/95 border-2 border-amber-500 rounded-[2rem] p-6 max-w-[340px] md:max-w-md w-full shadow-[0_30px_70px_rgba(0,0,0,0.7)] pointer-events-auto relative animate-in slide-in-from-bottom-10 fade-in duration-500 backdrop-blur-xl">
        <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col">
              <h3 className="text-xl font-cinzel font-bold text-amber-400 leading-tight">{current.title.en}</h3>
              <span className="text-sm font-serif text-amber-600 mt-1">{current.title.bo}</span>
            </div>
            <button onClick={onClose} className="text-stone-500 hover:text-white font-bold uppercase text-[10px] bg-stone-800 px-2 py-1 rounded-md transition-colors">Skip</button>
        </div>
        
        <div className="space-y-3 mb-6">
          <p className="text-stone-200 text-sm leading-relaxed font-medium">{current.text.en}</p>
          <p className="text-stone-400 text-sm leading-relaxed font-serif">{current.text.bo}</p>
        </div>

        <div className="flex justify-end pt-2 border-t border-stone-800">
            {current.action ? (
                <button 
                    onClick={step === steps.length ? onClose : onNext}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-8 rounded-xl uppercase tracking-widest text-[11px] shadow-lg shadow-amber-900/40 transition-all active:scale-95 flex flex-col items-center"
                >
                    <span className="leading-none">{current.action.en}</span>
                    <span className="text-[10px] font-serif leading-none mt-1 opacity-80">{current.action.bo}</span>
                </button>
            ) : (
                <div className="flex items-center gap-3 px-4 py-2 bg-amber-950/30 rounded-lg border border-amber-600/20">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
                    <span className="text-amber-500/80 text-[10px] font-bold uppercase tracking-widest animate-pulse">Waiting for action... སྒུག་བཞུགས།</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};