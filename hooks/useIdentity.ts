'use client';

import { useState, useEffect } from 'react';
import { UserIdentity } from '../types';

const DEFAULT_IDENTITY: UserIdentity = {
  temperature: 40,
  chroma: 30,
  contrast: 50,
  experimentality: 30,
};

const IDENTITY_KEY = 'cran3o_identity';

export function useIdentity(mounted: boolean) {
  const [identity, setIdentity] = useState<UserIdentity>(() => {
    if (typeof window === 'undefined') return DEFAULT_IDENTITY;
    try {
      const saved = localStorage.getItem(IDENTITY_KEY);
      return saved ? (JSON.parse(saved) as UserIdentity) : DEFAULT_IDENTITY;
    } catch {
      return DEFAULT_IDENTITY;
    }
  });

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  }, [identity, mounted]);

  return {
    identity,
    setIdentity,
  };
}
