'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ColorData, OklchColor } from '../types';
import { oklchToHex, rgbToHsv, hsvToRgb, rgbToHex, hexToOklch } from '../lib/color-spaces';

interface ColorWheelProps {
  activeColor: ColorData | null;
  colors: ColorData[];
  onColorChange: (newOklch: OklchColor, hsv?: { h: number; s: number; v: number }) => void;
  onSelectColor: (color: ColorData) => void;
  hideLightnessSlider?: boolean;
  size?: number;
  hoveredColorId?: string | null;
  onHoverColor?: (id: string | null) => void;
  onInteractionEnd?: () => void;
  pickerShape?: 'circle' | 'square' | 'triangle';
}

export default function ColorWheel({
  activeColor,
  colors,
  onColorChange,
  onSelectColor,
  hideLightnessSlider = false,
  size = 200,
  hoveredColorId = null,
  onHoverColor,
  onInteractionEnd,
  pickerShape = 'circle',
}: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const radius = size / 2;
  
  // Calculate active color's HSV representation to retrieve active Value (V) & Hue (H)
  const activeHsv = activeColor ? rgbToHsv(activeColor.rgb) : { h: 0, s: 0, v: 0.85 };
  const currentV = activeHsv.v;
  const currentH = activeHsv.h;

  // Redraw the canvas color picker based on the active pickerShape and brightness/hue
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    if (pickerShape === 'square') {
      // Draw SV Box for the active Hue
      const imageData = ctx.createImageData(size, size);
      const data = imageData.data;

      for (let y = 0; y < size; y++) {
        const v = 1 - (y / (size - 1)); // Top is V=1, Bottom is V=0
        for (let x = 0; x < size; x++) {
          const s = x / (size - 1); // Left is S=0, Right is S=1
          const rgb = hsvToRgb({ h: currentH, s, v });
          const index = (y * size + x) * 4;
          data[index] = rgb.r;
          data[index + 1] = rgb.g;
          data[index + 2] = rgb.b;
          data[index + 3] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // Draw subtle grid lines for a sci-fi instrumentation panel feel
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const gridPos = (i / 4) * size;
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(gridPos, 0);
        ctx.lineTo(gridPos, size);
        ctx.stroke();

        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, gridPos);
        ctx.lineTo(size, gridPos);
        ctx.stroke();
      }
    } 
    else if (pickerShape === 'triangle') {
      // Triangle Mode: Outer Hue Ring & Inner Equilateral SV Triangle
      const imageData = ctx.createImageData(size, size);
      const data = imageData.data;

      const R_tri = radius * 0.72;
      const R_out = radius - 2;
      const R_in = radius * 0.82;

      // Triangle vertices
      const Ax = radius;
      const Ay = radius - R_tri;
      const Bx = radius + R_tri * Math.cos(5 * Math.PI / 6);
      const By = radius + R_tri * Math.sin(5 * Math.PI / 6);
      const Cx = radius + R_tri * Math.cos(Math.PI / 6);
      const Cy = radius + R_tri * Math.sin(Math.PI / 6);

      const denom = (By - Cy) * (Ax - Cx) + (Cx - Bx) * (Ay - Cy);

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - radius;
          const dy = y - radius;
          const r = Math.sqrt(dx * dx + dy * dy);
          const index = (y * size + x) * 4;

          if (r >= R_in && r <= R_out) {
            // Draw Hue ring
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            if (angle < 0) angle += 360;
            const rgb = hsvToRgb({ h: angle, s: 1, v: 1 });
            
            // Subtle anti-aliasing on ring boundaries
            let alpha = 255;
            if (r < R_in + 1.2) {
              alpha = Math.round(Math.max(0, (r - R_in) / 1.2) * 255);
            } else if (r > R_out - 1.2) {
              alpha = Math.round(Math.max(0, (R_out - r) / 1.2) * 255);
            }

            data[index] = rgb.r;
            data[index + 1] = rgb.g;
            data[index + 2] = rgb.b;
            data[index + 3] = alpha;
          } else {
            // Check if point is inside the equilateral triangle
            const w_A = ((By - Cy) * (x - Cx) + (Cx - Bx) * (y - Cy)) / denom;
            const w_B = ((Cy - Ay) * (x - Cx) + (Ax - Cx) * (y - Cy)) / denom;
            const w_C = 1 - w_A - w_B;

            if (w_A >= -0.005 && w_B >= -0.005 && w_C >= -0.005) {
              // Interpolate Saturation and Value from weights
              const v = Math.max(0, Math.min(1, w_A + w_B));
              const s = v > 0 ? Math.max(0, Math.min(1, w_A / v)) : 0;
              const rgb = hsvToRgb({ h: currentH, s, v });

              // Anti-aliasing for triangle bounds
              const minWeight = Math.min(w_A, w_B, w_C);
              let alpha = 255;
              if (minWeight < 0) {
                alpha = Math.round(Math.max(0, 1 + minWeight / 0.005) * 255);
              }

              data[index] = rgb.r;
              data[index + 1] = rgb.g;
              data[index + 2] = rgb.b;
              data[index + 3] = alpha;
            } else {
              data[index] = 0;
              data[index + 1] = 0;
              data[index + 2] = 0;
              data[index + 3] = 0;
            }
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // Draw triangle white border/outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Ax, Ay);
      ctx.lineTo(Bx, By);
      ctx.lineTo(Cx, Cy);
      ctx.closePath();
      ctx.stroke();

      // Draw current Hue indicator on the outer ring
      const indicatorAngle = (currentH * Math.PI) / 180;
      const R_mid = (R_in + R_out) / 2;
      const tickX = radius + R_mid * Math.cos(indicatorAngle);
      const tickY = radius + R_mid * Math.sin(indicatorAngle);

      // White tick ring
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = hsvToRgb({ h: currentH, s: 1, v: 1 }) ? rgbToHex(hsvToRgb({ h: currentH, s: 1, v: 1 })) : '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tickX, tickY, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } 
    else {
      // Circle Mode (Traditional HSV Wheel)
      const imageData = ctx.createImageData(size, size);
      const data = imageData.data;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - radius;
          const dy = y - radius;
          const r = Math.sqrt(dx * dx + dy * dy);
          const index = (y * size + x) * 4;

          if (r <= radius) {
            const s = r / radius;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            if (angle < 0) angle += 360;

            const rgb = hsvToRgb({ h: angle, s, v: currentV });
            const edgeAlpha = r > radius - 2 ? (radius - r) / 2 : 1;

            data[index] = rgb.r;
            data[index + 1] = rgb.g;
            data[index + 2] = rgb.b;
            data[index + 3] = Math.round(edgeAlpha * 255);
          } else {
            data[index] = 0;
            data[index + 1] = 0;
            data[index + 2] = 0;
            data[index + 3] = 0;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // Draw coordinate rings (0.25, 0.50, 0.75 saturation rings)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      [0.25, 0.50, 0.75].forEach(sValue => {
        const ringR = sValue * radius;
        ctx.beginPath();
        ctx.arc(radius, radius, ringR, 0, 2 * Math.PI);
        ctx.stroke();
      });

      // Draw center crosshair lines
      ctx.beginPath();
      ctx.moveTo(radius - 5, radius);
      ctx.lineTo(radius + 5, radius);
      ctx.moveTo(radius, radius - 5);
      ctx.lineTo(radius, radius + 5);
      ctx.stroke();
    }
  }, [currentV, currentH, radius, size, pickerShape]);

  // Translate color to canvas coordinates based on the selected pickerShape
  const getCoordinates = (oklch: OklchColor, colorHex: string) => {
    const hex = colorHex || oklchToHex(oklch);
    const rVal = parseInt(hex.substring(1, 3), 16) || 0;
    const gVal = parseInt(hex.substring(3, 5), 16) || 0;
    const bVal = parseInt(hex.substring(5, 7), 16) || 0;
    
    const hsv = rgbToHsv({ r: rVal, g: gVal, b: bVal });

    if (pickerShape === 'square') {
      // X = Saturation, Y = 1 - Value
      return {
        x: hsv.s * size,
        y: (1 - hsv.v) * size,
      };
    } 
    else if (pickerShape === 'triangle') {
      // Equilateral triangle using barycentric weights mapping
      const R_tri = radius * 0.72;
      const Ax = radius;
      const Ay = radius - R_tri;
      const Bx = radius + R_tri * Math.cos(5 * Math.PI / 6);
      const By = radius + R_tri * Math.sin(5 * Math.PI / 6);
      const Cx = radius + R_tri * Math.cos(Math.PI / 6);
      const Cy = radius + R_tri * Math.sin(Math.PI / 6);

      const w_A = hsv.s * hsv.v;
      const w_B = hsv.v * (1 - hsv.s);
      const w_C = 1 - hsv.v;

      return {
        x: w_A * Ax + w_B * Bx + w_C * Cx,
        y: w_A * Ay + w_B * By + w_C * Cy,
      };
    } 
    else {
      // Circle mode (radial mapping)
      const r = hsv.s * radius;
      const angleRad = (hsv.h * Math.PI) / 180;
      
      return {
        x: radius + r * Math.cos(angleRad),
        y: radius + r * Math.sin(angleRad),
      };
    }
  };

  const handleInteraction = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    if (pickerShape === 'square') {
      const s = clamp(px / size, 0, 1);
      const v = clamp(1 - (py / size), 0, 1);
      const h = currentH;

      const rgb = hsvToRgb({ h, s, v });
      const hex = rgbToHex(rgb);
      const oklch = hexToOklch(hex);

      onColorChange(oklch, { h, s, v });
    } 
    else if (pickerShape === 'triangle') {
      const x = px - radius;
      const y = py - radius;
      const r = Math.sqrt(x * x + y * y);
      const R_tri = radius * 0.72;

      // If user clicks far outside the triangle bounds, handle Hue change on the ring
      if (r > R_tri + 4) {
        let h = Math.atan2(y, x) * (180 / Math.PI);
        if (h < 0) h += 360;
        const s = activeHsv.s;
        const v = activeHsv.v;

        const rgb = hsvToRgb({ h, s, v });
        const hex = rgbToHex(rgb);
        const oklch = hexToOklch(hex);
        onColorChange(oklch, { h, s, v });
      } 
      else {
        // Dragging inside the SV triangle
        const Ax = radius;
        const Ay = radius - R_tri;
        const Bx = radius + R_tri * Math.cos(5 * Math.PI / 6);
        const By = radius + R_tri * Math.sin(5 * Math.PI / 6);
        const Cx = radius + R_tri * Math.cos(Math.PI / 6);
        const Cy = radius + R_tri * Math.sin(Math.PI / 6);

        const denom = (By - Cy) * (Ax - Cx) + (Cx - Bx) * (Ay - Cy);
        let w_A = ((By - Cy) * (px - Cx) + (Cx - Bx) * (py - Cy)) / denom;
        let w_B = ((Cy - Ay) * (px - Cx) + (Ax - Cx) * (py - Cy)) / denom;
        let w_C = 1 - w_A - w_B;

        // Clamp and normalize weights to project any coordinate inside the triangle
        w_A = Math.max(0, Math.min(1, w_A));
        w_B = Math.max(0, Math.min(1, w_B));
        w_C = Math.max(0, Math.min(1, w_C));
        const sum = w_A + w_B + w_C;
        if (sum > 0) {
          w_A /= sum;
          w_B /= sum;
          w_C /= sum;
        } else {
          w_A = 0; w_B = 0; w_C = 1;
        }

        const v = w_A + w_B;
        const s = v > 0 ? w_A / v : 0;
        const h = currentH;

        const rgb = hsvToRgb({ h, s, v });
        const hex = rgbToHex(rgb);
        const oklch = hexToOklch(hex);
        onColorChange(oklch, { h, s, v });
      }
    } 
    else {
      // Circle mode
      const x = px - radius;
      const y = py - radius;
      const r = Math.sqrt(x * x + y * y);
      const s = clamp(r / radius, 0, 1);

      let h = Math.atan2(y, x) * (180 / Math.PI);
      if (h < 0) h += 360;

      const v = currentV;

      const rgb = hsvToRgb({ h, s, v });
      const hex = rgbToHex(rgb);
      const oklch = hexToOklch(hex);

      onColorChange(oklch, { h, s, v });
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

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        onInteractionEnd?.();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, onInteractionEnd]);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  return (
    <div className="color-wheel-wrapper">
      <div 
        ref={containerRef}
        className="color-wheel-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          width: size,
          height: size,
          position: 'relative',
          cursor: 'crosshair',
          userSelect: 'none',
        }}
      >
        {/* Canvas background displaying color spectrum */}
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            borderRadius: pickerShape === 'square' ? '4px' : '50%',
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
          borderRadius: pickerShape === 'square' ? '4px' : '50%',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          pointerEvents: 'none',
        }} />

        {/* Small nodes for other colors in the palette */}
        {colors.map((color) => {
          if (activeColor && color.id === activeColor.id) return null;
          
          const coords = getCoordinates(color.oklch, color.hex);
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
                <div style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: '#000000',
                }} />
              )}
            </button>
          );
        })}

        {/* Beautiful target crosshair for active selector node */}
        {activeColor && (() => {
          const activeCoords = getCoordinates(activeColor.oklch, activeColor.hex);
          return (
            <div
              style={{
                position: 'absolute',
                left: activeCoords.x,
                top: activeCoords.y,
                transform: 'translate(-50%, -50%)',
                width: 32,
                height: 32,
                pointerEvents: 'none',
                zIndex: 40,
              }}
            >
              {/* Center point filled with active color */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: activeColor.hex,
                border: '1.5px solid #ffffff',
                boxShadow: '0 0 3px rgba(0,0,0,0.6)',
              }} />
              {/* Outer target scope circle */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: '1px solid #ffffff',
                boxShadow: '0 0 2px rgba(0,0,0,0.4)',
              }} />
              {/* Horizontal line */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 28,
                height: 1,
                background: 'rgba(255, 255, 255, 0.7)',
              }} />
              {/* Vertical line */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 1,
                height: 28,
                background: 'rgba(255, 255, 255, 0.7)',
              }} />
            </div>
          );
        })()}
      </div>
      
      {/* Lightness slider for the wheel */}
      {activeColor && !hideLightnessSlider && (
        <div className="wheel-lightness-slider" style={{ marginTop: '16px', width: '100%' }}>
          <div className="slider-label-row">
            <span>LIGHTNESS (SLICE)</span>
            <span>{Math.round(activeColor.oklch.l * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.96"
            step="0.01"
            value={activeColor.oklch.l}
            onChange={(e) => {
              onColorChange({
                ...activeColor.oklch,
                l: parseFloat(e.target.value),
              });
            }}
            className="panel-slider"
          />
        </div>
      )}
    </div>
  );
}
