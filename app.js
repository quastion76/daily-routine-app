// ========================================
// 상수 및 전역 변수
// ========================================

const RESET_HOUR = 5; // 오전 5시
const NOTIFICATION_HOUR = 0; // 밤 12시

// 일일 루틴 데이터 (window.routines 사용)
// let routines = [];
let editingRoutineId = null;

// 할일 데이터 (window.todos 사용)
// let todos = [];
let editingTodoId = null;

// 휴지통 데이터 (window.trash 사용)
// let trash = [];

// DOM 요소
let routineList;
let addRoutineBtn;
let routineModal;
let routineForm;
let routineModalTitle;
let routineModalClose;
let routineCancelBtn;
let routineSubmitBtn;

let progressBar;
let progressPercentage;
let completedCount;
let totalCount;
let enableNotificationsBtn;
let notificationStatus;

let todoList;
let addTodoBtn;
let todoModal;
let todoForm;
let modalTitle;
let modalClose;
let cancelBtn;
let submitBtn;
let trashBtn;
let trashModal;
let trashModalClose;
let emptyTrashBtn;
let trashList;

let tabButtons;
let tabContents;

let draggedElement = null;
let currentDate = new Date().toDateString();

// ========================================
// 페이지 초기화
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initializeDOM();
    setupEventListeners();
    checkNotificationPermission();
    startTimeChecking();
});

// DOM 요소 초기화
function initializeDOM() {
    // 루틴
    routineList = document.getElementById('routineList');
    addRoutineBtn = document.getElementById('addRoutineBtn');
    routineModal = document.getElementById('routineModal');
    routineForm = document.getElementById('routineForm');
    routineModalTitle = document.getElementById('routineModalTitle');
    routineModalClose = document.getElementById('routineModalClose');
    routineCancelBtn = document.getElementById('routineCancelBtn');
    routineSubmitBtn = document.getElementById('routineSubmitBtn');

    // 진행률
    progressBar = document.getElementById('progressBar');
    progressPercentage = document.getElementById('progressPercentage');
    completedCount = document.getElementById('completedCount');
    totalCount = document.getElementById('totalCount');

    // 알림
    enableNotificationsBtn = document.getElementById('enableNotifications');
    notificationStatus = document.getElementById('notificationStatus');

    // 할일
    todoList = document.getElementById('todoList');
    addTodoBtn = document.getElementById('addTodoBtn');
    todoModal = document.getElementById('todoModal');
    todoForm = document.getElementById('todoForm');
    modalTitle = document.getElementById('modalTitle');
    modalClose = document.getElementById('modalClose');
    cancelBtn = document.getElementById('cancelBtn');
    submitBtn = document.getElementById('submitBtn');

    // 휴지통
    trashBtn = document.getElementById('trashBtn');
    trashModal = document.getElementById('trashModal');
    trashModalClose = document.getElementById('trashModalClose');
    emptyTrashBtn = document.getElementById('emptyTrashBtn');
    trashList = document.getElementById('trashList');

    // 탭
    tabButtons = document.querySelectorAll('.tab-btn');
    tabContents = document.querySelectorAll('.tab-content');
}

// 기본 데이터 초기화
// 기본 데이터 초기화 함수 제거됨 (Supabase 사용)

// 이벤트 리스너 설정
function setupEventListeners() {
    // 탭 전환
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 루틴
    addRoutineBtn.addEventListener('click', openAddRoutineModal);
    routineModalClose.addEventListener('click', closeRoutineModal);
    routineCancelBtn.addEventListener('click', closeRoutineModal);
    routineForm.addEventListener('submit', handleRoutineSubmit);

    // 알림
    enableNotificationsBtn.addEventListener('click', requestNotificationPermission);

    // 할일
    addTodoBtn.addEventListener('click', openAddTodoModal);
    modalClose.addEventListener('click', closeTodoModal);
    cancelBtn.addEventListener('click', closeTodoModal);
    todoForm.addEventListener('submit', handleTodoSubmit);

    // 휴지통
    trashBtn.addEventListener('click', openTrashModal);
    trashModalClose.addEventListener('click', closeTrashModal);
    emptyTrashBtn.addEventListener('click', emptyTrash);

    // 모달 바깥 클릭
    routineModal.addEventListener('click', (e) => {
        if (e.target === routineModal) closeRoutineModal();
    });
    todoModal.addEventListener('click', (e) => {
        if (e.target === todoModal) closeTodoModal();
    });
    trashModal.addEventListener('click', (e) => {
        if (e.target === trashModal) closeTrashModal();
    });
}

// ========================================
// 탭 전환
// ========================================

function switchTab(tabName) {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const selectedContent = document.getElementById(`${tabName}Tab`);

    if (selectedBtn && selectedContent) {
        selectedBtn.classList.add('active');
        selectedContent.classList.add('active');
    }
}

// ========================================
// 루틴 관리
// ========================================

function openAddRoutineModal() {
    editingRoutineId = null;
    routineModalTitle.textContent = '+ 새 루틴 추가';
    routineSubmitBtn.textContent = '추가하기';
    routineForm.reset();
    routineModal.classList.add('active');
}

function openEditRoutineModal(id) {
    const routine = routines.find(r => r.id === id);
    if (!routine) return;

    editingRoutineId = id;
    routineModalTitle.textContent = '✎ 루틴 수정';
    routineSubmitBtn.textContent = '수정하기';

    document.getElementById('routineTitle').value = routine.title;
    document.getElementById('routineDescription').value = routine.description || '';

    routineModal.classList.add('active');
}

function closeRoutineModal() {
    routineModal.classList.remove('active');
    editingRoutineId = null;
    routineForm.reset();
}

async function handleRoutineSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('routineTitle').value.trim();
    const description = document.getElementById('routineDescription').value.trim();

    if (!title) {
        alert('루틴 이름을 입력해주세요');
        return;
    }

    try {
        if (editingRoutineId) {
            // 수정
            await updateRoutineInSupabase(editingRoutineId, {
                title,
                description
            });

            // 로컬 상태 업데이트
            const routine = routines.find(r => r.id === editingRoutineId);
            if (routine) {
                routine.title = title;
                routine.description = description;
            }
        } else {
            // 추가
            const newRoutine = {
                title,
                description,
                completed: false
            };

            // DB 저장 및 리턴된 데이터로 로컬 추가
            const savedRoutine = await saveRoutineToSupabase(newRoutine);
            routines.push(savedRoutine);
        }

        renderRoutines();
        closeRoutineModal();
    } catch (error) {
        alert('저장에 실패했습니다: ' + error.message);
    }
}

async function deleteRoutine(id) {
    if (confirm('이 루틴을 삭제하시겠습니까?')) {
        try {
            await deleteRoutineFromSupabase(id);
            routines = routines.filter(r => r.id !== id);
            renderRoutines();
        } catch (error) {
            alert('삭제에 실패했습니다: ' + error.message);
        }
    }
}

async function toggleRoutineComplete(id) {
    const routine = routines.find(r => r.id === id);
    if (routine) {
        const newStatus = !routine.completed;

        try {
            // Optimistic UI Update: 먼저 화면 갱신
            routine.completed = newStatus;

            const itemElement = document.querySelector(`.checklist-item[data-id="${id}"]`);
            if (itemElement) {
                if (newStatus) {
                    itemElement.classList.add('completed');
                } else {
                    itemElement.classList.remove('completed');
                }
            }
            updateProgress();

            // DB 업데이트
            await updateRoutineInSupabase(id, { completed: newStatus });
        } catch (error) {
            console.error('상태 업데이트 실패:', error);
            // 실패 시 롤백
            routine.completed = !newStatus;
            renderRoutines(); // 전체 다시 렌더링
            alert('업데이트 실패');
        }
    }
}

function renderRoutines() {
    if (routines.length === 0) {
        routineList.innerHTML = `
            <div class="empty-state">
                <p>∅ 등록된 루틴이 없습니다</p>
                <p class="empty-state-subtitle">위의 "루틴 추가" 버튼을 눌러 새로운 루틴을 추가해보세요</p>
            </div>
        `;
        totalCount.textContent = 0;
        completedCount.textContent = 0;
        progressBar.style.width = '0%';
        progressPercentage.textContent = '0%';
        return;
    }

    routineList.innerHTML = routines.map(routine => `
        <div class="checklist-item ${routine.completed ? 'completed' : ''}" data-id="${routine.id}">
            <div class="checkbox-wrapper">
                <input type="checkbox" id="routine-${routine.id}" ${routine.completed ? 'checked' : ''} onchange="toggleRoutineComplete('${routine.id}')">
                <label for="routine-${routine.id}">
                    <span class="checkbox-custom"></span>
                    <span class="checkbox-label">
                        <strong>${escapeHtml(routine.title)}</strong>
                        ${routine.description ? `<small>${escapeHtml(routine.description)}</small>` : ''}
                    </span>
                </label>
            </div>
            <div class="routine-actions">
                <button class="icon-btn edit-btn" onclick="openEditRoutineModal('${routine.id}')" aria-label="루틴 수정">
                    <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button class="icon-btn delete-btn" onclick="deleteRoutine('${routine.id}')" aria-label="루틴 삭제">
                    <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    updateProgress();
}

function updateProgress() {
    const completed = routines.filter(r => r.completed).length;
    const total = routines.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    progressBar.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage}%`;
    completedCount.textContent = completed;
    totalCount.textContent = total;
}

// ========================================
// 할일 관리
// ========================================

function openAddTodoModal() {
    editingTodoId = null;
    modalTitle.textContent = '+ 새 할일 추가';
    submitBtn.textContent = '추가하기';
    todoForm.reset();
    document.getElementById('todoDueDate').value = '';
    todoModal.classList.add('active');
}

function openEditTodoModal(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    editingTodoId = id;
    modalTitle.textContent = '✎ 할일 수정';
    submitBtn.textContent = '수정하기';

    document.getElementById('todoTitle').value = todo.title;
    document.getElementById('todoDescription').value = todo.description || '';
    document.getElementById('todoDueDate').value = todo.dueDate || '';

    todoModal.classList.add('active');
}

function closeTodoModal() {
    todoModal.classList.remove('active');
    editingTodoId = null;
    todoForm.reset();
}

async function handleTodoSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('todoTitle').value.trim();
    const description = document.getElementById('todoDescription').value.trim();
    const dueDate = document.getElementById('todoDueDate').value;

    if (!title) {
        alert('할일 이름을 입력해주세요');
        return;
    }

    try {
        if (editingTodoId) {
            // 수정
            await updateTodoInSupabase(editingTodoId, {
                title,
                description,
                due_date: dueDate
            });

            const todo = todos.find(t => t.id === editingTodoId);
            if (todo) {
                todo.title = title;
                todo.description = description;
                todo.dueDate = dueDate;
            }
        } else {
            // 추가
            const newTodo = {
                title,
                description,
                dueDate,
                completed: false,
                priority: todos.length
            };

            const savedTodo = await saveTodoToSupabase(newTodo);
            todos.push(savedTodo);
        }

        renderTodos();
        closeTodoModal();
    } catch (error) {
        alert('저장에 실패했습니다: ' + error.message);
    }
}

async function deleteTodo(id) {
    if (confirm('이 할일을 삭제하시겠습니까?')) {
        try {
            await deleteTodoFromSupabase(id);
            todos = todos.filter(t => t.id !== id);
            renderTodos();
        } catch (error) {
            alert('삭제에 실패했습니다: ' + error.message);
        }
    }
}

function toggleTodoComplete(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // 완료 시 휴지통으로 이동
    if (!todo.completed) {
        // 부드러운 애니메이션을 위해 먼저 fade out
        const todoElement = document.querySelector(`.todo-item[data-id="${id}"]`);
        if (todoElement) {
            todoElement.style.opacity = '0';
            todoElement.style.transform = 'translateX(20px)';

            setTimeout(async () => {
                try {
                    // 휴지통으로 복사 및 원본 삭제
                    await moveToTrash(todo, 'todo'); // moveToTrash 함수 자체도 수정 예정
                    await deleteTodoFromSupabase(id);

                    todos = todos.filter(t => t.id !== id);
                    renderTodos();
                } catch (error) {
                    // 실패 시 원복 (UI)
                    todoElement.style.opacity = '1';
                    todoElement.style.transform = 'none';
                    alert('처리 실패: ' + error.message);
                }
            }, 300);
        } else {
            // 애니메이션 없이 처리 (fallback)
            moveToTrash(todo, 'todo').then(() => {
                return deleteTodoFromSupabase(id);
            }).then(() => {
                todos = todos.filter(t => t.id !== id);
                renderTodos();
            }).catch(e => alert(e.message));
        }
    }
}

function renderTodos() {
    if (todos.length === 0) {
        todoList.innerHTML = `
            <div class="empty-state">
                <p>∅ 아직 등록된 할일이 없어요</p>
                <p class="empty-state-subtitle">위의 "할일 추가" 버튼을 눌러 새로운 할일을 추가해보세요</p>
            </div>
        `;
        return;
    }

    todos.sort((a, b) => a.order - b.order);

    todoList.innerHTML = todos.map(todo => {
        const dueDateStatus = getDueDateStatus(todo.dueDate);
        const dueDateText = getDueDateText(todo.dueDate);

        return `
            <div class="todo-item ${todo.completed ? 'completed' : ''}" 
                 draggable="true" 
                 data-id="${todo.id}">
                <div class="todo-item-header">
                    <span class="drag-handle">☰</span>
                    <div class="todo-checkbox-wrapper">
                        <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" 
                             onclick="toggleTodoComplete('${todo.id}')"></div>
                    </div>
                    <div class="todo-content">
                        <div class="todo-title">${escapeHtml(todo.title)}</div>
                        ${todo.description ? `<div class="todo-description">${escapeHtml(todo.description)}</div>` : ''}
                        <div class="todo-meta">
                            ${todo.dueDate ? `<div class="todo-due-date ${dueDateStatus}">${dueDateText}</div>` : ''}
                            <div class="todo-actions">
                                <button class="todo-btn edit-btn" onclick="openEditTodoModal('${todo.id}')" aria-label="할일 수정">
                                    <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                <button class="todo-btn delete-btn" onclick="deleteTodo('${todo.id}')" aria-label="할일 삭제">
                                    <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    setupDragAndDrop();
}

// ========================================
// 휴지통 관리
// ========================================

async function moveToTrash(item, type) {
    try {
        await moveToTrashSupabase(item, type);
    } catch (error) {
        console.error('휴지통 이동 실패:', error);
        alert('휴지통 이동에 실패했습니다.');
    }
}

async function restoreFromTrash(id) {
    const item = trash.find(t => t.id === id);
    if (!item) return;

    try {
        const originalData = item.data;

        if (item.item_type === 'routine') { // item_type 확인 (DB 컬럼명)
            // 원래 ID 대신 새 ID로 생성할지 원래 ID 유지할지 결정. 
            // 여기선 심플하게 새 항목으로 추가 (충돌 방지)
            const newRoutine = {
                title: originalData.title,
                description: originalData.description,
                completed: false // 복원 시 미완료 상태로?
            };
            await saveRoutineToSupabase(newRoutine);
        } else if (item.item_type === 'todo') {
            const newTodo = {
                title: originalData.title,
                description: originalData.description,
                dueDate: originalData.dueDate, // DB 컬럼명 확인 필요 (saveTodoToSupabase가 처리)
                completed: false,
                priority: todos.length
            };
            await saveTodoToSupabase(newTodo);
        }

        // 휴지통에서 영구 삭제
        await deleteTrashItemFromSupabase(id);

        // 데이터 다시 로드
        await Promise.all([
            loadRoutinesFromSupabase(),
            loadTodosFromSupabase(),
            loadTrashFromSupabase()
        ]);

        renderTrash();
        alert('복원되었습니다.');

    } catch (error) {
        console.error('복원 실패:', error);
        alert('복원에 실패했습니다: ' + error.message);
    }
}

async function permanentDelete(id) {
    if (confirm('영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        try {
            await deleteTrashItemFromSupabase(id);
            trash = trash.filter(t => t.id !== id);
            renderTrash();
        } catch (error) {
            alert('삭제 실패: ' + error.message);
        }
    }
}

async function emptyTrash() {
    if (trash.length === 0) {
        alert('휴지통이 비어있습니다');
        return;
    }

    if (confirm('휴지통을 완전히 비우시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        try {
            await emptyTrashSupabase();
            trash = [];
            renderTrash();
        } catch (error) {
            alert('비우기 실패: ' + error.message);
        }
    }
}

async function openTrashModal() {
    await loadTrashFromSupabase(); // 최신 데이터 로드
    renderTrash();
    trashModal.classList.add('active');
}

function closeTrashModal() {
    trashModal.classList.remove('active');
}

function renderTrash() {
    if (trash.length === 0) {
        trashList.innerHTML = `
            <div class="empty-trash">
                <p>⊗ 휴지통이 비어있습니다</p>
            </div>
        `;
        return;
    }

    trashList.innerHTML = trash.map(item => `
        <div class="trash-item">
            <div class="trash-item-header">
                <span class="trash-item-title">${escapeHtml(item.title)}</span>
            </div>
            ${item.description ? `<div class="trash-item-description">${escapeHtml(item.description)}</div>` : ''}
            <div class="trash-item-actions">
                <button class="restore-btn" onclick="restoreFromTrash('${item.id}')">복원</button>
                <button class="permanent-delete-btn" onclick="permanentDelete('${item.id}')">영구 삭제</button>
            </div>
        </div>
    `).join('');
}

// ========================================
// 드래그 앤 드롭
// ========================================

function setupDragAndDrop() {
    const todoItems = document.querySelectorAll('.todo-item');

    todoItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragleave', handleDragLeave);
    });
}

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.todo-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedElement = null;
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    if (this !== draggedElement) {
        this.classList.add('drag-over');
    }
    return false;
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedElement !== this) {
        const draggedId = draggedElement.dataset.id;
        const targetId = this.dataset.id;

        const draggedIndex = todos.findIndex(t => t.id === draggedId);
        const targetIndex = todos.findIndex(t => t.id === targetId);

        const [draggedTodo] = todos.splice(draggedIndex, 1);
        todos.splice(targetIndex, 0, draggedTodo);

        todos.forEach((todo, index) => {
            todo.order = index;
        });

        renderTodos();
    }

    return false;
}

// ========================================
// 유틸리티 함수
// ========================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getDueDateStatus(dueDate) {
    if (!dueDate) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 3) return 'upcoming';
    return '';
}

function getDueDateText(dueDate) {
    if (!dueDate) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `▸ ${Math.abs(diffDays)}일 지남`;
    if (diffDays === 0) return '▸ 오늘 마감';
    if (diffDays === 1) return '▸ 내일 마감';
    return `▸ ${diffDays}일 남음`;
}

// ========================================
// 알림 기능
// ========================================

function checkNotificationPermission() {
    if (!('Notification' in window)) {
        notificationStatus.textContent = '이 브라우저는 알림을 지원하지 않습니다';
        enableNotificationsBtn.disabled = true;
        return;
    }

    if (Notification.permission === 'granted') {
        notificationStatus.textContent = '✅ 알림이 활성화되어 있습니다';
        notificationStatus.classList.add('enabled');
        enableNotificationsBtn.disabled = true;
        enableNotificationsBtn.textContent = '✓ 알림 활성화됨';
    } else if (Notification.permission === 'denied') {
        notificationStatus.textContent = '! 알림이 차단되었습니다. 브라우저 설정에서 허용해주세요';
    }
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert('이 브라우저는 알림을 지원하지 않습니다');
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            notificationStatus.textContent = '✅ 알림이 활성화되어 있습니다';
            notificationStatus.classList.add('enabled');
            enableNotificationsBtn.disabled = true;
            enableNotificationsBtn.textContent = '✓ 알림 활성화됨';

            new Notification('▸ 일일 루틴 & 할일 관리', {
                body: '알림이 성공적으로 활성화되었습니다!',
                icon: '♪'
            });
        } else {
            notificationStatus.textContent = '알림 권한이 거부되었습니다';
        }
    } catch (error) {
        console.error('알림 권한 요청 실패:', error);
    }
}

function sendNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '♪',
            badge: '▸'
        });
    }
}

function startTimeChecking() {
    checkTime();
    setInterval(checkTime, 60000);
}

function checkTime() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const today = now.toDateString();

    if (currentDate !== today) {
        currentDate = today;
    }

    if (hour === RESET_HOUR && minute === 0) {
        console.log('🕐 오전 5시입니다. 루틴을 초기화합니다.');
        routines.forEach(r => r.completed = false);
        renderRoutines();
        sendNotification('▸ 새로운 하루!', '일일 루틴이 초기화되었습니다.');
    }

    if (hour === NOTIFICATION_HOUR && minute === 0) {
        checkIncompleteRoutines();
    }
}

function checkIncompleteRoutines() {
    const incompleteRoutines = routines.filter(r => !r.completed);

    if (incompleteRoutines.length > 0) {
        const incompleteList = incompleteRoutines
            .map(r => r.title)
            .join(', ');

        sendNotification(
            '! 미완료 루틴이 있습니다!',
            `완료하지 못한 항목 (${incompleteRoutines.length}개): ${incompleteList}`
        );

        console.log(`⏰ 밤 12시 - 미완료 항목: ${incompleteList}`);
    } else {
        sendNotification(
            '✓ 완벽합니다!',
            '오늘의 모든 루틴을 완료했습니다!'
        );
        console.log('🎉 모든 루틴이 완료되었습니다!');
    }
}
