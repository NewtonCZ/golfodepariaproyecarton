/**
 * Player Storage Service
 * Handles cloud database persistence for 'profiles' using Supabase.
 * Strictly stores: id, nombre, apellido, cedula, correo, telefono, fechaNacimiento, fechaRegistro.
 * No photo/avatar/image properties.
 *
 * NOTA: La única tabla fuente de verdad es 'profiles'.
 * Las tablas 'users', 'jugadores' y 'perfiles' están deprecadas.
 */

import { supabase } from './supabaseClient';

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
  saldo?: number;
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
    fechaNacimiento: String(
      item.fecha_nacimiento || item.fechaNacimiento || item.birth_date || item.birthDate || ''
    ).trim(),
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
    saldo: Number(item.saldo ?? item.available_balance ?? item.balance ?? 0),
  };
}

/**
 * Obtiene la lista de jugadores directamente desde Supabase en la nube
 */
export async function getJugadores(): Promise<JugadorBingo[]> {
  try {
    if (supabase.isConfigured || supabase.rawClient) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') {
        console.warn('[playerStorage] Consulta en profiles:', error.message);
      }

      if (!error && Array.isArray(data) && data.length > 0) {
        const formatted = data.map(mapToJugadorBingo);
        cachedJugadores = formatted;
        return formatted;
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
 * Guarda o actualiza un jugador directamente en Supabase y actualiza la caché local.
 * Única tabla destino: 'profiles'.
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
        email: cleanRecord.correo,
        telefono: cleanRecord.telefono,
      };

      // Único upsert: 'profiles' es la fuente de verdad
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(dbPayload, { onConflict: 'id' });

      if (profileError) {
        console.error('[playerStorage] Error en upsert profiles:', profileError);
        throw profileError;
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
    window.dispatchEvent(new CustomEvent('profiles_updated', { detail: cachedJugadores }));
  }

  return cachedJugadores;
}

export async function deleteJugador(id: string): Promise<JugadorBingo[]> {
  try {
    if (supabase.isConfigured || supabase.rawClient) {
      // ✅ Solo borrar de 'profiles'
      await supabase.from('profiles').delete().eq('id', id);
    }
  } catch (error) {
    console.error('[playerStorage] Error al eliminar jugador en Supabase:', error);
  }

  cachedJugadores = cachedJugadores.filter((j) => j.id !== id);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('profiles_updated', { detail: cachedJugadores }));
  }

  return cachedJugadores;
}
