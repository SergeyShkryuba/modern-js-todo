/**
 * ПРИЛОЖЕНИЕ TODO: СОВРЕМЕННЫЙ ПОДХОД
 * Архитектура: State -> Render -> Events
 */

// 1. КОНСТАНТЫ И ЭЛЕМЕНТЫ DOM
const DOM = {
    form: document.querySelector('#todo-form'),
    input: document.querySelector('#todo-input'),
    list: document.querySelector('#todo-list'),
    itemsLeft: document.querySelector('#items-left'),
    clearBtn: document.querySelector('#clear-completed'),
    filters: document.querySelectorAll('.filter-btn'),
    date: document.querySelector('#date-display'),
    search: document.querySelector('#search-input'),
    priority: document.querySelector('#priority-select'),
    category: document.querySelector('#category-select'),
    themeToggle: document.querySelector('#theme-toggle'),
    emptyState: document.getElementById('empty-state'),

    // Модальное окно
    modal: document.querySelector('#modal-overlay'),
    modalInput: document.querySelector('#modal-input'),
    modalPriority: document.querySelector('#modal-priority'),
    modalCategory: document.querySelector('#modal-category'),
    modalSave: document.querySelector('#modal-save'),
    modalCancel: document.querySelector('#modal-cancel'),
};

// SVG Иконки
const ICONS = {
    general: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/></svg>',
    work: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd"/><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/></svg>',
    personal: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>',
    shopping: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 100-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/></svg>',
    edit: '<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>',
    delete: '<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1 a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>'
};

// 2. СОСТОЯНИЕ ПРИЛОЖЕНИЯ (State)
const state = {
    todos: JSON.parse(localStorage.getItem('todos')) || [],
    filter: 'active',
    search: '',
    editingId: null,
    draggedItem: null,

    save() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
        render(); // Updating data always leads to UI re-render
    },

    addTodo(text, priority = 'medium', category = 'general') {
        const priorityMap = { low: 'Low', medium: 'Medium', high: 'High' };
        const categoryMap = { general: '📁 General', work: '💼 Work', personal: '👤 Personal', shopping: '🛒 Shopping' };
        this.todos.unshift({ id: Date.now(), text, priority, category, completed: false });
        this.save();
    },

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) todo.completed = !todo.completed;
        this.save();
    },

    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.save();
    },

    updateTodo(id, updates) {
        this.todos = this.todos.map(t => t.id === id ? { ...t, ...updates } : t);
        this.save();
    },

    clearCompleted() {
        this.todos = this.todos.filter(t => !t.completed);
        this.save();
    },

    // Get filtered todo list for rendering
    getFilteredTodos() {
        return this.todos
            .filter(t => this.filter === 'active' ? !t.completed : this.filter === 'completed' ? t.completed : true)
            .filter(t => t.text.toLowerCase().includes(this.search.toLowerCase()));
    }
};

// 3. RENDER UI
// Creates an HTML string for one todo, returns the ready block
const createTodoMarkup = (todo) => `
    <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}" draggable="true">
        <div class="priority-badge priority-${todo.priority}"></div>
        <input type="checkbox" class="toggle-cb" ${todo.completed ? 'checked' : ''}>
        <span>${todo.text}</span>
        <div class="category-icon-tag cat-${todo.category}" title="${todo.category}">
            ${ICONS[todo.category] || ICONS.general}
        </div>
        <button class="edit-btn">
            ${ICONS.edit}
        </button>
        <button class="delete-btn">
            ${ICONS.delete}
        </button>
    </li>
`;

// Main UI render function
const render = () => {
    const filtered = state.getFilteredTodos();

    // Updating list. For Production-ready render, libraries (React/Vue) are often used, 
    // but innerHTML is the cleanest vanilla way for simple components re-render.
    DOM.list.innerHTML = filtered.map(createTodoMarkup).join('');

    // Update counter
    const activeCount = state.todos.filter(t => !t.completed).length;
    DOM.itemsLeft.textContent = `${activeCount} task${activeCount === 1 ? '' : 's'} left`;
    
    // Show/hide empty list state
    DOM.emptyState.classList.toggle('hidden', filtered.length > 0);
    DOM.list.classList.toggle('hidden', filtered.length === 0);
};

// 4. MODAL WINDOW MANAGEMENT
const Modal = {
    open(id) {
        const todo = state.todos.find(t => t.id === id);
        if (!todo) return;
        state.editingId = id;
        DOM.modalInput.value = todo.text;
        DOM.modalPriority.value = todo.priority;
        DOM.modalCategory.value = todo.category;
        DOM.modal.classList.add('active');
        setTimeout(() => DOM.modalInput.focus(), 50);
    },

    close() {
        DOM.modal.classList.remove('active');
        state.editingId = null;
    },

    save() {
        const text = DOM.modalInput.value.trim();
        if (text && state.editingId) {
            state.updateTodo(state.editingId, {
                text,
                priority: DOM.modalPriority.value,
                category: DOM.modalCategory.value
            });
            this.close();
        }
    }
};

// 5. INITIALIZATION AND EVENTS
const initEvents = () => {
    // === Add todo ===
    DOM.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = DOM.input.value.trim();
        if (text) {
            state.addTodo(text, DOM.priority.value, DOM.category.value);
            DOM.input.value = '';
        }
    });

    // === LIST EVENT DELEGATION (Clicks) ===
    // Instead of inline onclick in HTML, we attach one listener to the whole list.
    DOM.list.addEventListener('click', (e) => {
        const item = e.target.closest('.todo-item');
        if (!item) return;

        const id = Number(item.dataset.id);

        // Use .closest() so clicks on nested SVG also count
        if (e.target.closest('.delete-btn')) {
            item.classList.add('removing');
            setTimeout(() => state.deleteTodo(id), 300); // Wait for CSS animation before removing from store
        }
        else if (e.target.closest('.edit-btn')) {
            Modal.open(id);
        }
    });

    // === EVENT DELEGATION (Checkbox) ===
    DOM.list.addEventListener('change', (e) => {
        if (e.target.classList.contains('toggle-cb')) {
            const item = e.target.closest('.todo-item');
            state.toggleTodo(Number(item.dataset.id));
        }
    });

    // === Filters, search, clear ===
    DOM.clearBtn.addEventListener('click', () => state.clearCompleted());

    DOM.search.addEventListener('input', (e) => {
        state.search = e.target.value.trim();
        render();
    });

    DOM.filters.forEach(btn => btn.addEventListener('click', (e) => {
        DOM.filters.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        state.filter = e.target.dataset.filter;
        render();
    }));

    // === Modal window ===
    DOM.modalSave.addEventListener('click', () => Modal.save());
    DOM.modalCancel.addEventListener('click', () => Modal.close());
    DOM.modal.addEventListener('click', (e) => e.target === DOM.modal && Modal.close());
    DOM.modalInput.addEventListener('keypress', (e) => e.key === 'Enter' && Modal.save());

    // === Toggle dark theme ===
    DOM.themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // === Drag & Drop (Sorting tasks) ===
    let dragAfterEl = null;

    DOM.list.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('todo-item')) {
            state.draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });

    DOM.list.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggables = [...DOM.list.querySelectorAll('.todo-item:not(.dragging)')];
        
        // Find element before which to insert dragged one
        dragAfterEl = draggables.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = e.clientY - box.top - box.height / 2;
            return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;

        DOM.list.querySelectorAll('.todo-item').forEach(el => el.classList.remove('drag-target-before'));

        if (dragAfterEl) {
            dragAfterEl.classList.add('drag-target-before');
            DOM.list.insertBefore(state.draggedItem, dragAfterEl);
        } else {
            DOM.list.appendChild(state.draggedItem);
        }
    });

    DOM.list.addEventListener('dragend', () => {
        state.draggedItem.classList.remove('dragging');
        DOM.list.querySelectorAll('.todo-item').forEach(el => el.classList.remove('drag-target-before'));

        // Sync DOM list state with data array (re-saving order)
        const newOrderIds = [...DOM.list.querySelectorAll('.todo-item')].map(item => Number(item.dataset.id));
        state.todos = newOrderIds.map(id => state.todos.find(t => t.id === id));
        state.save();
    });
};

// Restore theme and current date (via modern Intl API)
const initThemeAndDate = () => {
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');
    
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    DOM.date.textContent = new Intl.DateTimeFormat('en-US', options).format(new Date());
};

// START APP
const init = () => {
    initThemeAndDate();
    initEvents();
    render();
};

init();
