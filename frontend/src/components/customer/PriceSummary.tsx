import React from 'react';
import { CalculatePriceResponse } from '../../types/package';

export interface PriceSummaryProps {
  calculation: CalculatePriceResponse;
  className?: string;
}

export const PriceSummary: React.FC<PriceSummaryProps> = ({
  calculation,
  className = '',
}) => {
  const formatPrice = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className={`glass-panel rounded-3xl p-6 ${className}`}>
      <h4 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/10">
        Ringkasan Biaya
      </h4>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>{calculation.packageName} (Harga Dasar)</span>
          <span className="font-semibold text-white">
            {formatPrice(calculation.basePrice)}
          </span>
        </div>

        {calculation.additionalPrints > 0 && (
          <div className="flex justify-between text-slate-300">
            <span>
              Cetak Ekstra ({calculation.additionalPrints} ×{' '}
              {formatPrice(calculation.additionalPrintUnitPrice)})
            </span>
            <span className="font-semibold text-white">
              +{formatPrice(calculation.additionalPrintTotal)}
            </span>
          </div>
        )}

        {calculation.discountAmount > 0 && (
          <div className="flex justify-between text-emerald-400">
            <span>Diskon Promosi</span>
            <span className="font-semibold">
              -{formatPrice(calculation.discountAmount)}
            </span>
          </div>
        )}

        <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
          <span className="text-base font-bold text-slate-200">Total Pembayaran</span>
          <span className="text-2xl font-black text-amber-400">
            {formatPrice(calculation.grossAmount)}
          </span>
        </div>
      </div>
    </div>
  );
};
