export const PRIORITIES = ['low', 'medium', 'high'] as const;
export const CATEGORIES = ['general', 'work', 'personal', 'shopping'] as const;
export const FILTERS = ['all', 'active', 'completed'] as const;

export type Priority = (typeof PRIORITIES)[number];
export type Category = (typeof CATEGORIES)[number];
export type Filter = (typeof FILTERS)[number];

export interface Todo {
  id: string;
  text: string;
  priority: Priority;
  category: Category;
  completed: boolean;
  createdAt: number;
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value);
}

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

export function isFilter(value: unknown): value is Filter {
  return typeof value === 'string' && (FILTERS as readonly string[]).includes(value);
}
