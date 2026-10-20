export type ButtonSoundCategory =
  | 'primary'      // Aksi utama, konfirmasi, mulai sesi, cetak, bayar (Cheerful crisp resonant pop/bubble)
  | 'secondary'    // Pilihan kartu, tab, template, thumbnail (Tactile soft wooden click)
  | 'navigation'   // Kembali, batalkan (Soft whoosh pop)
  | 'delete'       // Hapus foto, reset (Subtle lower drop)
  | 'counter'      // Tambah / kurang jumlah lembar cetak (Playful plink/pluck)
  | 'success';     // Voucher terpasang, konfirmasi sukses (Bright dual-tone bell chime)

export interface SoundEffectsSettings {
  enabled: boolean;
  volume: number; // 0.0 to 1.0 (default 0.7)
}

export type CameraSoundCategory =
  | 'countdown_3'
  | 'countdown_2'
  | 'countdown_1'
  | 'shutter'
  | 'photo_captured';
