import {
  isCategory,
  isPriority,
  type Category,
  type Filter,
  type Priority,
  type Todo,
} from './types';

export interface TodoState {
  todos: Todo[];
  filter: Filter;
  search: string;
}

type Listener = (state: TodoState) => void;

function newId(): string {
  // `Date.now()` was the previous id: two tasks added in the same millisecond
  // shared an id, and then toggling one toggled the other.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Turns whatever is in localStorage into valid todos.
 *
 * Storage is shared with every other page on the origin and survives across
 * versions of this app, so its contents are untrusted input, not a guarantee.
 */
export function parseTodos(raw: unknown): Todo[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): Todo[] => {
    if (typeof item !== 'object' || item === null) return [];
    const candidate = item as Record<string, unknown>;
    if (typeof candidate['text'] !== 'string' || candidate['text'].trim() === '') return [];

    return [
      {
        id:
          typeof candidate['id'] === 'string'
            ? candidate['id']
            : String(candidate['id'] ?? newId()),
        text: candidate['text'],
        priority: isPriority(candidate['priority']) ? candidate['priority'] : 'medium',
        category: isCategory(candidate['category']) ? candidate['category'] : 'general',
        completed: candidate['completed'] === true,
        createdAt: typeof candidate['createdAt'] === 'number' ? candidate['createdAt'] : Date.now(),
      },
    ];
  });
}

export function matchesFilter(todo: Todo, filter: Filter): boolean {
  if (filter === 'active') return !todo.completed;
  if (filter === 'completed') return todo.completed;
  return true;
}

export function matchesSearch(todo: Todo, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (needle === '') return true;
  return todo.text.toLowerCase().includes(needle) || todo.category.includes(needle);
}

export function selectVisible(state: TodoState): Todo[] {
  return state.todos.filter(
    (todo) => matchesFilter(todo, state.filter) && matchesSearch(todo, state.search),
  );
}

export function countActive(state: TodoState): number {
  return state.todos.filter((todo) => !todo.completed).length;
}

export class TodoStore {
  private state: TodoState;
  private readonly listeners = new Set<Listener>();

  constructor(initial: Partial<TodoState> = {}) {
    this.state = {
      todos: initial.todos ?? [],
      filter: initial.filter ?? 'all',
      search: initial.search ?? '',
    };
  }

  getState(): Readonly<TodoState> {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private commit(next: Partial<TodoState>): void {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener(this.state);
  }

  add(text: string, priority: Priority = 'medium', category: Category = 'general'): Todo | null {
    const trimmed = text.trim();
    if (trimmed === '') return null;

    const todo: Todo = {
      id: newId(),
      text: trimmed,
      priority,
      category,
      completed: false,
      createdAt: Date.now(),
    };
    this.commit({ todos: [todo, ...this.state.todos] });
    return todo;
  }

  toggle(id: string): void {
    this.commit({
      todos: this.state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    });
  }

  remove(id: string): void {
    this.commit({ todos: this.state.todos.filter((todo) => todo.id !== id) });
  }

  update(id: string, changes: Partial<Pick<Todo, 'text' | 'priority' | 'category'>>): void {
    const text = changes.text?.trim();
    if (changes.text !== undefined && text === '') return;

    this.commit({
      todos: this.state.todos.map((todo) =>
        todo.id === id ? { ...todo, ...changes, ...(text ? { text } : {}) } : todo,
      ),
    });
  }

  clearCompleted(): void {
    this.commit({ todos: this.state.todos.filter((todo) => !todo.completed) });
  }

  setFilter(filter: Filter): void {
    this.commit({ filter });
  }

  setSearch(search: string): void {
    this.commit({ search });
  }

  /**
   * Reorders the todos named in `visibleOrder`, leaving every other todo where
   * it is.
   *
   * The old drag-and-drop handler rebuilt the whole array from the ids present
   * in the DOM. With a filter or a search active the DOM holds only the
   * matching subset, so a single drag silently deleted every hidden task.
   */
  reorderVisible(visibleOrder: readonly string[]): void {
    const known = new Set(this.state.todos.map((t) => t.id));
    const queue = visibleOrder.filter((id) => known.has(id));
    if (queue.length === 0) return;

    const slots = new Set(queue);
    let cursor = 0;

    const todos = this.state.todos.map((todo) => {
      if (!slots.has(todo.id)) return todo;
      const nextId = queue[cursor++];
      return this.state.todos.find((t) => t.id === nextId) ?? todo;
    });

    this.commit({ todos });
  }
}
