import { CATEGORY_ICONS, DELETE_ICON, EDIT_ICON } from './icons';
import { countActive, selectVisible, type TodoState } from './store';
import type { Todo } from './types';

export interface RenderTargets {
  list: HTMLUListElement;
  itemsLeft: HTMLElement;
  emptyState: HTMLElement;
}

/**
 * Builds one list item.
 *
 * Note that the task text goes in via `textContent`, never string
 * interpolation into `innerHTML`. The previous version built the whole list
 * with a template literal, so a task called
 * `<img src=x onerror="alert(document.cookie)">` executed on every render —
 * stored XSS in a page that also keeps data in localStorage.
 */
export function createTodoElement(todo: Todo): HTMLLIElement {
  const li = document.createElement('li');
  li.className = `todo-item${todo.completed ? ' completed' : ''}`;
  li.dataset['id'] = todo.id;
  li.draggable = true;

  const badge = document.createElement('div');
  badge.className = `priority-badge priority-${todo.priority}`;
  badge.title = `${todo.priority} priority`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'toggle-cb';
  checkbox.checked = todo.completed;
  checkbox.id = `todo-${todo.id}`;

  const label = document.createElement('label');
  label.htmlFor = checkbox.id;
  label.textContent = todo.text;

  const categoryTag = document.createElement('div');
  categoryTag.className = `category-icon-tag cat-${todo.category}`;
  categoryTag.title = todo.category;
  categoryTag.innerHTML = CATEGORY_ICONS[todo.category];

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'edit-btn';
  editBtn.innerHTML = EDIT_ICON;
  editBtn.setAttribute('aria-label', `Edit "${todo.text}"`);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'delete-btn';
  deleteBtn.innerHTML = DELETE_ICON;
  deleteBtn.setAttribute('aria-label', `Delete "${todo.text}"`);

  li.append(badge, checkbox, label, categoryTag, editBtn, deleteBtn);
  return li;
}

export function render(state: TodoState, targets: RenderTargets): void {
  const visible = selectVisible(state);

  targets.list.replaceChildren(...visible.map(createTodoElement));

  const active = countActive(state);
  targets.itemsLeft.textContent = `${active} task${active === 1 ? '' : 's'} left`;

  targets.emptyState.classList.toggle('hidden', visible.length > 0);
  targets.list.classList.toggle('hidden', visible.length === 0);
}
