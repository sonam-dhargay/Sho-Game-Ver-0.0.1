import React from 'react';

interface TutorialOverlayProps {
  step: number;
  onNext: () => void;
  onClose: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onClose }) => {
  const steps = [
    {
      title: "Welcome to Sho! ཤོ་རྩེད་ལ་རོལ་བར་ཕེབས་ཤོག།",
      text: "Sho is a traditional Tibetan race game. Your goal is to move all 9 of your coins from your Hand to the End of the spiral. ཤོ་ནི་བོད་ཀྱི་སྲོལ་རྒྱུན་གྱི་རྩེད་མོ་ཞིག་རེད། ཁྱེད་ཀྱི་དམིགས་ཡུལ་ནི་ལག་ཁྱི་ ༩ ཆར་ལ་རྒྱབ་པ་བྱེད་རྒྱུ་དེ་རེད།",
      action: "Next མུ་མཐུད"
    },
    {
      title: "Rolling the Dice ཤོ་རྒྱག་སྟངས།",
      text: "The game is played with two dice. Let's start the game! Click the 'ROLL DICE' button. རྩེད་མོ་འདི་ཤོ་གཉིས་ཀྱིས་རྩེ་དགོས། ད་འགོ་འཛུགས་དོ། 'ROLL DICE' ལ་ནོན།",
    },
    {
      title: "Smart Placement ལག་ཁྱི་འཇོག་སྟངས།",
      text: "Clicking 'From Hand' now automatically places your coins at the furthest valid position to give you a head start! ལག་ཁྱི་བཙུགས་པ་དང་དེ་མ་ཐག་འགྲོ་ས་ཡག་ཤོས་དེར་རང་བཞིན་གྱིས་སླེབས་ཀྱི་རེད།",
    },
    {
      title: "The Movement Pool ཤོ་མིག་གི་མཐུན་རྐྱེན།",
      text: "Dice results are stored as tiles in the sidebar. You can use them one by one or combine them for massive tactical jumps! ཤོ་མིག་རྣམས་རེ་རེ་བྱས་ནས་གཏོང་ཆོག་ལ་བསྡོམས་ནས་ཐག་རིང་པོར་མཆོང་ནའང་ཆོག",
      action: "Next མུ་མཐུད"
    },
    {
      title: "Tactical Combat འཐབ་ཇུས།",
      text: "Stacking: Land on your own pieces to move together and gain bonus rolls. Killing: Land on equal or smaller opponent stacks to send them back! བརྩེགས་སྟངས། རང་གི་ལག་ཁྱིའི་ཐོག་བབས་ན་བརྩེགས་ནས་ཤོ་ཐེངས་གཅིག་ཐོབ། གསོད་སྟངས། ཁ་གཏད་ལག་ཁྱིའི་ཐོག་བབས་ན་བསད་ནས་ལག་པར་སློག་ཆོག",
      action: "Next མུ་མཐུད"
    },
    {
      title: "Blocked Paths བགྲོད་ལམ་བཀག་པ།",
      text: "You cannot land on a larger opponent's stack. Attempting to do so will trigger a 'TOO LARGE' warning and a red pulse. རང་ལས་མང་བའི་ལག་ཁྱིའི་ཐོག་ཏུ་བབས་མི་ཆོག གལ་ཏེ་འགྲོ་ཐབས་བྱས་ན་'བཀག་'ཅེས་པའི་བརྡ་དམར་པོ་ཞིག་སྟོན་གྱི་རེད།",
      action: "Next མུ་མཐུད་པ།"
    },
    {
      title: "The Pa Ra Rule པ་རའི་སྒྲིག་གཞི།",
      text: "Rolling 1 and 1 (Pa Ra) adds a '2' bonus to your pool and lets you roll again immediately! པ་ར་བབས་ན་ཤོ་མིག་ '༢' ཁ་སྣོན་ཐོབ་པ་མ་ཟད་ཤོ་བསྐྱར་དུ་རྒྱག་ཆོག",
      action: "Finish མྱུར་ཁྲིད་མཇུག་བསྡུ་བའོ།"
    }
  ];

  const current = steps[step - 1];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col justify-end items-end p-4 md:p-10">
      <div className="bg-stone-900/95 border-2 border-amber-500 rounded-xl p-5 max-w-[320px] md:max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto relative animate-bounce-in backdrop-blur-md">
        <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-cinzel font-bold text-amber-400 leading-tight">{current.title}</h3>
            <button onClick={onClose} className="text-stone-500 hover:text-white font-bold uppercase text-[10px]">Skip</button>
        </div>
        <p className="text-stone-300 mb-5 text-xs md:text-sm leading-relaxed">{current.text}</p>
        <div className="flex justify-end">
            {current.action ? (
                <button 
                    onClick={step === steps.length ? onClose : onNext}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-5 rounded-lg uppercase tracking-widest text-[10px] shadow-lg shadow-amber-900/40 transition-colors"
                >
                    {current.action}
                </button>
            ) : (
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>
                    <span className="text-amber-500/80 text-[10px] font-bold uppercase tracking-widest animate-pulse">Waiting for action...</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};