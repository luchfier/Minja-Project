import { CameraDeviceInfo } from '../types/hardware';

const PREFERRED_CAMERA_KEY = 'minja_preferred_camera_id';

export interface ICameraAdapter {
  listDevices(): Promise<CameraDeviceInfo[]>;
  startLiveView(videoElement: HTMLVideoElement, deviceId?: string): Promise<boolean>;
  stopLiveView(): void;
  capturePhoto(isMirrored?: boolean): Promise<string>; // returns data URL (JPEG 0.98)
  getPreferredDeviceId(): string | null;
  setPreferredDeviceId(deviceId: string): void;
  getActiveDeviceId(): string | null;
  onDeviceChange(callback: () => void): () => void;
}

class CameraAdapterService implements ICameraAdapter {
  private activeStream: MediaStream | null = null;
  private activeVideoElement: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  private activeDeviceId: string | null = null;

  getPreferredDeviceId(): string | null {
    try {
      return localStorage.getItem(PREFERRED_CAMERA_KEY);
    } catch {
      return null;
    }
  }

  setPreferredDeviceId(deviceId: string): void {
    try {
      localStorage.setItem(PREFERRED_CAMERA_KEY, deviceId);
    } catch (e) {
      console.warn('Gagal menyimpan preferred camera id:', e);
    }
  }

  getActiveDeviceId(): string | null {
    return this.activeDeviceId;
  }

  onDeviceChange(callback: () => void): () => void {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', callback);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', callback);
      };
    }
    return () => {};
  }

  async listDevices(): Promise<CameraDeviceInfo[]> {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        let devices = await navigator.mediaDevices.enumerateDevices();
        let videoDevices = devices.filter((d) => d.kind === 'videoinput');

        // Probe device labels if browser hasn't granted camera permission yet
        const hasEmptyLabels = videoDevices.some((d) => !d.label || d.label.trim() === '');
        if (hasEmptyLabels && navigator.mediaDevices.getUserMedia) {
          try {
            const probeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            devices = await navigator.mediaDevices.enumerateDevices();
            videoDevices = devices.filter((d) => d.kind === 'videoinput');
            probeStream.getTracks().forEach((track) => track.stop());
          } catch {
            // Permission not granted or canceled; continue with existing list
          }
        }

        if (videoDevices.length > 0) {
          const preferredId = this.getPreferredDeviceId();

          return videoDevices.map((d, index) => {
            const labelLower = (d.label || '').toLowerCase();
            const isCanonOrDslr =
              labelLower.includes('canon') ||
              labelLower.includes('nikon') ||
              labelLower.includes('sony') ||
              labelLower.includes('cam link') ||
              labelLower.includes('capture') ||
              labelLower.includes('hdmi') ||
              labelLower.includes('dslr');
            const isVirtual = labelLower.includes('obs') || labelLower.includes('virtual');

            const isSelected = preferredId ? d.deviceId === preferredId : index === 0;

            return {
              id: d.deviceId || `cam-${index}`,
              name: d.label || `Kamera ${index + 1}`,
              type: isCanonOrDslr ? 'dslr' : isVirtual ? 'virtual' : 'webcam',
              status: 'connected',
              isDefault: isSelected,
              resolution: '1920x1080 Full HD',
            };
          });
        }
      }
    } catch (e) {
      console.warn('Gagal enumerasi perangkat kamera fisik:', e);
    }

    // Jika tidak ada kamera yang terdeteksi, kembalikan array kosong
    return [];
  }

  async startLiveView(videoElement: HTMLVideoElement, targetDeviceId?: string): Promise<boolean> {
    this.stopLiveView();
    this.activeVideoElement = videoElement;

    const deviceId = targetDeviceId || this.getPreferredDeviceId() || undefined;

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? {
                deviceId: { exact: deviceId },
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                frameRate: { ideal: 30, max: 60 },
              }
            : {
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                frameRate: { ideal: 30, max: 60 },
              },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.activeStream = stream;
        this.activeDeviceId = deviceId || null;
        videoElement.srcObject = stream;
        await videoElement.play();
        return true;
      }
    } catch (err) {
      console.info('Kamera fisik tidak dapat diakses, beralih ke preview standby:', err);
    }

    // Fallback Canvas standby visual
    this.activeDeviceId = deviceId || null;
    return this.startSimulatedStream(videoElement);
  }

  private startSimulatedStream(videoElement: HTMLVideoElement): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const draw = () => {
      // Clean background gradient
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Studio grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 3, 0);
      ctx.lineTo(canvas.width / 3, canvas.height);
      ctx.moveTo((canvas.width * 2) / 3, 0);
      ctx.lineTo((canvas.width * 2) / 3, canvas.height);
      ctx.moveTo(0, canvas.height / 3);
      ctx.lineTo(canvas.width, canvas.height / 3);
      ctx.moveTo(0, (canvas.height * 2) / 3);
      ctx.lineTo(canvas.width, (canvas.height * 2) / 3);
      ctx.stroke();

      // Studio Simulation Graphic (Face contour silhouette)
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2 - 20, 110, 0, Math.PI * 2);
      ctx.stroke();

      this.animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    // Stream canvas to video
    try {
      const stream = canvas.captureStream(30);
      this.activeStream = stream;
      videoElement.srcObject = stream;
      videoElement.play();
      return true;
    } catch {
      return false;
    }
  }

  stopLiveView(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => track.stop());
      this.activeStream = null;
    }
    this.activeVideoElement = null;
    this.activeDeviceId = null;
  }

  /**
   * Mengambil snapshot foto dari live view kamera.
   * @param isMirrored Bila true, hasil foto dicerminkan horizontal (sesuai tampilan layar Kiosk).
   */
  async capturePhoto(isMirrored = true): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Gagal inisialisasi context canvas snapshot');

    // 1. If real video stream is playing with valid frames, capture directly at native resolution!
    if (
      this.activeVideoElement &&
      this.activeVideoElement.videoWidth > 0 &&
      this.activeVideoElement.videoHeight > 0
    ) {
      canvas.width = this.activeVideoElement.videoWidth;
      canvas.height = this.activeVideoElement.videoHeight;

      if (isMirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(this.activeVideoElement, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.98);
    }

    // 2. Fallback: Clean studio photobooth portrait without any stamps or dates
    canvas.width = 1920;
    canvas.height = 1280;

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#111827');
    grad.addColorStop(0.5, '#1F2937');
    grad.addColorStop(1, '#0F172A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Warm studio spotlight glow
    const radial = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2 - 50,
      50,
      canvas.width / 2,
      canvas.height / 2 - 50,
      600
    );
    radial.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Photo frame & silhouette
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 - 80, 160, 0, Math.PI * 2);
    ctx.fill();

    // Body silhouette
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, canvas.height / 2 + 250, 300, 200, 0, 0, Math.PI, true);
    ctx.fill();

    return canvas.toDataURL('image/jpeg', 0.98);
  }
}

export const cameraAdapter: ICameraAdapter = new CameraAdapterService();
