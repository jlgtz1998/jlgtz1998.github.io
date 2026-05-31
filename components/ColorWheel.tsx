'use client';

import React, { useRef, useEffect, useState } from 'react';
import { rgb as culoriRgb } from 'culori';
import { ColorData, OklchColor } from '../types';

interface ColorWheelProps {
  activeColor: ColorData | null;
  colors: ColorData[];
  onColorChange: (newOklch: OklchColor) => void;
  onSelectColor: (color: ColorData) => void;
  size?: number;
  hoveredColorId?: string | null;
  onHoverColor?: (id: string | null) => void;
  onInteractionEnd?: () => void;
  pickerShape?: 'plane_lc' | 'plane_hc';
  drawHarmonyLines?: boolean;
  harmonyRule?: string;
  harmonyBaseColorId?: string | null;
}

const MAX_CHROMA = 0.4;

const clampNumber = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

interface NumberControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function NumberControl({ label, value, min, max, step, onChange }: NumberControlProps) {
  const getTooltip = (lbl: string) => {
    if (lbl.includes('LIGHTNESS')) {
      return 'Reflectancia de Luz (LRV): 0.00 (Negro) a 1.00 (Blanco yeso). Determina la luminosidad del material.';
    }
    if (lbl.includes('CHROMA')) {
      return 'Pureza Mineral (Saturación): 0.00 (Hormigón neutro) a 0.40 (Sintético puro). Travertino y maderas suelen estar en 0.04-0.08.';
    }
    if (lbl.includes('HUE')) {
      return 'Matiz / Temperatura (°): Ángulo de color en 360°. Cobre/Arcilla ~35°, Arena ~75°, Musgo ~135°, Pizarra ~220°.';
    }
    return undefined;
  };

  const tooltip = getTooltip(label);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }} title={tooltip}>
      <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', cursor: tooltip ? 'help' : 'default' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '3px' }}>
        <button onClick={() => onChange(clampNumber(value - step, min, max))} style={{ padding: '4px 8px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', opacity: 0.7 }}>-</button>
        <input 
          type="number" 
          value={Number(value).toFixed(step < 1 ? 2 : 0)} 
          onChange={(e) => onChange(clampNumber(parseFloat(e.target.value) || 0, min, max))}
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
        />
        <button onClick={() => onChange(clampNumber(value + step, min, max))} style={{ padding: '4px 8px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', opacity: 0.7 }}>+</button>
      </div>
    </div>
  );
}

export default function ColorWheel({
  activeColor,
  colors,
  onColorChange,
  onSelectColor,
  size = 200,
  hoveredColorId = null,
  onHoverColor,
  onInteractionEnd,
  pickerShape = 'plane_lc',
  drawHarmonyLines = false,
  harmonyRule,
  harmonyBaseColorId = null,
}: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const radius = size / 2;
  
  // Extract active OKLCH variables
  const currentL = activeColor ? activeColor.oklch.l : 0.85;
  const currentC = activeColor ? activeColor.oklch.c : 0.1;
  const currentH = activeColor ? activeColor.oklch.h : 0;

  // Redraw the canvas color picker based on the active plane
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    if (pickerShape === 'plane_lc') {
      // L-C Plane (Lightness vs Chroma) for a fixed Hue
      for (let y = 0; y < size; y++) {
        const l = 1 - (y / (size - 1)); // Top is L=1, Bottom is L=0
        for (let x = 0; x < size; x++) {
          const c = (x / (size - 1)) * MAX_CHROMA; // Left is C=0, Right is C=MAX_CHROMA
          
          const parsed = culoriRgb({ mode: 'oklch', l, c, h: currentH });
          const index = (y * size + x) * 4;

          if (!parsed) {
            data[index] = 0; data[index + 1] = 0; data[index + 2] = 0; data[index + 3] = 255;
            continue;
          }

          // Gamut check
          const r = parsed.r;
          const g = parsed.g;
          const b = parsed.b;
          
          const inGamut = r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;
          
          // Clamp for display
          const dr = Math.round(Math.max(0, Math.min(1, r)) * 255);
          const dg = Math.round(Math.max(0, Math.min(1, g)) * 255);
          const db = Math.round(Math.max(0, Math.min(1, b)) * 255);

          data[index] = dr;
          data[index + 1] = dg;
          data[index + 2] = db;
          // Dim out-of-gamut colors to show the physical display boundary
          data[index + 3] = inGamut ? 255 : 40; 
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // Draw subtle grid lines (Oscilloscope feel)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const gridPos = (i / 4) * size;
        ctx.beginPath(); ctx.moveTo(gridPos, 0); ctx.lineTo(gridPos, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, gridPos); ctx.lineTo(size, gridPos); ctx.stroke();
      }
    } 
    else if (pickerShape === 'plane_hc') {
      // H-C Plane (Hue vs Chroma polar) for a fixed Lightness
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - radius;
          const dy = y - radius;
          const r_dist = Math.sqrt(dx * dx + dy * dy);
          const index = (y * size + x) * 4;

          if (r_dist <= radius) {
            const c = (r_dist / radius) * MAX_CHROMA;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            if (angle < 0) angle += 360;

            const parsed = culoriRgb({ mode: 'oklch', l: currentL, c, h: angle });
            
            if (parsed) {
              const r = parsed.r;
              const g = parsed.g;
              const b = parsed.b;
              
              const inGamut = r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;
              const dr = Math.round(Math.max(0, Math.min(1, r)) * 255);
              const dg = Math.round(Math.max(0, Math.min(1, g)) * 255);
              const db = Math.round(Math.max(0, Math.min(1, b)) * 255);

              // Anti-aliasing edge
              const edgeAlpha = r_dist > radius - 2 ? (radius - r_dist) / 2 : 1;

              data[index] = dr;
              data[index + 1] = dg;
              data[index + 2] = db;
              data[index + 3] = Math.round((inGamut ? 255 : 40) * edgeAlpha);
            }
          } else {
            data[index] = 0; data[index + 1] = 0; data[index + 2] = 0; data[index + 3] = 0;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // Polar grid rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      [0.25, 0.50, 0.75].forEach(scale => {
        const ringR = scale * radius;
        ctx.beginPath();
        ctx.arc(radius, radius, ringR, 0, 2 * Math.PI);
        ctx.stroke();
      });

      // Crosshairs
      ctx.beginPath(); ctx.moveTo(radius - 5, radius); ctx.lineTo(radius + 5, radius);
      ctx.moveTo(radius, radius - 5); ctx.lineTo(radius, radius + 5); ctx.stroke();
    }
  }, [currentL, currentH, radius, size, pickerShape]);

  // Translate color to canvas coordinates
  const getCoordinates = (oklch: OklchColor) => {
    if (pickerShape === 'plane_lc') {
      return {
        x: (oklch.c / MAX_CHROMA) * size,
        y: (1 - oklch.l) * size,
      };
    } 
    else {
      // plane_hc
      const r_dist = (oklch.c / MAX_CHROMA) * radius;
      const angleRad = (oklch.h * Math.PI) / 180;
      return {
        x: radius + r_dist * Math.cos(angleRad),
        y: radius + r_dist * Math.sin(angleRad),
      };
    }
  };

  const handleInteraction = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    if (pickerShape === 'plane_lc') {
      const c = clampNumber(px / size, 0, 1) * MAX_CHROMA;
      const l = clampNumber(1 - (py / size), 0, 1);
      onColorChange({ l, c, h: currentH });
    } 
    else {
      const x = px - radius;
      const y = py - radius;
      const r_dist = Math.sqrt(x * x + y * y);
      const c = clampNumber(r_dist / radius, 0, 1) * MAX_CHROMA;
      
      let h = Math.atan2(y, x) * (180 / Math.PI);
      if (h < 0) h += 360;

      onColorChange({ l: currentL, c, h });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleInteraction(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleInteraction(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onInteractionEnd?.();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    if (e.touches[0]) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    if (e.touches[0]) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      onInteractionEnd?.();
    }
  };

  useEffect(() => {
    const handleGlobalEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        onInteractionEnd?.();
      }
    };
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchend', handleGlobalEnd);
    return () => {
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isDragging, onInteractionEnd]);

  const baseColor = colors.find(c => c.id === harmonyBaseColorId) || activeColor || colors[0];

  return (
    <div className="color-wheel-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: size }}>
      <div 
        ref={containerRef}
        className="color-wheel-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: size,
          height: size,
          position: 'relative',
          cursor: 'crosshair',
          userSelect: 'none',
        }}
      >
        {/* Canvas background displaying gamut */}
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            borderRadius: pickerShape === 'plane_lc' ? '4px' : '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          }}
        />

        {/* Outer overlay border */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: pickerShape === 'plane_lc' ? '4px' : '50%',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          pointerEvents: 'none',
        }} />

        {/* Harmony Connection Lines SVG */}
        {drawHarmonyLines && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: size,
              height: size,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            {/* Center radial lines (only in polar HC shape) */}
            {pickerShape === 'plane_hc' && colors.map((c) => {
              const coords = getCoordinates(c.oklch);
              return (
                <line
                  key={`center-line-${c.id}`}
                  x1={radius}
                  y1={radius}
                  x2={coords.x}
                  y2={coords.y}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />
              );
            })}

            {/* Hull/loop connecting colors sorted by hue */}
            {(() => {
              if (colors.length < 3) return null;
              const sorted = [...colors].sort((a, b) => a.oklch.h - b.oklch.h);
              const pointsStr = sorted
                .map((c) => {
                  const coords = getCoordinates(c.oklch);
                  return `${coords.x},${coords.y}`;
                })
                .join(' ');
              return (
                <polygon
                  points={pointsStr}
                  fill="rgba(255, 255, 255, 0.02)"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth={1}
                />
              );
            })()}

            {/* Direct links to harmony base anchor color */}
            {baseColor && colors.map((c) => {
              if (c.id === baseColor.id) return null;
              const coords = getCoordinates(c.oklch);
              const baseCoords = getCoordinates(baseColor.oklch);
              return (
                <line
                  key={`base-link-${c.id}`}
                  x1={baseCoords.x}
                  y1={baseCoords.y}
                  x2={coords.x}
                  y2={coords.y}
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth={1.2}
                  strokeDasharray={c.locked ? "none" : "3,3"}
                />
              );
            })}
          </svg>
        )}

        {/* Palette node points */}
        {colors.map((color) => {
          if (activeColor && color.id === activeColor.id) return null;
          
          const coords = getCoordinates(color.oklch);
          const isHovered = hoveredColorId === color.id;
          return (
            <button
              key={color.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectColor(color);
              }}
              onMouseEnter={() => onHoverColor?.(color.id)}
              onMouseLeave={() => onHoverColor?.(null)}
              style={{
                position: 'absolute',
                left: coords.x,
                top: coords.y,
                transform: 'translate(-50%, -50%)',
                width: isHovered ? 16 : 12,
                height: isHovered ? 16 : 12,
                borderRadius: '50%',
                backgroundColor: color.hex,
                border: isHovered ? '2px solid #ffffff' : '1.5px solid #ffffff',
                boxShadow: isHovered ? '0 0 6px rgba(0,0,0,0.8)' : '0 0 3px rgba(0,0,0,0.5)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all 0.1s ease',
                zIndex: isHovered ? 30 : 10,
              }}
              title={`${color.displayName} (${color.hex})`}
            >
              {color.locked && (
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#000000' }} />
              )}
            </button>
          );
        })}

        {/* Premium Optical Viewfinder for active node */}
        {activeColor && (() => {
          const activeCoords = getCoordinates(activeColor.oklch);
          return (
            <div
              style={{
                position: 'absolute',
                left: activeCoords.x,
                top: activeCoords.y,
                transform: 'translate(-50%, -50%)',
                width: 40,
                height: 40,
                pointerEvents: 'none',
                zIndex: 40,
              }}
            >
              {/* Center point */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: 8, height: 8, borderRadius: '50%', backgroundColor: activeColor.hex,
                border: '1.5px solid #ffffff', boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 0 4px rgba(0,0,0,0.6)',
              }} />
              {/* Outer target scope circle */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: 24, height: 24, borderRadius: '50%', 
                border: '1px solid rgba(255,255,255,0.85)',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(0,0,0,0.25)',
              }} />
              {/* Crosshair lines extending outward */}
              <div style={{ position: 'absolute', top: '50%', left: '-10px', width: '20px', height: '1px', background: '#ffffff', boxShadow: '0 1px 1px rgba(0,0,0,0.3)' }} />
              <div style={{ position: 'absolute', top: '50%', right: '-10px', width: '20px', height: '1px', background: '#ffffff', boxShadow: '0 1px 1px rgba(0,0,0,0.3)' }} />
              <div style={{ position: 'absolute', top: '-10px', left: '50%', width: '1px', height: '20px', background: '#ffffff', boxShadow: '1px 0 1px rgba(0,0,0,0.3)' }} />
              <div style={{ position: 'absolute', bottom: '-10px', left: '50%', width: '1px', height: '20px', background: '#ffffff', boxShadow: '1px 0 1px rgba(0,0,0,0.3)' }} />
            </div>
          );
        })()}
      </div>
      
      {/* CAD-Style Input Controls for OKLCH */}
      {activeColor && (
        <div style={{ display: 'flex', gap: '8px', width: '100%', padding: '8px', background: 'var(--bg-panel-deep)', borderRadius: '3px', border: '1px solid var(--border-medium)' }}>
          <NumberControl 
            label="LIGHTNESS (L)" 
            value={currentL} 
            min={0} max={1} step={0.01} 
            onChange={(val: number) => { onColorChange({ l: val, c: currentC, h: currentH }); onInteractionEnd?.(); }} 
          />
          <NumberControl 
            label="CHROMA (C)" 
            value={currentC} 
            min={0} max={MAX_CHROMA} step={0.01} 
            onChange={(val: number) => { onColorChange({ l: currentL, c: val, h: currentH }); onInteractionEnd?.(); }} 
          />
          <NumberControl 
            label="HUE (H) °" 
            value={currentH} 
            min={0} max={360} step={1} 
            onChange={(val: number) => { onColorChange({ l: currentL, c: currentC, h: val }); onInteractionEnd?.(); }} 
          />
        </div>
      )}
    </div>
  );
}
