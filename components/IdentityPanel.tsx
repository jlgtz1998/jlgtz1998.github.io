'use client';

import React from 'react';
import { UserIdentity } from '../types';

interface IdentityPanelProps {
  identity: UserIdentity;
  onIdentityChange: (updated: UserIdentity) => void;
  onInteractionEnd: () => void;
}

export default function IdentityPanel({
  identity,
  onIdentityChange,
  onInteractionEnd,
}: IdentityPanelProps) {
  
  const handleSliderChange = (key: keyof UserIdentity, value: number) => {
    onIdentityChange({
      ...identity,
      [key]: value,
    });
  };

  const slidersList: {
    key: keyof UserIdentity;
    leftLabel: string;
    rightLabel: string;
  }[] = [
    { key: 'temperature', leftLabel: 'COOL', rightLabel: 'WARM' },
    { key: 'chroma', leftLabel: 'MUTED', rightLabel: 'SATURATED' },
    { key: 'contrast', leftLabel: 'SOFT CONTRAST', rightLabel: 'STRONG CONTRAST' },
    { key: 'experimentality', leftLabel: 'CLASSIC', rightLabel: 'EXPERIMENTAL' },
  ];

  return (
    <div className="identity-panel">
      <div className="identity-sliders-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {slidersList.map((slider) => (
          <div key={slider.key} className="blender-slider-wrapper">
            <input
              type="range"
              min="0"
              max="100"
              value={identity[slider.key] ?? 50}
              onChange={(e) => handleSliderChange(slider.key, parseInt(e.target.value))}
              onMouseUp={onInteractionEnd}
              onTouchEnd={onInteractionEnd}
              className="blender-slider"
              style={{ '--value-percent': `${identity[slider.key] ?? 50}%` } as React.CSSProperties}
            />
            <div className="blender-slider-overlay" style={{ padding: '0 8px' }}>
              <span className="blender-slider-label" style={{ fontSize: '0.62rem', opacity: 0.75 }}>{slider.leftLabel}</span>
              <span className="blender-slider-value" style={{ fontSize: '0.68rem', fontWeight: 700 }}>{identity[slider.key] ?? 50}%</span>
              <span className="blender-slider-label" style={{ fontSize: '0.62rem', opacity: 0.75 }}>{slider.rightLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
