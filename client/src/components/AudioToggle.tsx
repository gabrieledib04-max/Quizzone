import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../services/audio';

export const AudioToggle: React.FC = () => {
  const [enabled, setEnabled] = useState(soundManager.isEnabled());

  const toggle = () => {
    soundManager.enableAudio();
    const newState = !enabled;
    soundManager.setSoundEnabled(newState);
    setEnabled(newState);
    if (newState) {
      soundManager.playTick();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all active:scale-90"
      title={enabled ? 'Silenzia effetti sonori' : 'Attiva effetti sonori'}
    >
      {enabled ? (
        <Volume2 className="w-5 h-5 text-indigo-400" />
      ) : (
        <VolumeX className="w-5 h-5 text-slate-500" />
      )}
    </button>
  );
};
