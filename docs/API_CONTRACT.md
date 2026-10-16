# MINJAPHOTOBOOTH — API CONTRACT SPECIFICATION

**Versi:** 1.0  
**Status:** Baseline Disetujui  
**Lingkup:** Kontrak IPC (Renderer <-> Electron Main) & Kontrak HTTP/Webhook Eksternal  

---

## 1. Standar Respons & Penanganan Kesalahan (Error Handling)

Semua komunikasi data antara Frontend (Renderer) dan Backend (Electron Main) wajib dibungkus dalam format seragam **`ApiResult<T>`**:

```typescript
export type ApiResult<T> =
  | {
      success: true;
      data: T;
      timestamp: number;
    }
  | {
      success: false;
      error: ApiError;
      timestamp: number;
    };

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export enum ErrorCode {
  // General Errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_OFFLINE = "NETWORK_OFFLINE",

  // Session & Flow Errors
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  INVALID_SESSION_STATE = "INVALID_SESSION_STATE",
  SESSION_TIMEOUT = "SESSION_TIMEOUT",

  // Payment Errors
  PAYMENT_CREATION_FAILED = "PAYMENT_CREATION_FAILED",
  PAYMENT_NOT_FOUND = "PAYMENT_NOT_FOUND",
  PAYMENT_EXPIRED = "PAYMENT_EXPIRED",
  PAYMENT_DENIED = "PAYMENT_DENIED",

  // Camera Errors
  CAMERA_NOT_FOUND = "CAMERA_NOT_FOUND",
  CAMERA_BUSY = "CAMERA_BUSY",
  CAMERA_DISCONNECTED = "CAMERA_DISCONNECTED",
  CAPTURE_TIMEOUT = "CAPTURE_TIMEOUT",

  // Printer Errors
  PRINTER_OFFLINE = "PRINTER_OFFLINE",
  PRINTER_OUT_OF_PAPER = "PRINTER_OUT_OF_PAPER",
  PRINT_JOB_FAILED = "PRINT_JOB_FAILED",

  // Admin & Security Errors
  ADMIN_UNAUTHORIZED = "ADMIN_UNAUTHORIZED",
  ADMIN_LOCKED_OUT = "ADMIN_LOCKED_OUT",
  INVALID_PIN = "INVALID_PIN",

  // Delivery Errors
  WHATSAPP_DELIVERY_FAILED = "WHATSAPP_DELIVERY_FAILED",
  STORAGE_UPLOAD_FAILED = "STORAGE_UPLOAD_FAILED"
}
```

---

## 2. Definisi Saluran IPC (Electron Preload Bridge)

Objek global `window.electronAPI` diekspos melalui `contextBridge` dengan namespace berikut:

```typescript
export interface IElectronAPI {
  session: ISessionAPI;
  payment: IPaymentAPI;
  camera: ICameraAPI;
  editor: IEditorAPI;
  print: IPrintAPI;
  share: IShareAPI;
  admin: IAdminAPI;
  system: ISystemAPI;
}
```

### 2.1 Domain Sesi (`session:*`)

| Channel Name | Request Payload | Return Type (`data`) | Keterangan |
|---|---|---|---|
| `session:getPackages` | `void` | `PackageDto[]` | Mengambil daftar paket aktif beserta harga |
| `session:start` | `StartSessionRequest` | `SessionDto` | Menginisialisasi sesi baru berstatus `PENDING_PAYMENT` |
| `session:getCurrent` | `void` | `SessionDto \| null` | Mendapatkan status sesi aktif saat ini |
| `session:cancel` | `{ sessionId: string; reason?: string }` | `void` | Membatalkan sesi dan mereset sistem ke layar Idle |
| `session:complete` | `{ sessionId: string }` | `void` | Menyelesaikan sesi setelah cetak dan share |

#### Tipe Data:
```typescript
export interface PackageDto {
  id: string;
  name: string;
  description: string;
  price: number; // Dalam Rupiah (contoh: 35000)
  durationSeconds: number;
  maxShots: number;
  maxSelections: number;
  defaultPrints: number;
  additionalPrintPrice: number;
  isActive: boolean;
}

export type SessionState =
  | "IDLE"
  | "PACKAGE_SELECTION"
  | "AWAITING_PAYMENT"
  | "PAYMENT_CONFIRMED"
  | "CAPTURE_COUNTDOWN"
  | "CAPTURE_ACTIVE"
  | "PHOTO_REVIEW"
  | "PHOTO_EDITING"
  | "PRINTING_AND_SHARING"
  | "COMPLETED"
  | "CANCELLED";

export interface SessionDto {
  id: string;
  packageId: string;
  packageName: string;
  state: SessionState;
  totalPrice: number;
  additionalPrintsCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface StartSessionRequest {
  packageId: string;
  additionalPrintsCount?: number;
}
```

---

### 2.2 Domain Pembayaran (`payment:*`)

| Channel Name | Request Payload | Return Type (`data`) | Keterangan |
|---|---|---|---|
| `payment:createQRIS` | `{ sessionId: string }` | `QRISResponseDto` | Menginisiasi transaksi Midtrans dan mengembalikan QR string/URL |
| `payment:checkStatus` | `{ orderId: string }` | `PaymentStatusDto` | Polling status verifikasi pembayaran |
| `payment:cancel` | `{ orderId: string }` | `void` | Membatalkan transaksi jika pelanggan menekan batal |

#### Event Listener (Pusher dari Main Process):
- `payment:onStatusChanged(callback: (status: PaymentStatusDto) => void): () => void`

#### Tipe Data:
```typescript
export interface QRISResponseDto {
  orderId: string;
  grossAmount: number;
  qrString: string; // Teks raw QRIS (EMVCo) untuk dirender di UI
  qrImageUrl?: string; // Alternatif URL QR dari Midtrans
  expiryTime: string; // ISO 8601 string
}

export type PaymentStatus = "pending" | "settlement" | "expire" | "cancel" | "deny";

export interface PaymentStatusDto {
  orderId: string;
  transactionStatus: PaymentStatus;
  settlementTime?: string;
  isVerified: boolean;
}
```

---

### 2.3 Domain Kamera (`camera:*`)

| Channel Name | Request Payload | Return Type (`data`) | Keterangan |
|---|---|---|---|
| `camera:getDevices` | `void` | `CameraDeviceDto[]` | Mendapatkan daftar kamera yang terdeteksi |
| `camera:connect` | `{ deviceId: string }` | `void` | Menghubungkan ke kamera yang dipilih |
| `camera:disconnect` | `void` | `void` | Memutuskan sambungan kamera |
| `camera:startLiveView` | `void` | `void` | Memulai streaming live view ke UI |
| `camera:stopLiveView` | `void` | `void` | Menghentikan streaming live view |
| `camera:capture` | `CaptureRequestDto` | `CapturedPhotoDto` | Menembak shutter kamera dan menyimpan RAW/JPEG |

#### Event Listener:
- `camera:onFrame(callback: (frameBase64OrBuffer: string) => void): () => void`
- `camera:onDeviceStateChanged(callback: (status: CameraStatusDto) => void): () => void`

#### Tipe Data:
```typescript
export type CameraType = "webcam" | "virtual_webcam" | "canon_dslr" | "mock";

export interface CameraDeviceDto {
  id: string;
  name: string;
  type: CameraType;
  isAvailable: boolean;
}

export interface CaptureRequestDto {
  sessionId: string;
  shotNumber: number;
}

export interface CapturedPhotoDto {
  photoId: string;
  shotNumber: number;
  previewUrl: string; // File protocol / data URL untuk review instan
  rawFilePath: string;
  capturedAt: string;
}

export interface CameraStatusDto {
  deviceId: string;
  isConnected: boolean;
  batteryLevel?: number; // Persentase baterai jika kamera DSLR
  errorMessage?: string;
}
```

---

### 2.4 Domain Editor & Rendering (`editor:*`)

| Channel Name | Request Payload | Return Type (`data`) | Keterangan |
|---|---|---|---|
| `editor:getTemplates` | `void` | `PhotoTemplateDto[]` | Mengambil template/frame 4R yang tersedia |
| `editor:renderComposite` | `RenderCompositeRequestDto` | `RenderResultDto` | Merender layout final 300 DPI (1200x1800 px) |

#### Tipe Data:
```typescript
export interface PhotoTemplateDto {
  id: string;
  name: string;
  thumbnailUrl: string;
  frameOverlayPath: string; // File path PNG transparan beresolusi 1200x1800 px
  slotsCount: number; // Jumlah foto dalam template (misal: 3 strip foto)
  slotCoordinates: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  }>;
}

export interface PhotoEditAction {
  photoId: string;
  filter?: "none" | "bw" | "sepia" | "vintage" | "cool" | "warm";
  crop?: { x: number; y: number; width: number; height: number };
  rotation?: number; // 0, 90, 180, 270
  brightness?: number; // -100 s/d 100
  contrast?: number; // -100 s/d 100
}

export interface StickerOverlay {
  stickerId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface RenderCompositeRequestDto {
  sessionId: string;
  templateId: string;
  photoEdits: PhotoEditAction[];
  stickers?: StickerOverlay[];
}

export interface RenderResultDto {
  printLayoutHighResPath: string; // JPEG 300 DPI untuk printer
  digitalSoftFilePath: string; // JPEG optimized untuk download Web/WA
  previewThumbnailUrl: string;
}
```

---

### 2.5 Domain Cetak 4R (`print:*`)

| Channel Name | Request Payload | Return Type (`data`) | Keterangan |
|---|---|---|---|
| `print:getPrinters` | `void` | `PrinterDeviceDto[]` | Menampilkan printer Windows yang terpasang |
| `print:submitJob` | `SubmitPrintJobRequestDto` | `PrintJobResponseDto` | Mengirim perintah cetak 4R ke Windows Spooler |
| `print:getJobStatus` | `{ jobId: string }` | `PrintJobStatusDto` | Cek status pencetakan |

#### Tipe Data:
```typescript
export interface PrinterDeviceDto {
  name: string;
  isDefault: boolean;
  status: "ready" | "printing" | "offline" | "error";
  paperStatus?: "ok" | "empty" | "jammed";
}

export interface SubmitPrintJobRequestDto {
  sessionId: string;
  imageFilePath: string;
  copiesCount: number;
}

export interface PrintJobResponseDto {
  jobId: string;
  status: "queued" | "printing" | "completed" | "failed";
}

export interface PrintJobStatusDto {
  jobId: string;
  status: "queued" | "printing" | "completed" | "failed";
  errorMessage?: string;
}
```

---

### 2.6 Domain Distribusi Digital (`share:*`)

| Channel Name | Request Payload | Return Type (`data`) | Keterangan |
|---|---|---|---|
| `share:createGallery` | `{ sessionId: string }` | `GalleryResultDto` | Mengunggah soft file dan membuat QR galeri |
| `share:sendWhatsApp` | `WhatsAppSendRequestDto` | `WhatsAppSendResponseDto` | Mengirim notifikasi WA resmi |

#### Tipe Data:
```typescript
export interface GalleryResultDto {
  galleryUrl: string; // Contoh: https://booth.minja.id/g/x9k2-38la
  qrCodeDataUrl: string; // Base64 QR code gambar untuk tampil di layar
  expiresAt: string; // Masa aktif link
}

export interface WhatsAppSendRequestDto {
  sessionId: string;
  phoneNumber: string; // Format E.164 (misal: 6281234567890)
}

export interface WhatsAppSendResponseDto {
  messageId: string;
  status: "queued" | "sent" | "failed";
}
```

---

### 2.7 Domain Admin & Keamanan (`admin:*`)

| Channel Name | Request Payload | Return Type (`data`) | Keterangan |
|---|---|---|---|
| `admin:login` | `{ pin: string }` | `AdminAuthResponseDto` | Verifikasi PIN dengan Argon2id |
| `admin:logout` | `void` | `void` | Mengakhiri sesi admin |
| `admin:getConfig` | `void` | `AdminConfigDto` | Membaca konfigurasi aplikasi saat ini |
| `admin:updateConfig` | `UpdateAdminConfigRequestDto` | `AdminConfigDto` | Memperbarui setting (branding, hardware) |
| `admin:getTransactions` | `TransactionQueryDto` | `TransactionListDto` | Mengambil laporan transaksi keuangan |
| `admin:exportReportCsv` | `TransactionQueryDto` | `{ csvFilePath: string }` | Mengunduh file laporan CSV |
| `admin:reprint` | `{ orderId: string; reason: string }` | `PrintJobResponseDto` | Cetak ulang dengan audit log |

#### Tipe Data:
```typescript
export interface AdminAuthResponseDto {
  token: string;
  expiresInSeconds: number;
}

export interface AdminConfigDto {
  boothName: string;
  brandTitle: string;
  brandPrimaryColor: string;
  wallpaperPath: string;
  selectedCameraId: string;
  selectedPrinterName: string;
  retentionHours: number;
  maintenanceMode: boolean;
}

export interface UpdateAdminConfigRequestDto {
  boothName?: string;
  brandTitle?: string;
  brandPrimaryColor?: string;
  wallpaperPath?: string;
  selectedCameraId?: string;
  selectedPrinterName?: string;
  retentionHours?: number;
  newPin?: string; // Hanya jika admin ingin mengganti PIN
  currentPin?: string; // Verifikasi PIN lama sebelum ganti
}

export interface TransactionQueryDto {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status?: PaymentStatus;
  limit?: number;
  offset?: number;
}

export interface TransactionSummaryDto {
  orderId: string;
  sessionId: string;
  packageName: string;
  amount: number;
  paymentStatus: PaymentStatus;
  printStatus: string;
  createdAt: string;
}

export interface TransactionListDto {
  totalCount: number;
  totalRevenue: number;
  items: TransactionSummaryDto[];
}
```

---

## 3. Kontrak Webhook Eksternal (Midtrans Notifikasi)

Endpoint HTTP lokal/tunnel untuk menerima callback webhook Midtrans:

### `POST /api/webhooks/midtrans`
- **Headers:**
  - `Content-Type: application/json`
- **Body Payload (Midtrans Standard Notification):**
```json
{
  "order_id": "MINJA-20261017-001",
  "status_code": "200",
  "gross_amount": "35000.00",
  "signature_key": "a1b2c3d4e5f6...",
  "payment_type": "qris",
  "transaction_status": "settlement",
  "transaction_time": "2026-10-17 01:25:00"
}
```
- **Verifikasi Signature:**
  `SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)`
- **Validasi Idempoten:**
  Jika `order_id` sudah berstatus `settlement` pada basis data lokal, respon `200 OK` dikirim langsung tanpa mengulang aktivasi sesi.
- **Respons HTTP:**
  - `200 OK`: Notifikasi berhasil diproses.
  - `400 Bad Request`: Payload tidak valid atau signature salah.
  - `404 Not Found`: Order ID tidak ditemukan dalam sistem.
