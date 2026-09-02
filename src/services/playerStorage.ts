/**
 * Player Storage Service
 * Handles cloud database persistence for 'jugadores_bingo' using Supabase.
 * Strictly stores: id, nombre, apellido, cedula, correo, telefono, fechaNacimiento, fechaRegistro.
 * No photo/avatar/image properties.
 */

import { supabase } from './supabaseClient';
import { mobileCacheManager } from './mobileCacheManager';

export interface JugadorBingo {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  correo: string;
  telefono: string;
  fechaNacimiento: string;
  fechaRegistro?: string;
  password?: string;
}

// Caché en memoria para acceso rápido y renderizado reactivo instantáneo
let cachedJugadores: JugadorBingo[] = [];

/**
 * Normaliza cualquier registro proveniente de Supabase a la interfaz JugadorBingo
 */
function mapToJugadorBingo(item: any): JugadorBingo {
  let nombre = (item.nombre || item.name || item.first_name || item.firstName || '').trim();
  let apellido = (item.apellido || item.last_name || item.lastName || '').trim();
  if (!apellido && nombre.includes(' ')) {
    const parts = nombre.split(' ');
    nombre = parts[0];
    apellido = parts.slice(1).join(' ');
  }

  return {
    id: String(item.id || `jug-${Date.now()}`),
    nombre: nombre || 'Jugador',
    apellido: apellido || '',
    cedula: String(item.cedula || item.document_id || item.documentId || '').trim().toUpperCase(),
    correo: String(item.correo || item.email || '').trim().toLowerCase(),
    telefono: String(item.telefono || item.phone || '0412-0000000').trim(),
    fechaNacimiento: String(item.fecha_nacimiento || item.fechaNacimiento || item.birth_date || item.birthDate || '').trim(),
    fechaRegistro:
      item.fecha_registro ||
      item.fechaRegistro ||
      item.created_at ||
      item.createdAt ||
      new Date().toLocaleDateString('es-VE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    password: item.password || undefined,
  };
}

/**
 * Obtiene la lista de jugadores directamente desde Supabase en la nube
 */
export async function getJugadores(): Promise<JugadorBingo[]> {
  try {
    if (supabase.isConfigured || supabase.rawClient) {
      // 1. Intentar consultar en la tabla principal 'jugadores_bingo'
      const { data, error } = await supabase
        .from('jugadores_bingo')
        .select('*')
        .order('fecha_registro', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const formatted = data.map(mapToJugadorBingo);
        const maxUsers = mobileCacheManager.isLowMemoryDevice() ? 50 : 200;
        cachedJugadores = formatted.slice(0, maxUsers);
        return cachedJugadores;
      }

      // 2. Si la tabla alternativa 'jugadores' existe y tiene datos
      const { data: dataAlt, error: errorAlt } = await supabase
        .from('jugadores')
        .select('*')
        .order('created_at', { ascending: false });

      if (!errorAlt && Array.isArray(dataAlt) && dataAlt.length > 0) {
        const formatted = dataAlt.map(mapToJugadorBingo);
        const maxUsers = mobileCacheManager.isLowMemoryDevice() ? 50 : 200;
        cachedJugadores = formatted.slice(0, maxUsers);
        return cachedJugadores;
      }

      if (error && error.code !== 'PGRST116') {
        console.warn('[playerStorage] Consulta en jugadores_bingo:', error.message);
      }
    }
  } catch (error) {
    console.error('[playerStorage] Error al leer jugadores desde Supabase:', error);
  }

  return cachedJugadores;
}

/**
 * Acceso sincrónico a la última lista de jugadores obtenida
 */
export function getJugadoresSync(): JugadorBingo[] {
  return cachedJugadores;
}

/**
 * Guarda o actualiza un jugador directamente en Supabase y actualiza la caché local
 */
export async function saveJugador(
  jugador: Partial<JugadorBingo> & { id: string; cedula: string }
): Promise<JugadorBingo[]> {
  let nombre = (jugador.nombre || '').trim();
  let apellido = (jugador.apellido || '').trim();
  if (!apellido && nombre.includes(' ')) {
    const parts = nombre.split(' ');
    nombre = parts[0];
    apellido = parts.slice(1).join(' ');
  }

  const cleanRecord: JugadorBingo = {
    id: jugador.id,
    nombre: nombre || 'Jugador',
    apellido: apellido || '',
    cedula: jugador.cedula.trim().toUpperCase(),
    correo: (jugador.correo || '').trim().toLowerCase(),
    telefono: (jugador.telefono || '0412-0000000').trim(),
    fechaNacimiento: (jugador.fechaNacimiento || '').trim(),
    fechaRegistro:
      jugador.fechaRegistro ||
      new Date().toLocaleDateString('es-VE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    password: jugador.password || undefined,
  };

  try {
    if (supabase.isConfigured || supabase.rawClient) {
      const dbPayload: any = {
        id: cleanRecord.id,
        nombre: cleanRecord.nombre,
        apellido: cleanRecord.apellido,
        cedula: cleanRecord.cedula,
        correo: cleanRecord.correo,
        telefono: cleanRecord.telefono,
        fecha_nacimiento: cleanRecord.fechaNacimiento,
        fecha_registro: cleanRecord.fechaRegistro,
      };

      if (cleanRecord.password) {
        dbPayload.password = cleanRecord.password;
      }

      // Upsert en la tabla 'jugadores_bingo'
      const { error } = await supabase.from('jugadores_bingo').upsert(dbPayload, { onConflict: 'id' });

      if (error) {
        console.warn('[playerStorage] Fallback a tabla jugadores tras error en jugadores_bingo:', error.message);
        await supabase.from('jugadores').upsert(
          {
            id: cleanRecord.id,
            nombre: `${cleanRecord.nombre} ${cleanRecord.apellido}`.trim(),
            cedula: cleanRecord.cedula,
            correo: cleanRecord.correo,
            telefono: cleanRecord.telefono,
            fecha_nacimiento: cleanRecord.fechaNacimiento,
          },
          { onConflict: 'id' }
        );
      }
    }
  } catch (error) {
    console.error('[playerStorage] Error al guardar jugador en Supabase:', error);
  }

  // Actualizar caché en memoria
  const filtered = cachedJugadores.filter(
    (j) => j.id !== cleanRecord.id && j.cedula.toLowerCase() !== cleanRecord.cedula.toLowerCase()
  );
  cachedJugadores = [cleanRecord, ...filtered];

  // Notificación para actualización instantánea en la interfaz
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jugadores_bingo_updated', { detail: cachedJugadores }));
  }

  return cachedJugadores;
}

/**
 * Elimina un jugador de la base de datos Supabase y de la memoria
 */
export async function deleteJugador(id: string): Promise<JugadorBingo[]> {
  try {
    if (supabase.isConfigured || supabase.rawClient) {
      await supabase.from('jugadores_bingo').delete().eq('id', id);
      await supabase.from('jugadores').delete().eq('id', id);
    }
  } catch (error) {
    console.error('[playerStorage] Error al eliminar jugador en Supabase:', error);
  }

  cachedJugadores = cachedJugadores.filter((j) => j.id !== id);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jugadores_bingo_updated', { detail: cachedJugadores }));
  }

  return cachedJugadores;
}


