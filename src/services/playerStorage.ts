/**
 * Profile Storage Service
 * Handles cloud database persistence for 'profiles' using Supabase.
 * Strictly stores: id, nombre, apellido, cedula, correo, email, telefono, fecha_nacimiento, is_of_age.
 * No photo/avatar/image properties.
 *
 * NOTA: La única tabla fuente de verdad es 'profiles'.
 * Las tablas 'users', 'jugadores' y 'perfiles' están deprecadas.
 */

import { supabase } from './supabaseClient';

export interface Profile {
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
let cachedProfiles: Profile[] = [];

/**
 * Normaliza cualquier registro proveniente de Supabase a la interfaz Profile
 */
function mapToProfile(item: any): Profile {
  let nombre = (item.nombre || item.name || item.first_name || item.firstName || '').trim();
  let apellido = (item.apellido || item.last_name || item.lastName || '').trim();
  if (!apellido && nombre.includes(' ')) {
    const parts = nombre.split(' ');
    nombre = parts[0];
    apellido = parts.slice(1).join(' ');
  }

  return {
    id: String(item.id || `prof-${Date.now()}`),
    nombre: nombre || 'Usuario',
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
 * Obtiene la lista de profiles directamente desde Supabase en la nube
 */
export async function getProfiles(): Promise<Profile[]> {
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
        const formatted = data.map(mapToProfile);
        cachedProfiles = formatted;
        return formatted;
      }
    }
  } catch (error) {
    console.error('[playerStorage] Error al leer profiles desde Supabase:', error);
  }

  return cachedProfiles;
}

/**
 * Acceso sincrónico a la última lista de profiles obtenida
 */
export function getProfilesSync(): Profile[] {
  return cachedProfiles;
}

/**
 * Guarda o actualiza un profile directamente en Supabase y actualiza la caché local.
 * Única tabla destino: 'profiles'.
 */
export async function saveProfile(
  profile: Partial<Profile> & { id: string; cedula: string }
): Promise<Profile[]> {
  let nombre = (profile.nombre || '').trim();
  let apellido = (profile.apellido || '').trim();
  if (!apellido && nombre.includes(' ')) {
    const parts = nombre.split(' ');
    nombre = parts[0];
    apellido = parts.slice(1).join(' ');
  }

  const cleanRecord: Profile = {
    id: profile.id,
    nombre: nombre || 'Usuario',
    apellido: apellido || '',
    cedula: profile.cedula.trim().toUpperCase(),
    correo: (profile.correo || '').trim().toLowerCase(),
    telefono: (profile.telefono || '0412-0000000').trim(),
    fechaNacimiento: (profile.fechaNacimiento || '').trim(),
    fechaRegistro:
      profile.fechaRegistro ||
      new Date().toLocaleDateString('es-VE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    password: profile.password || undefined,
  };

  try {
    if (supabase.isConfigured || supabase.rawClient) {
      const dbPayload: any = {
        id: cleanRecord.id,
        nombre: cleanRecord.nombre,
        apellido: cleanRecord.apellido,
        cedula: cleanRecord.cedula,
        correo: cleanRecord.correo,
        email: cleanRecord.correo,
        telefono: cleanRecord.telefono,
      };

      // Solo agregar fecha_nacimiento si existe
      if (cleanRecord.fechaNacimiento) {
        dbPayload.fecha_nacimiento = cleanRecord.fechaNacimiento;
        dbPayload.is_of_age = true;
      }

      // Upsert: 'profiles' es la fuente de verdad
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(dbPayload, { onConflict: 'id' });

      if (profileError) {
        console.error('[playerStorage] Error en upsert profiles:', profileError);
        throw profileError;
      }
    }
  } catch (error) {
    console.error('[playerStorage] Error al guardar profile en Supabase:', error);
  }

  // Actualizar caché en memoria
  const filtered = cachedProfiles.filter(
    (p) => p.id !== cleanRecord.id && p.cedula.toLowerCase() !== cleanRecord.cedula.toLowerCase()
  );
  cachedProfiles = [cleanRecord, ...filtered];

  // Notificación para actualización instantánea en la interfaz
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('profiles_updated', { detail: cachedProfiles }));
  }

  return cachedProfiles;
}

export async function deleteProfile(id: string): Promise<Profile[]> {
  try {
    if (supabase.isConfigured || supabase.rawClient) {
      await supabase.from('profiles').delete().eq('id', id);
    }
  } catch (error) {
    console.error('[playerStorage] Error al eliminar profile en Supabase:', error);
  }

  cachedProfiles = cachedProfiles.filter((p) => p.id !== id);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('profiles_updated', { detail: cachedProfiles }));
  }

  return cachedProfiles;
}

// ============================================================
// ALIAS DE COMPATIBILIDAD (para no romper imports viejos)
// ============================================================

/** @deprecated Usar getProfiles() */
export const getJugadores = getProfiles;

/** @deprecated Usar getProfilesSync() */
export const getJugadoresSync = getProfilesSync;

/** @deprecated Usar saveProfile() */
export const saveJugador = saveProfile;

/** @deprecated Usar deleteProfile() */
export const deleteJugador = deleteProfile;

/** @deprecated Usar Profile */
export type JugadorBingo = Profile;
