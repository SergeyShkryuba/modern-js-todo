import { describe, it, expect, beforeEach } from 'vitest';
import { createTodoElement, render, type RenderTargets } from '../src/render';
import type { Todo } from '../src/types';

const todo = (overrides: Partial<Todo> & { id: string }): Todo => ({
  text: 'Task',
  priority: 'medium',
  category: 'general',
  completed: false,
  createdAt: 0,
  ...overrides,
});

describe('createTodoElement', () => {
  it('renders the task text as text, never as markup', () => {
    // The previous renderer interpolated the task into an innerHTML template,
    // so a task named like this executed on every render — stored XSS in an
    // app that also keeps data in localStorage.
    const payload = '<img src=x onerror="globalThis.__pwned = true">';
    const li = createTodoElement(todo({ id: '1', text: payload }));
    document.body.append(li);

    expect(li.querySelector('img')).toBeNull();
    expect(li.textContent).toContain(payload);
    expect((globalThis as Record<string, unknown>)['__pwned']).toBeUndefined();
  });

  it('marks completed tasks and checks the box', () => {
    const li = createTodoElement(todo({ id: '1', completed: true }));

    expect(li.classList.contains('completed')).toBe(true);
    expect(li.querySelector<HTMLInputElement>('.toggle-cb')?.checked).toBe(true);
  });

  it('associates the label with the checkbox', () => {
    const li = createTodoElement(todo({ id: 'abc', text: 'Walk the dog' }));
    const checkbox = li.querySelector<HTMLInputElement>('.toggle-cb');
    const label = li.querySelector('label');

    expect(checkbox?.id).toBe('todo-abc');
    expect(label?.htmlFor).toBe('todo-abc');
    expect(label?.textContent).toBe('Walk the dog');
  });

  it('gives the icon-only buttons accessible names', () => {
    const li = createTodoElement(todo({ id: '1', text: 'Pay rent' }));

    expect(li.querySelector('.edit-btn')?.getAttribute('aria-label')).toBe('Edit "Pay rent"');
    expect(li.querySelector('.delete-btn')?.getAttribute('aria-label')).toBe('Delete "Pay rent"');
  });

  it('carries the priority through to the badge class', () => {
    const li = createTodoElement(todo({ id: '1', priority: 'high' }));
    expect(li.querySelector('.priority-badge')?.className).toContain('priority-high');
  });
});

describe('render', () => {
  let targets: RenderTargets;

  beforeEach(() => {
    document.body.innerHTML = `
      <ul id="list"></ul>
      <span id="left"></span>
      <div id="empty" class="hidden"></div>
    `;
    targets = {
      list: document.querySelector('#list') as HTMLUListElement,
      itemsLeft: document.querySelector('#left') as HTMLElement,
      emptyState: document.querySelector('#empty') as HTMLElement,
    };
  });

  it('renders only the visible tasks', () => {
    render(
      {
        todos: [
          todo({ id: '1', text: 'Active' }),
          todo({ id: '2', text: 'Done', completed: true }),
        ],
        filter: 'active',
        search: '',
      },
      targets,
    );

    expect(targets.list.querySelectorAll('.todo-item')).toHaveLength(1);
    expect(targets.list.textContent).toContain('Active');
  });

  it('counts remaining tasks with correct pluralisation', () => {
    const state = { todos: [todo({ id: '1' })], filter: 'all' as const, search: '' };
    render(state, targets);
    expect(targets.itemsLeft.textContent).toBe('1 task left');

    render({ ...state, todos: [todo({ id: '1' }), todo({ id: '2' })] }, targets);
    expect(targets.itemsLeft.textContent).toBe('2 tasks left');
  });

  it('shows the empty state only when nothing is visible', () => {
    render({ todos: [], filter: 'all', search: '' }, targets);
    expect(targets.emptyState.classList.contains('hidden')).toBe(false);
    expect(targets.list.classList.contains('hidden')).toBe(true);

    render({ todos: [todo({ id: '1' })], filter: 'all', search: '' }, targets);
    expect(targets.emptyState.classList.contains('hidden')).toBe(true);
    expect(targets.list.classList.contains('hidden')).toBe(false);
  });

  it('replaces the previous list instead of appending to it', () => {
    const state = { todos: [todo({ id: '1' })], filter: 'all' as const, search: '' };
    render(state, targets);
    render(state, targets);

    expect(targets.list.querySelectorAll('.todo-item')).toHaveLength(1);
  });
});
