import { parseTodos } from './store';
import type { Todo } from './types';

const TODOS_KEY = 'todos';
const THEME_KEY = 'theme';

/**
 * localStorage throws in private browsing on some engines and when storage is
 * full, so every access here is guarded: losing persistence should never take
 * the whole app down with it.
 */
export function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(TODOS_KEY);
    if (!raw) return [];
    return parseTodos(JSON.parse(raw));
  } catch (error) {
    console.warn('Could not read saved tasks; starting empty.', error);
    return [];
  }
}

export function saveTodos(todos: readonly Todo[]): void {
  try {
    localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
  } catch (error) {
    console.warn('Could not save tasks.', error);
  }
}

export type Theme = 'light' | 'dark';

export function loadTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore: the theme is a convenience, not state we must keep */
  }
}
