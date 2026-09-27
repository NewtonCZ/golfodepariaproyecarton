// src/data/fichaImages.ts
import React from 'react';

/**
 * URL centralizada para las imágenes de fichas.
 * Las imágenes están en public/fichas/ como {id}.jpg (PNG internamente, con transparencia).
 * Si mañana migrás a Supabase Storage, cambiás SOLO esta línea.
 */
export const getFichaImageUrl = (id: number) => `/fichas/${id}.jpg`;

/**
 * Fallback: si la imagen no carga, la oculta silenciosamente.
 * No muestra emoji (decisión del proyecto: sin emojis).
 */
export const handleFichaImageError = (
  e: React.SyntheticEvent<HTMLImageElement>
) => {
  const el = e.currentTarget;
  el.style.visibility = 'hidden';
};
