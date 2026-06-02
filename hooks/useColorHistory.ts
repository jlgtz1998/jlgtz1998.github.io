'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ColorData, SlidersState } from '../types';
import { NEUTRAL_SLIDERS } from '../lib/variation';

const MAX_HISTORY_STEPS = 50;

export function useColorHistory(
  colors: ColorData[],
  setColors: React.Dispatch<React.SetStateAction<ColorData[]>>,
  setSliders: React.Dispatch<React.SetStateAction<SlidersState>>,
  activeColorId: string | null,
  setActiveColorId: React.Dispatch<React.SetStateAction<string | null>>,
) {
  const [history, setHistory] = useState<ColorData[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const undoRedoRef = useRef<{ undo: () => void; redo: () => void }>({
    undo: () => {},
    redo: () => {},
  });

  const pushHistory = useCallback(
    (newColors: ColorData[]) => {
      const cleanHistory = history.slice(0, historyIndex + 1);
      if (cleanHistory.length > 0) {
        const last = cleanHistory[cleanHistory.length - 1];
        if (
          last.length === newColors.length &&
          last.every(
            (c, idx) =>
              c.hex === newColors[idx]?.hex &&
              c.locked === newColors[idx]?.locked &&
              c.role === newColors[idx]?.role &&
              c.displayName === newColors[idx]?.displayName,
          )
        ) {
          return;
        }
      }
      const nextHistory = [...cleanHistory, newColors].slice(-MAX_HISTORY_STEPS);
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    },
    [history, historyIndex],
  );

  const updateColorsAndPushHistory = useCallback(
    (nextColors: ColorData[]) => {
      setColors(nextColors);
      const cleanHistory = history.slice(0, historyIndex + 1);
      if (cleanHistory.length > 0) {
        const last = cleanHistory[cleanHistory.length - 1];
        if (
          last.length === nextColors.length &&
          last.every(
            (c, idx) =>
              c.hex === nextColors[idx]?.hex &&
              c.locked === nextColors[idx]?.locked &&
              c.role === nextColors[idx]?.role &&
              c.displayName === nextColors[idx]?.displayName,
          )
        ) {
          return;
        }
      }
      const nextHistory = [...cleanHistory, nextColors].slice(-MAX_HISTORY_STEPS);
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    },
    [history, historyIndex, setColors],
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const prevColors = history[nextIndex];
      setColors(prevColors);
      setHistoryIndex(nextIndex);
      setSliders(NEUTRAL_SLIDERS);
      if (activeColorId && !prevColors.some((c) => c.id === activeColorId)) {
        setActiveColorId(prevColors[Math.min(4, prevColors.length - 1)]?.id ?? null);
      }
    }
  }, [historyIndex, history, activeColorId, setColors, setSliders, setActiveColorId]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextColors = history[nextIndex];
      setColors(nextColors);
      setHistoryIndex(nextIndex);
      setSliders(NEUTRAL_SLIDERS);
      if (activeColorId && !nextColors.some((c) => c.id === activeColorId)) {
        setActiveColorId(nextColors[Math.min(4, nextColors.length - 1)]?.id ?? null);
      }
    }
  }, [historyIndex, history, activeColorId, setColors, setSliders, setActiveColorId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          undoRedoRef.current.undo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          undoRedoRef.current.redo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoRedoRef.current.redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    undoRedoRef.current.undo = handleUndo;
    undoRedoRef.current.redo = handleRedo;
  }, [handleUndo, handleRedo]);

  return {
    history,
    setHistory,
    historyIndex,
    setHistoryIndex,
    pushHistory,
    updateColorsAndPushHistory,
    handleUndo,
    handleRedo,
  };
}
