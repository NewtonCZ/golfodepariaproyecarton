export interface Animalito {
  id: number;
  name: string;
  emoji: string;
}

export const ANIMALITOS_POOL: Animalito[] = [
  { id: 1, name: 'León', emoji: '🦁' },
  { id: 2, name: 'Tigre', emoji: '🐯' },
  { id: 3, name: 'Elefante', emoji: '🐘' },
  { id: 4, name: 'Oso', emoji: '🐻' },
  { id: 5, name: 'Zorro', emoji: '🦊' },
  { id: 6, name: 'Perro', emoji: '🐶' },
  { id: 7, name: 'Gato', emoji: '🐱' },
  { id: 8, name: 'Caballo', emoji: '🐴' },
  { id: 9, name: 'Águila', emoji: '🦅' },
  { id: 10, name: 'Delfín', emoji: '🐬' },
  { id: 11, name: 'Ballena', emoji: '🐋' },
  { id: 12, name: 'Mono', emoji: '🐵' },
  { id: 13, name: 'Loro', emoji: '🦜' },
  { id: 14, name: 'Serpiente', emoji: '🐍' },
  { id: 15, name: 'Búho', emoji: '🦉' },
  { id: 16, name: 'Pingüino', emoji: '🐧' },
  { id: 17, name: 'Cebra', emoji: '🦓' },
  { id: 18, name: 'Jirafa', emoji: '🦒' },
  { id: 19, name: 'Lobo', emoji: '🐺' },
  { id: 20, name: 'Canguro', emoji: '🦘' },
  { id: 21, name: 'Koala', emoji: '🐨' },
  { id: 22, name: 'Pato', emoji: '🦆' },
  { id: 23, name: 'Conejo', emoji: '🐰' },
  { id: 24, name: 'Tortuga', emoji: '🐢' },
  { id: 25, name: 'Mariposa', emoji: '🦋' },
];

export const getAnimalitoById = (id: number): Animalito | undefined => {
  return ANIMALITOS_POOL.find((a) => a.id === id);
};

export const MULTIPLICADORES = [2, 3, 5, 8, 10, 12, 15] as const;
export type Multiplicador = (typeof MULTIPLICADORES)[number];

export const MONTO_MINIMO = 50;
export const MONTO_MAXIMO = 10000;
