// Helper to generate sample PNG frame overlays using HTML5 Canvas in browser
// Produces 1200x1800 PNG Data URLs with transparent cutouts for photo slots

export function createGoldDuoFramePng(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Transparent base
  ctx.clearRect(0, 0, 1200, 1800);

  // Outer border & header / footer banners
  ctx.fillStyle = '#0B0F19';
  // Top header area
  ctx.fillRect(0, 0, 1200, 130);
  // Bottom footer area
  ctx.fillRect(0, 1670, 1200, 130);
  // Left border
  ctx.fillRect(0, 0, 80, 1800);
  // Right border
  ctx.fillRect(1120, 0, 80, 1800);
  // Middle divider
  ctx.fillRect(0, 860, 1200, 70);

  // Decorative Golden Trim Lines
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, 1140, 1740);

  ctx.strokeStyle = '#FDE68A';
  ctx.lineWidth = 2;
  ctx.strokeRect(45, 45, 1110, 1710);

  // Gold borders around the 2 photo cutouts
  // Slot 1 cutout border
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 8;
  ctx.strokeRect(90, 140, 1020, 710);

  // Slot 2 cutout border
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 8;
  ctx.strokeRect(90, 940, 1020, 710);

  // Corner ornaments
  const drawCorner = (x: number, y: number) => {
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
  };
  drawCorner(50, 50);
  drawCorner(1150, 50);
  drawCorner(50, 1750);
  drawCorner(1150, 1750);

  // Header Title
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 38px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✨ MINJA STUDIO PHOTOBOOTH ✨', 600, 75);

  // Footer Subtitle
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('SPECIAL MEMORIES • STUDIO PRINT', 600, 1730);

  return canvas.toDataURL('image/png');
}

export function createRetroPolaroidFramePng(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, 1200, 1800);

  // Vintage Cream Polaroid Border
  ctx.fillStyle = '#FDFBF7';
  ctx.fillRect(0, 0, 1200, 1800);

  // Punch out the transparent photo window for 1 large photo
  ctx.clearRect(100, 120, 1000, 1240);

  // Subtle inner shadow / border for the cutout
  ctx.strokeStyle = '#E2D9CC';
  ctx.lineWidth = 4;
  ctx.strokeRect(98, 118, 1004, 1244);

  // Washi tape at top-left corner
  ctx.save();
  ctx.translate(140, 90);
  ctx.rotate(-0.15);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
  ctx.fillRect(-60, -18, 120, 36);
  ctx.restore();

  // Washi tape at top-right corner
  ctx.save();
  ctx.translate(1060, 90);
  ctx.rotate(0.15);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
  ctx.fillRect(-60, -18, 120, 36);
  ctx.restore();

  // Handwritten script caption at the bottom
  ctx.fillStyle = '#1E293B';
  ctx.font = 'italic bold 54px "Playfair Display", serif';
  ctx.textAlign = 'center';
  ctx.fillText('Forever & Always', 600, 1520);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('MINJA PHOTOBOOTH • VINTAGE POLAROID', 600, 1620);

  return canvas.toDataURL('image/png');
}

export function createCyberNeonFramePng(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, 1200, 1800);

  // Dark cyber background with borders
  ctx.fillStyle = '#070A12';
  // Top header
  ctx.fillRect(0, 0, 1200, 100);
  // Bottom footer
  ctx.fillRect(0, 1680, 1200, 120);
  // Side borders
  ctx.fillRect(0, 0, 60, 1800);
  ctx.fillRect(1140, 0, 60, 1800);
  // Center cross dividers
  ctx.fillRect(580, 0, 40, 1800);
  ctx.fillRect(0, 880, 1200, 40);

  // Glowing Neon Cyan and Magenta borders
  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = 8;
  // Slot 1 (top-left)
  ctx.strokeRect(60, 100, 520, 780);
  // Slot 4 (bottom-right)
  ctx.strokeRect(620, 920, 520, 760);

  ctx.strokeStyle = '#EC4899';
  // Slot 2 (top-right)
  ctx.strokeRect(620, 100, 520, 780);
  // Slot 3 (bottom-left)
  ctx.strokeRect(60, 920, 520, 760);

  // Header Title
  ctx.fillStyle = '#06B6D4';
  ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ CYBERPUNK STUDIO ⚡', 600, 65);

  // Footer Title
  ctx.fillStyle = '#EC4899';
  ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('MINJA PHOTOBOOTH • LIMITED EDITION', 600, 1745);

  return canvas.toDataURL('image/png');
}
