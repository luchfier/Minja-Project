import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface KioskBackgroundProps {
  customBlur?: number;
  customOverlayOpacity?: number;
  customWallpaperUrl?: string;
  customFit?: 'cover' | 'contain' | 'repeat';
  customPrimaryColor?: string;
  customAccentColor?: string;
  customDarkSurfaceColor?: string;
  customVignette?: boolean;
  className?: string;
}

export const KioskBackground: React.FC<KioskBackgroundProps> = ({
  customBlur,
  customOverlayOpacity,
  customWallpaperUrl,
  customFit,
  customPrimaryColor,
  customAccentColor,
  customDarkSurfaceColor,
  customVignette,
  className = '',
}) => {
  const { branding } = useTheme();

  const wallpaper = customWallpaperUrl !== undefined ? customWallpaperUrl : branding.wallpaperUrl;
  const blur = customBlur !== undefined ? customBlur : (branding.backgroundBlur ?? 8);
  const overlayOpacity = customOverlayOpacity !== undefined ? customOverlayOpacity : (branding.backgroundOverlayOpacity ?? 50);
  const fit = customFit !== undefined ? customFit : (branding.backgroundFit ?? 'cover');
  const primaryColor = customPrimaryColor || branding.primaryColor || '#F59E0B';
  const accentColor = customAccentColor || branding.accentColor || '#38BDF8';
  const surfaceColor = customDarkSurfaceColor || branding.darkSurfaceColor || '#0E131F';
  const enableVignette = customVignette !== undefined ? customVignette : (branding.enableVignette !== false);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}>
      {wallpaper ? (
        <>
          {/* Blurred Background Image */}
          <div
            className={`w-full h-full transform scale-105 transition-all duration-300 ${
              fit === 'contain'
                ? 'bg-contain bg-no-repeat bg-center'
                : fit === 'repeat'
                ? 'bg-repeat'
                : 'bg-cover bg-center'
            }`}
            style={{
              backgroundImage: `url(${wallpaper})`,
              filter: `blur(${blur}px)`,
              opacity: (branding.backgroundOpacity ?? 100) / 100,
            }}
          />

          {/* Dark Surface Dimming Overlay */}
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              backgroundColor: surfaceColor,
              opacity: overlayOpacity / 100,
            }}
          />
        </>
      ) : (
        <div className="w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.15),rgba(255,255,255,0))]" />
      )}

      {/* Cinematic Ambient Radial Glow */}
      {enableVignette && (
        <>
          <div
            style={{ backgroundColor: primaryColor }}
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[120px] opacity-25 pointer-events-none"
          />
          <div
            style={{ backgroundColor: accentColor }}
            className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none"
          />
        </>
      )}
    </div>
  );
};
