import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PackageItem, CalculatePriceResponse } from '../../types/package';
import { photoboothApi } from '../../services/photoboothApi';
import { PackageCard } from '../../components/customer/PackageCard';
import { PriceSummary } from '../../components/customer/PriceSummary';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { KioskBackground } from '../../components/common/KioskBackground';
import { playButtonSound } from '../../services/soundEffects';

export interface PackageSelectionScreenProps {
  onBack: () => void;
  onProceed: (pkg: PackageItem) => void;
  isLoading?: boolean;
}

export const PackageSelectionScreen: React.FC<PackageSelectionScreenProps> = ({
  onBack,
  onProceed,
  isLoading = false,
}) => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<PackageItem | null>(null);
  const [calculation, setCalculation] = useState<CalculatePriceResponse | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(true);

  useEffect(() => {
    const loadPackages = async () => {
      setIsFetching(true);
      try {
        const res = await photoboothApi.getPackages();
        if (res.success && res.data.length > 0) {
          setPackages(res.data);
          // Default select the popular package (or first)
          const def = res.data.find((p) => p.badge?.includes('Populer')) || res.data[0];
          setSelectedPkg(def);
          fetchPrice(def.id, 0);
        }
      } finally {
        setIsFetching(false);
      }
    };

    loadPackages();
  }, []);

  const fetchPrice = async (packageId: string, additionalPrints: number) => {
    const res = await photoboothApi.calculatePrice({ packageId, additionalPrints });
    if (res.success) {
      setCalculation(res.data);
    }
  };

  const handleSelectPackage = (pkg: PackageItem) => {
    playButtonSound('secondary');
    setSelectedPkg(pkg);
    fetchPrice(pkg.id, 0);
  };

  if (isFetching) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="xl" label="Memuat Pilihan Paket..." />
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen flex flex-col justify-between p-10 select-none bg-background overflow-hidden">
      {/* Dynamic Background */}
      {/* Dynamic Background */}
      <KioskBackground />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between pb-4 border-b border-white/10 max-w-6xl mx-auto w-full">
        <Button
          variant="ghost"
          size="md"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-5 h-5" />}
        >
          Kembali
        </Button>

        <div className="text-center">
          <h2 className="text-3xl font-black text-white tracking-tight">
            Pilih Paket Photobooth
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tentukan durasi sesi dan kuota lembar cetak foto yang Anda inginkan
          </p>
        </div>

        <div className="w-24" /> {/* Spacer */}
      </div>

      {/* Package Cards Grid */}
      <div className="relative z-10 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 my-auto">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            isSelected={selectedPkg?.id === pkg.id}
            onSelect={handleSelectPackage}
          />
        ))}
      </div>

      {/* Bottom Bar: Price Summary & Proceed CTA */}
      <div className="relative z-10 flex items-center justify-between pt-6 border-t border-white/10 max-w-6xl mx-auto w-full">
        <div className="flex-1 max-w-md">
          {calculation && <PriceSummary calculation={calculation} />}
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="gold"
            size="xl"
            disabled={!selectedPkg || isLoading}
            isLoading={isLoading}
            onClick={() => selectedPkg && onProceed(selectedPkg)}
            rightIcon={<ArrowRight className="w-6 h-6 stroke-[2.5]" />}
            className="px-12 py-5 text-xl font-bold shadow-glow-primary"
          >
            Lanjut ke Pembayaran QRIS
          </Button>
        </div>
      </div>
    </div>
  );
};
