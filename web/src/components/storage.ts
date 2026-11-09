/** localStorage que no truena si el navegador lo bloquea (modo privado, etc.). */
export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: el valor solo dura mientras la pestaña esté abierta */
  }
}
