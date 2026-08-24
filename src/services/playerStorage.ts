/**
 * Player Storage Service
 * Handles persistence for 'jugadores_bingo' in localStorage.
 * Strictly stores: id, nombre, apellido, cedula, correo, telefono, fechaNacimiento, fechaRegistro.
 * No photo/avatar/image properties.
 */

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

const STORAGE_KEY_JUGADORES = 'jugadores_bingo';

/**
 * Lee la lista de jugadores desde localStorage con la key 'jugadores_bingo'
 * Limpia cualquier campo residual de foto/avatar/imagen.
 */
export function getJugadores(): JugadorBingo[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_JUGADORES);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => {
        let nombre = (item.nombre || '').trim();
        let apellido = (item.apellido || '').trim();
        if (!apellido && nombre.includes(' ')) {
          const parts = nombre.split(' ');
          nombre = parts[0];
          apellido = parts.slice(1).join(' ');
        }
        return {
          id: String(item.id || ''),
          nombre: nombre || 'Jugador',
          apellido: apellido || '',
          cedula: String(item.cedula || ''),
          correo: String(item.correo || item.email || ''),
          telefono: String(item.telefono || item.phone || ''),
          fechaNacimiento: String(item.fechaNacimiento || item.birthDate || ''),
          fechaRegistro: item.fechaRegistro || '',
          password: item.password || undefined,
        };
      });
    }
    return [];
  } catch (error) {
    console.error('Error al leer jugadores_bingo desde localStorage:', error);
    return [];
  }
}

/**
 * Guarda un jugador en localStorage bajo la key 'jugadores_bingo' y notifica a los oyentes.
 */
export function saveJugador(jugador: Partial<JugadorBingo> & { id: string; cedula: string }): JugadorBingo[] {
  try {
    const current = getJugadores();
    
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
      fechaRegistro: jugador.fechaRegistro || new Date().toLocaleDateString('es-VE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      password: jugador.password || undefined,
    };

    // Reemplaza si ya existe por ID o Cédula, o agrega al inicio
    const filtered = current.filter(
      (j) => j.id !== cleanRecord.id && j.cedula.toLowerCase() !== cleanRecord.cedula.toLowerCase()
    );
    const updated = [cleanRecord, ...filtered];
    localStorage.setItem(STORAGE_KEY_JUGADORES, JSON.stringify(updated));
    
    // Notificación en tiempo real para actualización instantánea sin recarga
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jugadores_bingo_updated', { detail: updated }));
    }
    return updated;
  } catch (error) {
    console.error('Error al guardar jugador en localStorage:', error);
    return getJugadores();
  }
}

/**
 * Elimina un jugador de localStorage
 */
export function deleteJugador(id: string): JugadorBingo[] {
  try {
    const current = getJugadores();
    const updated = current.filter((j) => j.id !== id);
    localStorage.setItem(STORAGE_KEY_JUGADORES, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jugadores_bingo_updated', { detail: updated }));
    }
    return updated;
  } catch (error) {
    console.error('Error al eliminar jugador:', error);
    return getJugadores();
  }
}

