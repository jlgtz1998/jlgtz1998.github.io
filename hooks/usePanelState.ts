'use client';

import { useState } from 'react';

export function usePanelState() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [contrastOpen, setContrastOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [slidersOpen, setSlidersOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return {
    settingsOpen,
    setSettingsOpen,
    exportOpen,
    setExportOpen,
    presetsOpen,
    setPresetsOpen,
    contrastOpen,
    setContrastOpen,
    identityOpen,
    setIdentityOpen,
    slidersOpen,
    setSlidersOpen,
    helpOpen,
    setHelpOpen,
  };
}
