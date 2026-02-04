
import React, { useState } from 'react';
import { T } from '../translations';

interface MenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isNinerMode: boolean;
  onToggleNinerMode: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

type MenuPage = 'MAIN' | 'ABOUT' | 'SETTINGS';

export const MenuOverlay: React.FC<MenuOverlayProps> = ({ 
  isOpen, 
  onClose, 
  isNinerMode, 
  onToggleNinerMode,
  isDarkMode,
  onToggleTheme
}) => {
  const [activePage, setActivePage] = useState<MenuPage>('MAIN');

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activePage) {
      case 'ABOUT':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <header className="flex items-center gap-4 mb-8">
              <button onClick={() => { setActivePage('MAIN'); }} className="text-amber-500 text-2xl">←</button>
              <h2 className={`text-2xl font-cinzel ${isDarkMode ? 'text-amber-500' : 'text-amber-700'} font-bold`}>{T.menu.about.en} <span className="font-serif ml-2">{T.menu.about.bo}</span></h2>
            </header>
            <div className="flex flex-col items-center gap-6 text-center">
              <div className={`w-24 h-24 ${isDarkMode ? 'bg-amber-600/20 border-amber-600/50' : 'bg-amber-100 border-amber-300'} rounded-full flex items-center justify-center border-2 shadow-[0_0_30px_rgba(217,119,6,0.3)]`}>
                <span className="text-4xl">🏔️</span>
              </div>
              <div className="space-y-2">
                <h3 className={`text-xl font-cinzel ${isDarkMode ? 'text-white' : 'text-stone-900'} font-bold`}>{T.menu.developedBy.en}</h3>
                <p className="text-stone-500 font-serif">{T.menu.developedBy.bo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-stone-400 text-sm font-medium">{T.menu.copyright.en}</p>
                <p className="text-stone-500 text-xs font-serif">{T.menu.copyright.bo}</p>
              </div>
              
              <div className={`mt-4 pt-6 border-t ${isDarkMode ? 'border-stone-800' : 'border-stone-200'} w-full`}>
                <p className="text-stone-400 text-xs italic leading-relaxed px-4">"{T.menu.thanks.en}"</p>
                <p className="text-stone-500 text-[11px] font-serif mt-2 leading-relaxed px-4">{T.menu.thanks.bo}</p>
              </div>
            </div>
          </div>
        );
      case 'SETTINGS':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <header className="flex items-center gap-4 mb-8">
              <button onClick={() => setActivePage('MAIN')} className="text-amber-500 text-2xl">←</button>
              <h2 className={`text-2xl font-cinzel ${isDarkMode ? 'text-amber-500' : 'text-amber-700'} font-bold`}>{T.menu.settings.en} <span className="font-serif ml-2">{T.menu.settings.bo}</span></h2>
            </header>
            <div className="space-y-6">
              <section className={`${isDarkMode ? 'bg-stone-800/40 border-stone-700' : 'bg-stone-100 border-stone-200'} p-5 rounded-2xl border`}>
                <h3 className="text-amber-600 font-cinzel text-xs uppercase tracking-widest font-bold mb-4">
                  {T.menu.themes.en} <span className="font-serif ml-2">{T.menu.themes.bo}</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={() => { if (isDarkMode) onToggleTheme(); }}
                     className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${!isDarkMode ? 'bg-amber-600/20 border-amber-500 text-amber-600' : 'bg-black/20 border-stone-800 text-stone-500 hover:border-stone-600'}`}
                   >
                     <span className="text-xs font-bold uppercase tracking-widest">{T.menu.lightMode.en}</span>
                     <span className="text-[10px] font-serif">{T.menu.lightMode.bo}</span>
                   </button>
                   <button 
                     onClick={() => { if (!isDarkMode) onToggleTheme(); }}
                     className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${isDarkMode ? 'bg-amber-600/20 border-amber-500 text-amber-500' : 'bg-black/20 border-stone-200 text-stone-400 hover:border-stone-300'}`}
                   >
                     <span className="text-xs font-bold uppercase tracking-widest">{T.menu.darkMode.en}</span>
                     <span className="text-[10px] font-serif">{T.menu.darkMode.bo}</span>
                   </button>
                </div>
              </section>

              <section className={`${isDarkMode ? 'bg-stone-800/40 border-stone-700' : 'bg-stone-100 border-stone-200'} p-5 rounded-2xl border`}>
                <h3 className="text-amber-600 font-cinzel text-xs uppercase tracking-widest font-bold mb-4">
                  {T.menu.gameVariant.en} <span className="font-serif ml-2">{T.menu.gameVariant.bo}</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={() => { if (!isNinerMode) onToggleNinerMode(); }}
                     className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${isNinerMode ? 'bg-amber-600/20 border-amber-500 text-amber-500' : 'bg-black/20 border-stone-800 text-stone-500 hover:border-stone-600'}`}
                   >
                     <span className="text-xs font-bold uppercase tracking-widest">{T.menu.niner.en}</span>
                     <span className="text-[10px] font-serif">{T.menu.niner.bo}</span>
                   </button>
                   <button 
                     onClick={() => { if (isNinerMode) onToggleNinerMode(); }}
                     className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${!isNinerMode ? 'bg-amber-600/20 border-amber-500 text-amber-600' : 'bg-black/20 border-stone-800 text-stone-500 hover:border-stone-600'}`}
                   >
                     <span className="text-xs font-bold uppercase tracking-widest">{T.menu.noNiner.en}</span>
                     <span className="text-[10px] font-serif">{T.menu.noNiner.bo}</span>
                   </button>
                </div>
              </section>

              <div className={`text-center ${isDarkMode ? 'text-stone-700' : 'text-stone-400'} text-[10px] uppercase font-bold tracking-[0.2em] mt-8`}>Version 1.0.6-LUNGTA</div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <h2 className={`text-3xl font-cinzel ${isDarkMode ? 'text-amber-500' : 'text-amber-700'} font-bold mb-10 text-center tracking-widest`}>{T.common.menu.en} <span className="font-serif ml-4">{T.common.menu.bo}</span></h2>
            <button 
              onClick={() => setActivePage('ABOUT')}
              className={`w-full py-5 ${isDarkMode ? 'bg-stone-800/50 hover:bg-stone-800 border-stone-700' : 'bg-stone-100 hover:bg-stone-200 border-stone-200'} border hover:border-amber-600 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 group`}
            >
              <span className={`font-cinzel text-lg ${isDarkMode ? 'text-stone-200 group-hover:text-amber-400' : 'text-stone-700 group-hover:text-amber-600'} font-bold tracking-widest`}>{T.menu.about.en}</span>
              <span className="font-serif text-sm text-stone-500 mt-1">{T.menu.about.bo}</span>
            </button>
            <button 
              onClick={() => setActivePage('SETTINGS')}
              className={`w-full py-5 ${isDarkMode ? 'bg-stone-800/50 hover:bg-stone-800 border-stone-700' : 'bg-stone-100 hover:bg-stone-200 border-stone-200'} border hover:border-amber-600 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 group`}
            >
              <span className={`font-cinzel text-lg ${isDarkMode ? 'text-stone-200 group-hover:text-amber-400' : 'text-stone-700 group-hover:text-amber-600'} font-bold tracking-widest`}>{T.menu.settings.en}</span>
              <span className="font-serif text-sm text-stone-500 mt-1">{T.menu.settings.bo}</span>
            </button>
            <div className="pt-8">
              <button 
                onClick={onClose}
                className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold rounded-2xl shadow-lg transition-all active:scale-95"
              >
                {T.common.close.en} <span className="font-serif ml-2">{T.common.close.bo}</span>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className={`${isDarkMode ? 'bg-stone-900 border-amber-600/30' : 'bg-stone-50 border-amber-800/20'} border-2 p-8 md:p-12 rounded-[3.5rem] w-full max-w-md shadow-[0_0_100px_rgba(0,0,0,0.9)] relative`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className={`absolute top-8 right-8 ${isDarkMode ? 'text-stone-500 hover:text-white' : 'text-stone-400 hover:text-stone-900'} text-2xl transition-colors`}
        >
          ×
        </button>
        {renderContent()}
      </div>
    </div>
  );
};
