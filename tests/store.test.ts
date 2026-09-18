import { describe, it, expect, beforeEach } from 'vitest';
import {
  TodoStore,
  countActive,
  matchesFilter,
  matchesSearch,
  parseTodos,
  selectVisible,
} from '../src/store';
import type { Todo } from '../src/types';

const todo = (overrides: Partial<Todo> & { id: string }): Todo => ({
  text: 'Task',
  priority: 'medium',
  category: 'general',
  completed: false,
  createdAt: 0,
  ...overrides,
});

describe('parseTodos', () => {
  it('returns an empty list for anything that is not an array', () => {
    expect(parseTodos(null)).toEqual([]);
    expect(parseTodos('[]')).toEqual([]);
    expect(parseTodos({ todos: [] })).toEqual([]);
  });

  it('drops entries with no usable text', () => {
    expect(parseTodos([{ text: '' }, { text: '   ' }, null, 42])).toEqual([]);
  });

  it('repairs unknown priorities and categories instead of trusting storage', () => {
    // localStorage is shared with every other page on the origin and survives
    // across versions of the app; its contents are input, not a guarantee.
    const [parsed] = parseTodos([{ id: '1', text: 'Buy milk', priority: 'urgent', category: 'x' }]);

    expect(parsed?.priority).toBe('medium');
    expect(parsed?.category).toBe('general');
    expect(parsed?.completed).toBe(false);
  });

  it('keeps valid records intact', () => {
    const [parsed] = parseTodos([
      { id: 'a', text: 'Ship it', priority: 'high', category: 'work', completed: true },
    ]);

    expect(parsed).toMatchObject({
      id: 'a',
      text: 'Ship it',
      priority: 'high',
      category: 'work',
      completed: true,
    });
  });

  it('coerces legacy numeric ids to strings', () => {
    const [parsed] = parseTodos([{ id: 1738245000000, text: 'Legacy task' }]);
    expect(parsed?.id).toBe('1738245000000');
  });
});

describe('selectors', () => {
  const todos = [
    todo({ id: '1', text: 'Write tests', completed: false, category: 'work' }),
    todo({ id: '2', text: 'Buy milk', completed: true, category: 'shopping' }),
    todo({ id: '3', text: 'Call the bank', completed: false, category: 'personal' }),
  ];

  it('filters by completion state', () => {
    expect(matchesFilter(todos[0]!, 'active')).toBe(true);
    expect(matchesFilter(todos[1]!, 'active')).toBe(false);
    expect(matchesFilter(todos[1]!, 'completed')).toBe(true);
    expect(matchesFilter(todos[1]!, 'all')).toBe(true);
  });

  it('matches everything on an empty or whitespace search', () => {
    expect(matchesSearch(todos[0]!, '')).toBe(true);
    expect(matchesSearch(todos[0]!, '   ')).toBe(true);
  });

  it('searches text case-insensitively and by category', () => {
    expect(matchesSearch(todos[0]!, 'WRITE')).toBe(true);
    expect(matchesSearch(todos[1]!, 'shopping')).toBe(true);
    expect(matchesSearch(todos[1]!, 'write')).toBe(false);
  });

  it('combines filter and search', () => {
    const visible = selectVisible({ todos, filter: 'active', search: 'call' });
    expect(visible.map((t) => t.id)).toEqual(['3']);
  });

  it('counts active tasks regardless of the current filter', () => {
    expect(countActive({ todos, filter: 'completed', search: 'nothing' })).toBe(2);
  });
});

describe('TodoStore', () => {
  let store: TodoStore;

  beforeEach(() => {
    store = new TodoStore();
  });

  it('adds a task to the front of the list', () => {
    store.add('First');
    store.add('Second');

    expect(store.getState().todos.map((t) => t.text)).toEqual(['Second', 'First']);
  });

  it('trims input and refuses blank tasks', () => {
    expect(store.add('  Padded  ')?.text).toBe('Padded');
    expect(store.add('   ')).toBeNull();
    expect(store.getState().todos).toHaveLength(1);
  });

  it('gives every task a distinct id', () => {
    // Ids used to be `Date.now()`, so two tasks added in the same millisecond
    // collided and toggling one toggled the other.
    const ids = new Set(Array.from({ length: 50 }, () => store.add('Task')?.id));
    expect(ids.size).toBe(50);
  });

  it('toggles only the task it was given', () => {
    const a = store.add('A')!;
    const b = store.add('B')!;
    store.toggle(a.id);

    const state = store.getState();
    expect(state.todos.find((t) => t.id === a.id)?.completed).toBe(true);
    expect(state.todos.find((t) => t.id === b.id)?.completed).toBe(false);
  });

  it('removes a task and ignores unknown ids', () => {
    const a = store.add('A')!;
    store.remove('nope');
    expect(store.getState().todos).toHaveLength(1);

    store.remove(a.id);
    expect(store.getState().todos).toHaveLength(0);
  });

  it('updates fields and rejects an empty replacement text', () => {
    const a = store.add('Original')!;

    store.update(a.id, { text: 'Renamed', priority: 'high' });
    expect(store.getState().todos[0]).toMatchObject({ text: 'Renamed', priority: 'high' });

    store.update(a.id, { text: '   ' });
    expect(store.getState().todos[0]?.text).toBe('Renamed');
  });

  it('clears only completed tasks', () => {
    const a = store.add('Keep')!;
    const b = store.add('Drop')!;
    store.toggle(b.id);
    store.clearCompleted();

    expect(store.getState().todos.map((t) => t.id)).toEqual([a.id]);
  });

  it('notifies subscribers on every change and stops after unsubscribe', () => {
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });

    store.add('A');
    store.setFilter('completed');
    expect(calls).toBe(2);

    unsubscribe();
    store.add('B');
    expect(calls).toBe(2);
  });

  describe('reorderVisible', () => {
    it('reorders the tasks it is given', () => {
      const a = store.add('A')!;
      const b = store.add('B')!;
      const c = store.add('C')!;
      // Current order is C, B, A.
      store.reorderVisible([a.id, b.id, c.id]);

      expect(store.getState().todos.map((t) => t.text)).toEqual(['A', 'B', 'C']);
    });

    it('keeps tasks hidden by a filter', () => {
      // The old drag handler rebuilt the array from the ids present in the DOM,
      // so dragging while a filter was active deleted every hidden task.
      const keep = store.add('Completed and hidden')!;
      store.toggle(keep.id);
      const a = store.add('A')!;
      const b = store.add('B')!;

      store.setFilter('active');
      expect(selectVisible(store.getState()).map((t) => t.id)).toEqual([b.id, a.id]);

      store.reorderVisible([a.id, b.id]);

      const texts = store.getState().todos.map((t) => t.text);
      expect(texts).toContain('Completed and hidden');
      expect(texts).toHaveLength(3);
      expect(selectVisible(store.getState()).map((t) => t.text)).toEqual(['A', 'B']);
    });

    it('ignores ids that are not in the store', () => {
      const a = store.add('A')!;
      store.reorderVisible(['ghost', a.id]);

      expect(store.getState().todos.map((t) => t.id)).toEqual([a.id]);
    });

    it('does nothing for an empty order', () => {
      store.add('A');
      const before = store.getState().todos;
      store.reorderVisible([]);

      expect(store.getState().todos).toEqual(before);
    });
  });
});
