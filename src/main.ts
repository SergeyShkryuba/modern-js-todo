import '@fontsource-variable/inter';
import { render, type RenderTargets } from './render';
import { TodoStore } from './store';
import { loadTheme, loadTodos, saveTheme, saveTodos } from './storage';
import { isCategory, isFilter, isPriority, type Category, type Priority } from './types';

function required<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing required element: ${selector}`);
  return el;
}

const dom = {
  form: required<HTMLFormElement>('#todo-form'),
  input: required<HTMLInputElement>('#todo-input'),
  priority: required<HTMLSelectElement>('#priority-select'),
  category: required<HTMLSelectElement>('#category-select'),
  list: required<HTMLUListElement>('#todo-list'),
  itemsLeft: required<HTMLElement>('#items-left'),
  clearBtn: required<HTMLButtonElement>('#clear-completed'),
  search: required<HTMLInputElement>('#search-input'),
  filters: [...document.querySelectorAll<HTMLButtonElement>('.filter-btn')],
  date: required<HTMLElement>('#date-display'),
  emptyState: required<HTMLElement>('#empty-state'),
  themeToggle: required<HTMLButtonElement>('#theme-toggle'),
  modal: required<HTMLElement>('#modal-overlay'),
  modalInput: required<HTMLInputElement>('#modal-input'),
  modalPriority: required<HTMLSelectElement>('#modal-priority'),
  modalCategory: required<HTMLSelectElement>('#modal-category'),
  modalSave: required<HTMLButtonElement>('#modal-save'),
  modalCancel: required<HTMLButtonElement>('#modal-cancel'),
};

const targets: RenderTargets = {
  list: dom.list,
  itemsLeft: dom.itemsLeft,
  emptyState: dom.emptyState,
};

const store = new TodoStore({ todos: loadTodos(), filter: 'all' });

store.subscribe((state) => {
  saveTodos(state.todos);
  render(state, targets);
});

/* ------------------------------- add task ------------------------------- */

dom.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const priority: Priority = isPriority(dom.priority.value) ? dom.priority.value : 'medium';
  const category: Category = isCategory(dom.category.value) ? dom.category.value : 'general';

  if (store.add(dom.input.value, priority, category)) {
    dom.input.value = '';
    dom.input.focus();
  }
});

/* ------------------------------ list actions ----------------------------- */

dom.list.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const item = target.closest<HTMLLIElement>('.todo-item');
  const id = item?.dataset['id'];
  if (!item || !id) return;

  if (target.closest('.delete-btn')) {
    item.classList.add('removing');
    // Let the CSS exit animation finish, but skip the wait for anyone who has
    // asked for reduced motion.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => store.remove(id), reduced ? 0 : 300);
    return;
  }

  if (target.closest('.edit-btn')) openModal(id);
});

dom.list.addEventListener('change', (event) => {
  const target = event.target as HTMLElement;
  if (!target.classList.contains('toggle-cb')) return;
  const id = target.closest<HTMLLIElement>('.todo-item')?.dataset['id'];
  if (id) store.toggle(id);
});

dom.clearBtn.addEventListener('click', () => store.clearCompleted());

/* --------------------------- search and filters -------------------------- */

dom.search.addEventListener('input', (event) => {
  store.setSearch((event.target as HTMLInputElement).value);
});

dom.filters.forEach((button) => {
  button.addEventListener('click', () => {
    const value = button.dataset['filter'];
    if (!isFilter(value)) return;

    // `currentTarget`, not `event.target`: a click landing on a child element
    // used to read `data-filter` off the child and do nothing.
    dom.filters.forEach((b) => {
      b.classList.toggle('active', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    });
    store.setFilter(value);
  });
});

/* --------------------------------- modal --------------------------------- */

let editingId: string | null = null;
let lastFocused: HTMLElement | null = null;

function openModal(id: string): void {
  const todo = store.getState().todos.find((t) => t.id === id);
  if (!todo) return;

  editingId = id;
  lastFocused = document.activeElement as HTMLElement | null;
  dom.modalInput.value = todo.text;
  dom.modalPriority.value = todo.priority;
  dom.modalCategory.value = todo.category;
  dom.modal.classList.add('active');
  dom.modal.removeAttribute('aria-hidden');
  dom.modalInput.focus();
  dom.modalInput.select();
}

function closeModal(): void {
  dom.modal.classList.remove('active');
  dom.modal.setAttribute('aria-hidden', 'true');
  editingId = null;
  lastFocused?.focus();
  lastFocused = null;
}

function saveModal(): void {
  if (!editingId) return;
  const priority: Priority = isPriority(dom.modalPriority.value)
    ? dom.modalPriority.value
    : 'medium';
  const category: Category = isCategory(dom.modalCategory.value)
    ? dom.modalCategory.value
    : 'general';

  store.update(editingId, { text: dom.modalInput.value, priority, category });
  closeModal();
}

dom.modalSave.addEventListener('click', saveModal);
dom.modalCancel.addEventListener('click', closeModal);
dom.modal.addEventListener('click', (event) => {
  if (event.target === dom.modal) closeModal();
});
dom.modalInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') saveModal();
});
document.addEventListener('keydown', (event) => {
  // Escape used to do nothing, leaving the dialog as a keyboard trap.
  if (event.key === 'Escape' && dom.modal.classList.contains('active')) closeModal();
});

/* --------------------------------- theme --------------------------------- */

dom.themeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark-theme');
  dom.themeToggle.setAttribute('aria-pressed', String(isDark));
  saveTheme(isDark ? 'dark' : 'light');
});

/* ----------------------------- drag and drop ----------------------------- */

let dragged: HTMLLIElement | null = null;

dom.list.addEventListener('dragstart', (event) => {
  const item = (event.target as HTMLElement).closest<HTMLLIElement>('.todo-item');
  if (!item) return;
  dragged = item;
  event.dataTransfer?.setData('text/plain', item.dataset['id'] ?? '');
  requestAnimationFrame(() => item.classList.add('dragging'));
});

dom.list.addEventListener('dragover', (event) => {
  event.preventDefault();
  if (!dragged) return;

  const others = [...dom.list.querySelectorAll<HTMLLIElement>('.todo-item:not(.dragging)')];
  const after = others.reduce<{ offset: number; element: HTMLLIElement | null }>(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = event.clientY - box.top - box.height / 2;
      return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null },
  ).element;

  others.forEach((el) => el.classList.remove('drag-target-before'));

  if (after) {
    after.classList.add('drag-target-before');
    dom.list.insertBefore(dragged, after);
  } else {
    dom.list.appendChild(dragged);
  }
});

dom.list.addEventListener('dragend', () => {
  dragged?.classList.remove('dragging');
  dragged = null;
  dom.list
    .querySelectorAll('.todo-item')
    .forEach((el) => el.classList.remove('drag-target-before'));

  const order = [...dom.list.querySelectorAll<HTMLLIElement>('.todo-item')]
    .map((item) => item.dataset['id'])
    .filter((id): id is string => Boolean(id));

  store.reorderVisible(order);
});

/* --------------------------------- start --------------------------------- */

// The inline script in index.html already applied the saved theme before
// paint; this keeps the two in sync if storage changed in another tab.
document.body.classList.toggle('dark-theme', loadTheme() === 'dark');
dom.themeToggle.setAttribute(
  'aria-pressed',
  String(document.body.classList.contains('dark-theme')),
);

dom.date.textContent = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
}).format(new Date());

render(store.getState(), targets);
