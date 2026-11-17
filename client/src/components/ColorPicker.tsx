import React from 'react';
import { PRESET_COLORS } from '../types/shared';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  selectedColor: string;
  takenColors: string[];
  onSelect: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  takenColors,
  onSelect,
}) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-slate-300 mb-2">
        Scegli il colore della tua squadra (univoco)
      </label>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {PRESET_COLORS.map((color: string) => {
          const isTaken = takenColors.includes(color) && color !== selectedColor;
          const isSelected = color === selectedColor;

          return (
            <button
              key={color}
              type="button"
              disabled={isTaken}
              onClick={() => onSelect(color)}
              className={`relative h-12 rounded-xl flex items-center justify-center transition-all transform active:scale-95 ${
                isSelected
                  ? 'ring-4 ring-white shadow-lg scale-105'
                  : isTaken
                  ? 'opacity-25 cursor-not-allowed saturate-50'
                  : 'hover:scale-102 hover:opacity-90'
              }`}
              style={{ backgroundColor: color }}
              title={isTaken ? 'Colore già occupato' : color}
            >
              {isSelected && (
                <Check className="w-6 h-6 text-white drop-shadow-md stroke-[3]" />
              )}
              {isTaken && (
                <span className="text-xs text-white/80 font-bold">Preso</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
