import React from 'react';
import { Button } from './ui';
import { XIcon } from './icons';
import type { SizeChartDefinition } from '../utils/sizeSystem';

interface SizeChartModalProps {
  chart: SizeChartDefinition;
  onClose: () => void;
}

export const SizeChartModal: React.FC<SizeChartModalProps> = ({ chart, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-brand-surface rounded-2xl shadow-2xl w-full max-w-3xl p-5 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          aria-label="Close size guide"
        >
          <XIcon className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-brand-primary mb-3">{chart.label}</h2>

        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20">
          <img
            src={chart.imageUrl}
            alt={chart.label}
            className="w-full h-auto object-contain"
            loading="lazy"
          />
        </div>

        <div className="mt-4 flex justify-center">
          <Button onClick={onClose} className="px-10 min-w-[140px]">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
