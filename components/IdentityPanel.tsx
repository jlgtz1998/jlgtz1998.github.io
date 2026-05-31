'use client';

import React from 'react';
import { UserIdentity } from '../types';
import MaterialIcon from './MaterialIcon';

interface IdentityPanelProps {
  identity: UserIdentity;
  onIdentityChange: (updated: UserIdentity) => void;
  onGenerateFromIdentity: () => void;
}

export default function IdentityPanel({
  identity,
  onIdentityChange,
  onGenerateFromIdentity,
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
    { key: 'neutralExpressive', leftLabel: 'Neutral', rightLabel: 'Expressive' },
    { key: 'coolWarm', leftLabel: 'Cool', rightLabel: 'Warm' },
    { key: 'mutedSaturated', leftLabel: 'Muted', rightLabel: 'Saturated' },
    { key: 'contrast', leftLabel: 'Soft contrast', rightLabel: 'Strong contrast' },
    { key: 'experimentality', leftLabel: 'Timeless', rightLabel: 'Experimental' },
    { key: 'discipline', leftLabel: 'Architectural', rightLabel: 'Graphic' },
    { key: 'tactileGlossy', leftLabel: 'Tactile', rightLabel: 'Glossy' },
    { key: 'futurism', leftLabel: 'Understated futurism', rightLabel: 'Visible futurism' },
  ];

  return (
    <div className="identity-panel">
      <div className="panel-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 className="section-title">MY COLOR IDENTITY</h3>
          <p className="section-description">Shape future palettes around your preferred temperature, contrast, and material attitude.</p>
        </div>
        <button
          onClick={onGenerateFromIdentity}
          className="action-btn accent-glow"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Generate a brand new palette using your color identity parameters"
        >
          <MaterialIcon name="refresh" size={16} />
          GENERATE
        </button>
      </div>

      <div className="identity-sliders-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {slidersList.map((slider) => (
          <div key={slider.key} className="blender-slider-wrapper">
            <input
              type="range"
              min="0"
              max="100"
              value={identity[slider.key]}
              onChange={(e) => handleSliderChange(slider.key, parseInt(e.target.value))}
              className="blender-slider"
              style={{ '--value-percent': `${identity[slider.key]}%` } as React.CSSProperties}
            />
            <div className="blender-slider-overlay" style={{ padding: '0 8px' }}>
              <span className="blender-slider-label" style={{ fontSize: '0.62rem', opacity: 0.75 }}>{slider.leftLabel}</span>
              <span className="blender-slider-value" style={{ fontSize: '0.68rem', fontWeight: 700 }}>{identity[slider.key]}%</span>
              <span className="blender-slider-label" style={{ fontSize: '0.62rem', opacity: 0.75 }}>{slider.rightLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
