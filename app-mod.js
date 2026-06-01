/**
 * TODO APP: ES6+ Refactored by Senior Level Developer
 * Features: OOP Architecture, State-Driven UI, Event Delegation, DRY code, Bugfixes.
 */

// Константы иконок (вынесли из логики, чтобы не засорять функции)
const ICONS = {
    general: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/></svg>',
    work: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd"/><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/></svg>',
    personal: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>',
    shopping: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 100-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/></svg>',
    edit: '<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>',
    delete: '<svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1 a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>'
};

class TodoApp {
    constructor() {
        // Единый источник истины (State)
        this.state = {
            todos: JSON.parse(localStorage.getItem('todos')) || [],
            filter: 'active',
            searchQuery: '',
            editingId: null,
            draggedEl: null,
        };

        // Кэшируем DOM-элементы один раз при запуске
        const $ = selector => document.querySelector(selector);
        this.DOM = {
            form: $('#todo-form'),
            list: $('#todo-list'),
            input: $('#todo-input'),
            search: $('#search-input'),
            stats: $('#items-left'),
            empty: $('#empty-state'),
            modal: $('#modal-overlay')
        };

        this.init();
    }

    init() {
        this.renderDate();
        this.setupTheme();
        this.setupListeners();
        this.render();
    }

    // --- СТЕЙТ-МЕНЕДЖМЕНТ ---
    // Метод, который меняет данные и автоматически перерисовывает интерфейс
    updateState(newState) {
        this.state = { ...this.state, ...newState };
        localStorage.setItem('todos', JSON.stringify(this.state.todos));
        this.render();
    }

    // --- СЛУШАТЕЛИ СОБЫТИЙ ---
    setupListeners() {
        // Добавление новой задачи
        this.DOM.form.addEventListener('submit', e => {
            e.preventDefault();
            const text = this.DOM.input.value.trim();
            if (!text) return;

            const newTodo = {
                id: Date.now(),
                text,
                priority: document.querySelector('#priority-select').value || 'medium',
                category: document.querySelector('#category-select').value || 'general',
                completed: false
            };

            this.updateState({ todos: [newTodo, ...this.state.todos] });
            this.DOM.form.reset();
        });

        // ДЕЛЕГИРОВАНИЕ СОБЫТИЙ для всего списка
        this.DOM.list.addEventListener('click', e => {
            const item = e.target.closest('.todo-item');
            if (!item) return;

            const id = Number(item.dataset.id);

            // Удаление
            if (e.target.closest('.delete-btn')) {
                this.updateState({ todos: this.state.todos.filter(t => t.id !== id) });
            }
            // Открытие модалки редактирования
            else if (e.target.closest('.edit-btn')) {
                this.openModal(id);
            }
            // Переключение статуса чекбокса
            else if (e.target.closest('input[type="checkbox"]')) {
                const todos = this.state.todos.map(t =>
                    t.id === id ? { ...t, completed: !t.completed } : t
                );
                this.updateState({ todos });
            }
        });

        // Логика фильтров
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateState({ filter: e.target.dataset.filter });
            });
        });

        // "Очистить завершенные"
        document.querySelector('#clear-completed').addEventListener('click', () => {
            this.updateState({ todos: this.state.todos.filter(t => !t.completed) });
        });

        // Живой поиск
        this.DOM.search.addEventListener('input', e => {
            this.updateState({ searchQuery: e.target.value.trim().toLowerCase() });
        });

        // Навешиваем логику на модалку
        const modal = this.DOM.modal;
        document.querySelector('#modal-save').addEventListener('click', () => this.saveEdit());
        document.querySelector('#modal-cancel').addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', e => e.target === modal && this.closeModal());
        document.querySelector('#modal-input').addEventListener('keypress', e => e.key === 'Enter' && this.saveEdit());

        // Запуск Drag & Drop
        this.setupDragAndDrop();
    }

    // --- ОТРИСОВКА (UI) ---
    renderDate() {
        document.querySelector('#date-display').textContent = new Intl.DateTimeFormat('ru-RU', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }).format(new Date());
    }

    setupTheme() {
        const toggleBtn = document.querySelector('#theme-toggle');
        if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');

        toggleBtn.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    // Билдер чистого HTML строки для карточки, чтобы сэкономить код
    createCardHTML(todo) {
        const cat = todo.category || 'general';
        return `
            <div class="priority-badge priority-${todo.priority || 'medium'}"></div>
            <input type="checkbox" ${todo.completed ? 'checked' : ''}>
            <span>${todo.text}</span>
            <div class="category-icon-tag cat-${cat}" title="${cat}">
                ${ICONS[cat] || ICONS.general}
            </div>
            <button class="edit-btn">${ICONS.edit}</button>
            <button class="delete-btn">${ICONS.delete}</button>
        `;
    }

    render() {
        const { todos, filter, searchQuery } = this.state;

        // 1. Фильтруем данные перед выводом
        let filtered = todos.filter(t => {
            const matchFilter = filter === 'active' ? !t.completed : filter === 'completed' ? t.completed : true;
            const matchSearch = !searchQuery || t.text.toLowerCase().includes(searchQuery);
            return matchFilter && matchSearch;
        });

        // 2. Умное удаление элементов (сохраняем анимацию remove)
        const currentIds = filtered.map(t => t.id);
        Array.from(this.DOM.list.children).forEach(el => {
            if (!currentIds.includes(Number(el.dataset.id)) && !el.classList.contains('removing')) {
                el.classList.add('removing');
                setTimeout(() => el.remove(), 300); // Динамично ждем конца CSS анимации
            }
        });

        // 3. Умное добавление / обновление атрибутов без перерисовки всего DOM
        filtered.forEach((todo, index) => {
            let el = this.DOM.list.querySelector(`[data-id="${todo.id}"]`);

            if (!el) { // Если элемента нет - создаем
                el = document.createElement('li');
                el.className = `todo-item appearing ${todo.completed ? 'completed' : ''}`;
                el.dataset.id = todo.id;
                el.draggable = true;
                el.innerHTML = this.createCardHTML(todo);

                const prev = index > 0 ? this.DOM.list.querySelector(`[data-id="${filtered[index - 1].id}"]`) : null;
                prev ? prev.after(el) : this.DOM.list.prepend(el);

                setTimeout(() => el.classList.remove('appearing'), 500);
            } else { // Если есть - просто обновляем атрибуты
                el.classList.remove('removing');
                el.classList.toggle('completed', todo.completed);
                el.querySelector('span').textContent = todo.text;
                el.querySelector('input').checked = todo.completed;
                el.querySelector('.priority-badge').className = `priority-badge priority-${todo.priority}`;
            }
        });

        // 4. Обновление счетчиков и интерфейсов
        this.DOM.stats.textContent = `${todos.filter(t => !t.completed).length} задач осталось`;

        const isEmpty = filtered.length === 0;
        this.DOM.empty.classList.toggle('hidden', !isEmpty);
        this.DOM.list.classList.toggle('hidden', isEmpty);
    }

    // --- УПРАВЛЕНИЕ МОДАЛКОЙ ---
    openModal(id) {
        const todo = this.state.todos.find(t => t.id === id);
        this.state.editingId = id;
        document.querySelector('#modal-input').value = todo.text;
        document.querySelector('#modal-priority').value = todo.priority || 'medium';
        document.querySelector('#modal-category').value = todo.category || 'general';

        this.DOM.modal.classList.add('active');
        setTimeout(() => document.querySelector('#modal-input').focus(), 50);
    }

    closeModal() {
        this.DOM.modal.classList.remove('active');
        this.state.editingId = null;
    }

    saveEdit() {
        const text = document.querySelector('#modal-input').value.trim();
        if (!text || !this.state.editingId) return;

        const todos = this.state.todos.map(t => t.id === this.state.editingId ? {
            ...t, text,
            priority: document.querySelector('#modal-priority').value,
            category: document.querySelector('#modal-category').value
        } : t);

        this.updateState({ todos });
        this.closeModal();
    }

    // --- DRAG & DROP ---
    setupDragAndDrop() {
        const list = this.DOM.list;

        list.addEventListener('dragstart', e => {
            if (!e.target.classList.contains('todo-item')) return;
            this.state.draggedEl = e.target;
            list.classList.add('dragging-active');
            setTimeout(() => e.target.classList.add('dragging'), 0);
        });

        list.addEventListener('dragend', () => {
            if (!this.state.draggedEl) return;
            this.state.draggedEl.classList.remove('dragging');
            list.classList.remove('dragging-active');
            list.querySelectorAll('.todo-item').forEach(el => el.classList.remove('drag-target-before'));
            this.state.draggedEl = null;

            // Senior Fix: Берем отсортированные ID с экрана и сохраняем невидимые задачи, чтобы они не удалились!
            const visibleIds = [...list.querySelectorAll('.todo-item')].map(item => Number(item.dataset.id));
            const invisibleTodos = this.state.todos.filter(t => !visibleIds.includes(t.id));
            const reorderedVisible = visibleIds.map(id => this.state.todos.find(t => t.id === id));

            // Записываем стейт напрямую и сохраняем, чтобы не вызывать скачок UI через render()
            this.state.todos = [...reorderedVisible, ...invisibleTodos];
            localStorage.setItem('todos', JSON.stringify(this.state.todos));
        });

        list.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = [...list.querySelectorAll('.todo-item:not(.dragging)')]
                .reduce((closest, child) => {
                    const offset = e.clientY - child.getBoundingClientRect().top - child.getBoundingClientRect().height / 2;
                    return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
                }, { offset: Number.NEGATIVE_INFINITY }).element;

            list.querySelectorAll('.todo-item').forEach(el => el.classList.remove('drag-target-before'));

            if (afterElement) {
                afterElement.classList.add('drag-target-before');
                list.insertBefore(this.state.draggedEl, afterElement);
            } else {
                list.appendChild(this.state.draggedEl);
            }
        });
    }
}

// Запуск приложения полностью изолирован и инициируется DOM API
document.addEventListener('DOMContentLoaded', () => new TodoApp());
