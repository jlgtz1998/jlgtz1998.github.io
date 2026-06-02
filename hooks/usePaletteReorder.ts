'use client';

import { useCallback, useState } from 'react';
import { ColorData } from '../types';
import { moveColor } from '../lib/palette';

export function usePaletteReorder(
  colors: ColorData[],
  setColors: React.Dispatch<React.SetStateAction<ColorData[]>>,
  pushHistory: (newColors: ColorData[]) => void,
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartColors, setDragStartColors] = useState<ColorData[] | null>(null);

  const handleMoveColor = useCallback((fromIndex: number, toIndex: number) => {
    const nextColors = moveColor(colors, fromIndex, toIndex);
    setColors(nextColors);
    pushHistory(nextColors);
  }, [colors, setColors, pushHistory]);

  const handlePreviewMoveColor = useCallback((targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    setColors((currentColors) => {
      const fromIndex = currentColors.findIndex((c) => c.id === draggingId);
      const toIndex = currentColors.findIndex((c) => c.id === targetId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return currentColors;
      return moveColor(currentColors, fromIndex, toIndex);
    });
  }, [draggingId, setColors]);

  const finishDragReorder = useCallback(() => {
    if (draggingId && dragStartColors) {
      pushHistory(colors);
    }
    setDraggingId(null);
    setDragStartColors(null);
  }, [draggingId, dragStartColors, colors, pushHistory]);

  return {
    draggingId,
    setDraggingId,
    dragStartColors,
    setDragStartColors,
    handleMoveColor,
    handlePreviewMoveColor,
    finishDragReorder,
  };
}
