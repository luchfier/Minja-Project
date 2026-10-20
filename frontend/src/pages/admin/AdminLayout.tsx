import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Palette,
  Package,
  LayoutTemplate,
  Printer,
  FileSpreadsheet,
  ShieldCheck,
  LogOut,
  Camera,
  CheckCircle2,
  Clock,
  Sparkles,
  Power,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { AdminDashboardPage } from './AdminDashboardPage';
import { BrandingSettingsPage } from './BrandingSettingsPage';
import { PackageManagementPage } from './PackageManagementPage';
import { TemplateManagementPage } from './TemplateManagementPage';
import { HardwareSettingsPage } from './HardwareSettingsPage';
import { FinancialReportPage } from './FinancialReportPage';
import { SystemDiagnosticPage } from './SystemDiagnosticPage';
import { VoucherManagementPage } from './VoucherManagementPage';
import { CashDeskPage } from './CashDeskPage';
import { TicketPercent, Banknote } from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'cashdesk'
  | 'vouchers'
  | 'branding'
  | 'packages'
  | 'templates'
  | 'hardware'
  | 'reports'
  | 'diagnostics';

interface AdminLayoutProps {
  token: string;
  onExitToKiosk: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ token, onExitToKiosk }) => {
  const { branding } = useTheme();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard' as AdminTab, label: 'Ringkasan & Analitik', icon: LayoutDashboard, badge: 'Live' },
    { id: 'cashdesk' as AdminTab, label: 'Kasir & Konfirmasi Tunai', icon: Banknote, badge: 'Segera Hadir' },
    { id: 'vouchers' as AdminTab, label: 'Manajemen Voucher', icon: TicketPercent },
    { id: 'packages' as AdminTab, label: 'Kelola Paket Harga', icon: Package },
    { id: 'templates' as AdminTab, label: 'Template & Frame Cetak', icon: LayoutTemplate },
    { id: 'hardware' as AdminTab, label: 'Hardware & Kalibrasi', icon: Printer },
    { id: 'reports' as AdminTab, label: 'Laporan Keuangan', icon: FileSpreadsheet },
    { id: 'branding' as AdminTab, label: 'Tampilan & Tema', icon: Palette },
    { id: 'diagnostics' as AdminTab, label: 'Keamanan & Sistem', icon: ShieldCheck },
  ];

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0A0D14] text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header Bar */}
      <header className="h-16 px-6 bg-[#0E131F]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-glow-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-wide text-white">
                {branding.boothName || 'MinjaPhotobooth'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Admin Studio Console
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Panel Konfigurasi Sistem & Hardware Kiosk
            </p>
          </div>
        </div>

        {/* Status Indicators & Clock */}
        <div className="flex items-center gap-6">
          {/* Hardware Quick Status */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">Kamera</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="w-[1px] h-3 bg-white/15" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px]">Printer</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="w-[1px] h-3 bg-white/15" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">QRIS Online</span>
            </div>
          </div>

          {/* Clock */}
          <div className="flex items-center gap-2 text-slate-300 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentTime || '--:--:--'}</span>
          </div>

          {/* Exit to Kiosk Button */}
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Kembali ke Kiosk</span>
          </button>

          {/* Electron Native Shutdown Button */}
          {typeof window !== 'undefined' && window.electronKiosk?.isElectron && (
            <button
              onClick={() => {
                if (window.confirm('Matikan dan tutup aplikasi Kiosk MinjaPhotobooth?')) {
                  window.electronKiosk?.exitKiosk('123456');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all shadow-sm"
              title="Tutup Aplikasi Kiosk (Admin Shutdown)"
            >
              <Power className="w-3.5 h-3.5 text-rose-400" />
              <span>Tutup App</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 bg-[#0E131F]/60 border-r border-white/10 p-4 flex flex-col justify-between shrink-0">
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left text-xs font-medium transition-all ${isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-glow-primary/20 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05] border border-transparent'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Booth Version Footer */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Versi Kiosk:</span>
              <span className="text-white font-mono font-medium">v2.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Orientasi:</span>
              <span className="text-amber-400 font-medium">Landscape 16:9</span>
            </div>
            <div className="flex justify-between">
              <span>Status Lisensi:</span>
              <span className="text-emerald-400 font-medium">Verified Active</span>
            </div>
          </div>
        </aside>

        {/* Tab Content Panel */}
        <main className="flex-1 overflow-y-auto bg-[#0A0D14]/80 p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'dashboard' && <AdminDashboardPage token={token} onNavigateTab={setActiveTab} />}
              {activeTab === 'cashdesk' && <CashDeskPage token={token} />}
              {activeTab === 'vouchers' && <VoucherManagementPage token={token} />}
              {activeTab === 'branding' && <BrandingSettingsPage token={token} />}
              {activeTab === 'packages' && <PackageManagementPage token={token} />}
              {activeTab === 'templates' && <TemplateManagementPage token={token} />}
              {activeTab === 'hardware' && <HardwareSettingsPage />}
              {activeTab === 'reports' && <FinancialReportPage token={token} />}
              {activeTab === 'diagnostics' && <SystemDiagnosticPage token={token} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Exit to Kiosk Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showExitConfirm}
        title="Keluar dari Panel Admin?"
        message="Anda akan kembali ke Layar Selamat Datang Kiosk. Sesi admin saat ini akan ditutup demi keamanan."
        confirmLabel="Ya, Kembali ke Kiosk"
        cancelLabel="Tetap di Admin"
        variant="warning"
        onConfirm={() => {
          setShowExitConfirm(false);
          onExitToKiosk();
        }}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
};
