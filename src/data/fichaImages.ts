// src/data/fichaImages.ts
import React from 'react';

/**
 * URL centralizada para las imágenes de fichas.
 * Las imágenes están en public/fichas/ como {id}.png (con transparencia).
 * También hay versión AVIF optimizada: {id}.avif
 * Si mañana migrás a Supabase Storage, cambiás SOLO esta línea.
 */
export const getFichaImageUrl = (id: number) => `/fichas/${id}.png`;
export const getFichaImageAvifUrl = (id: number) => `/fichas/${id}.avif`;

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
