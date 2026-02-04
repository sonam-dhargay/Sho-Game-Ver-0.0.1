
import React from 'react';
import { T } from '../translations';

interface TutorialOverlayProps {
  step: number;
  onNext: () => void;
  onClose: () => void;
  isDarkMode: boolean;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onClose, isDarkMode }) => {
  const steps = T.tutorial.steps;
  const current = steps[step - 1];
  
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none flex flex-col justify-end items-end p-4 md:p-10">
      <div className={`${isDarkMode ? 'bg-stone-900/95 border-amber-500' : 'bg-white/95 border-amber-600'} border-2 rounded-[2rem] p-6 max-w-[340px] md:max-w-md w-full shadow-[0_30px_70px_rgba(0,0,0,0.7)] pointer-events-auto relative animate-in slide-in-from-bottom-10 fade-in duration-500 backdrop-blur-xl`}>
        <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col">
              <h3 className={`text-xl font-cinzel font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-700'} leading-tight`}>{current.title.en}</h3>
              <span className={`text-sm font-serif ${isDarkMode ? 'text-amber-600' : 'text-amber-800'} mt-1`}>{current.title.bo}</span>
            </div>
            <button onClick={onClose} className={`${isDarkMode ? 'bg-stone-800 text-stone-500 hover:text-white' : 'bg-stone-100 text-stone-400 hover:text-stone-900'} font-bold uppercase text-[10px] px-2 py-1 rounded-md transition-colors`}>Skip</button>
        </div>
        
        <div className="space-y-3 mb-6">
          <p className={`${isDarkMode ? 'text-stone-200' : 'text-stone-800'} text-sm leading-relaxed font-medium`}>{current.text.en}</p>
          <p className={`${isDarkMode ? 'text-stone-400' : 'text-stone-500'} text-sm leading-relaxed font-serif`}>{current.text.bo}</p>
        </div>

        <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-stone-800' : 'border-stone-200'}`}>
            {current.action ? (
                <button 
                    onClick={step === steps.length ? onClose : onNext}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-8 rounded-xl uppercase tracking-widest text-[11px] shadow-lg shadow-amber-900/40 transition-all active:scale-95 flex flex-col items-center"
                >
                    <span className="leading-none">{current.action.en}</span>
                    <span className="text-[10px] font-serif leading-none mt-1 opacity-80">{current.action.bo}</span>
                </button>
            ) : (
                <div className={`flex items-center gap-3 px-4 py-2 ${isDarkMode ? 'bg-amber-950/30 border-amber-600/20' : 'bg-amber-50 border-amber-200'} rounded-lg border`}>
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
                    <span className="text-amber-600 text-[10px] font-bold uppercase tracking-widest animate-pulse">Waiting... སྒུག་བཞུགས།</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
