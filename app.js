// ========================================
// 상수 및 전역 변수
// ========================================

const RESET_HOUR = 5; // 오전 5시
const NOTIFICATION_HOUR = 0; // 밤 12시

// DOM 요소
let routineList, addRoutineBtn, routineModal, routineForm, routineModalTitle, routineModalClose, routineCancelBtn, routineSubmitBtn;
let progressBar, progressPercentage, completedCount, totalCount, enableNotificationsBtn, notificationStatus;
let todoList, addTodoBtn, todoModal, todoForm, modalTitle, modalClose, cancelBtn, submitBtn;
let trashBtn, trashModal, trashModalClose, emptyTrashBtn, trashList;
let loginModal, loginForm, loginSubmitBtn;
let tabButtons, tabContents;

let editingRoutineId = null;
let editingTodoId = null;
let draggedElement = null;

// ========================================
// 초기화
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    initializeDOM();
    setupEventListeners();

    // Supabase Service 초기화 대기
    const checkInterval = setInterval(async () => {
        if (window.supabaseService && window.supabaseService.isInitialized) {
            clearInterval(checkInterval);
            await checkAuth();
        } else if (window.supabaseService && !window.supabaseService.isInitialized) {
            // 아직 초기화 중이라면 init 호출 시도 (supabase.js에서 자동 호출하지만 안전장치)
            window.supabaseService.init();
        }
    }, 100);
});

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

    // 로그인
    loginModal = document.getElementById('loginModal');
    loginForm = document.getElementById('loginForm');
    loginSubmitBtn = document.getElementById('loginSubmitBtn');

    // 탭
    tabButtons = document.querySelectorAll('.tab-btn');
    tabContents = document.querySelectorAll('.tab-content');
}

function setupEventListeners() {
    // 탭 전환
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 로그인
    loginForm.addEventListener('submit', handleLoginSubmit);

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

    // 모달 바깥 클릭 (로그인 모달 제외)
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

// 인증 체크
async function checkAuth() {
    const session = await window.supabaseService.getSession();
    if (!session) {
        loginModal.classList.add('active');
    } else {
        loginModal.classList.remove('active');
        loadData();
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        loginSubmitBtn.textContent = '로그인 중...';
        await window.supabaseService.signIn(email, password);
        loginModal.classList.remove('active');
        loadData();
    } catch (error) {
        alert('로그인 실패: ' + error.message);
    } finally {
        loginSubmitBtn.textContent = '로그인 / 회원가입';
    }
}

async function loadData() {
    console.log('데이터 로딩 시작...');
    const data = await window.supabaseService.loadAllData();
    window.routines = data.routines;
    window.todos = data.todos;
    window.trash = data.trash;

    renderRoutines();
    renderTodos();
    checkNotificationPermission();
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
    const routine = window.routines.find(r => r.id === id);
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
            await window.supabaseService.updateRoutine(editingRoutineId, { title, description });

            // 로컬 업데이트
            const routine = window.routines.find(r => r.id === editingRoutineId);
            if (routine) {
                routine.title = title;
                routine.description = description;
            }
        } else {
            // 추가
            const newRoutine = { title, description, completed: false };
            const savedRoutine = await window.supabaseService.saveRoutine(newRoutine);
            window.routines.push(savedRoutine);
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
            await window.supabaseService.deleteRoutine(id);
            window.routines = window.routines.filter(r => r.id !== id);
            renderRoutines();
        } catch (error) {
            alert('삭제에 실패했습니다: ' + error.message);
        }
    }
}

async function toggleRoutineComplete(id) {
    const routine = window.routines.find(r => r.id === id);
    if (routine) {
        const newStatus = !routine.completed;
        try {
            routine.completed = newStatus;
            updateRoutineUI(id, newStatus);
            updateProgress();

            await window.supabaseService.updateRoutine(id, { completed: newStatus });
        } catch (error) {
            console.error('상태 업데이트 실패:', error);
            routine.completed = !newStatus;
            renderRoutines();
            alert('업데이트 실패');
        }
    }
}

function updateRoutineUI(id, completed) {
    const itemElement = document.querySelector(`.checklist-item[data-id="${id}"]`);
    if (itemElement) {
        if (completed) itemElement.classList.add('completed');
        else itemElement.classList.remove('completed');
    }
}

function renderRoutines() {
    if (!window.routines || window.routines.length === 0) {
        routineList.innerHTML = `
            <div class="empty-state">
                <p>∅ 등록된 루틴이 없습니다</p>
                <p class="empty-state-subtitle">위의 "루틴 추가" 버튼을 눌러 새로운 루틴을 추가해보세요</p>
            </div>
        `;
        updateProgress();
        return;
    }

    routineList.innerHTML = window.routines.map(routine => `
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
    const routines = window.routines || [];
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
    const todo = window.todos.find(t => t.id === id);
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
            await window.supabaseService.updateTodo(editingTodoId, { title, description, dueDate });

            const todo = window.todos.find(t => t.id === editingTodoId);
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
                priority: window.todos.length
            };
            const savedTodo = await window.supabaseService.saveTodo(newTodo);
            window.todos.push(savedTodo);
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
            await window.supabaseService.deleteTodo(id);
            window.todos = window.todos.filter(t => t.id !== id);
            renderTodos();
        } catch (error) {
            alert('삭제에 실패했습니다: ' + error.message);
        }
    }
}

function toggleTodoComplete(id) {
    const todo = window.todos.find(t => t.id === id);
    if (!todo) return;

    if (!todo.completed) {
        const todoElement = document.querySelector(`.todo-item[data-id="${id}"]`);
        if (todoElement) {
            todoElement.style.opacity = '0';
            todoElement.style.transform = 'translateX(20px)';

            setTimeout(async () => {
                try {
                    await window.supabaseService.moveToTrash(todo, 'todo');
                    await window.supabaseService.deleteTodo(id);
                    window.todos = window.todos.filter(t => t.id !== id);
                    renderTodos();
                } catch (error) {
                    todoElement.style.opacity = '1';
                    todoElement.style.transform = 'none';
                    alert('처리 실패: ' + error.message);
                }
            }, 300);
        }
    }
}

function renderTodos() {
    if (!window.todos || window.todos.length === 0) {
        todoList.innerHTML = `
            <div class="empty-state">
                <p>∅ 아직 등록된 할일이 없어요</p>
                <p class="empty-state-subtitle">위의 "할일 추가" 버튼을 눌러 새로운 할일을 추가해보세요</p>
            </div>
        `;
        return;
    }

    const todos = window.todos.sort((a, b) => (a.priority || 0) - (b.priority || 0));

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

async function openTrashModal() {
    const trashData = await window.supabaseService.fetchTrash();
    window.trash = trashData;
    renderTrash();
    trashModal.classList.add('active');
}

function closeTrashModal() {
    trashModal.classList.remove('active');
}

async function emptyTrash() {
    if (!window.trash || window.trash.length === 0) {
        alert('휴지통이 비어있습니다');
        return;
    }

    if (confirm('휴지통을 완전히 비우시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        try {
            await window.supabaseService.emptyTrash();
            window.trash = [];
            renderTrash();
        } catch (error) {
            alert('비우기 실패: ' + error.message);
        }
    }
}

async function restoreFromTrash(id) {
    const item = window.trash.find(t => t.id === id);
    if (!item) return;

    try {
        const originalData = item.data;
        if (item.item_type === 'routine') {
            const newRoutine = {
                title: originalData.title,
                description: originalData.description,
                completed: false
            };
            await window.supabaseService.saveRoutine(newRoutine);
        } else if (item.item_type === 'todo') {
            const newTodo = {
                title: originalData.title,
                description: originalData.description,
                dueDate: originalData.dueDate,
                completed: false,
                priority: window.todos.length
            };
            await window.supabaseService.saveTodo(newTodo);
        }

        await window.supabaseService.deleteTrashItem(id);

        // 데이터 리로드
        await loadData();

        // 모달 업데이트를 위해 trash만 다시 필터링
        window.trash = window.trash.filter(t => t.id !== id);
        renderTrash();

        alert('복원되었습니다.');
    } catch (error) {
        console.error('복원 실패:', error);
        alert('복원에 실패했습니다: ' + error.message);
    }
}

async function permanentDelete(id) {
    if (confirm('영구적으로 삭제하시겠습니까?')) {
        try {
            await window.supabaseService.deleteTrashItem(id);
            window.trash = window.trash.filter(t => t.id !== id);
            renderTrash();
        } catch (error) {
            alert('삭제 실패: ' + error.message);
        }
    }
}

function renderTrash() {
    if (!window.trash || window.trash.length === 0) {
        trashList.innerHTML = `
            <div class="empty-trash">
                <p>⊗ 휴지통이 비어있습니다</p>
            </div>
        `;
        return;
    }

    trashList.innerHTML = window.trash.map(item => `
        <div class="trash-item">
            <div class="trash-item-header">
                <span class="trash-item-title">${escapeHtml(item.data.title || item.title)}</span>
            </div>
            ${item.data.description ? `<div class="trash-item-description">${escapeHtml(item.data.description)}</div>` : ''}
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
    document.querySelectorAll('.todo-item').forEach(item => item.classList.remove('drag-over'));
    draggedElement = null;
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (this !== draggedElement) this.classList.add('drag-over');
    return false;
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();

    if (draggedElement !== this) {
        const draggedId = draggedElement.dataset.id;
        const targetId = this.dataset.id;

        const draggedIndex = window.todos.findIndex(t => t.id === draggedId);
        const targetIndex = window.todos.findIndex(t => t.id === targetId);

        if (draggedIndex > -1 && targetIndex > -1) {
            const [draggedTodo] = window.todos.splice(draggedIndex, 1);
            window.todos.splice(targetIndex, 0, draggedTodo);

            // 순서 업데이트 로직이 있다면 여기서 처리
            renderTodos();
        }
    }
    return false;
}

// ========================================
// 유틸리티 함수
// ========================================

function escapeHtml(text) {
    if (!text) return '';
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
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

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
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

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
        notificationStatus.textContent = '! 알림이 차단되었습니다';
    }
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            checkNotificationPermission();
            new Notification('알림 설정 완료', { body: '이제 루틴 알림을 받을 수 있습니다' });
        }
    } catch (error) {
        console.error('알림 권한 요청 실패:', error);
    }
}

function startTimeChecking() {
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === RESET_HOUR && now.getMinutes() === 0 && now.getSeconds() === 0) {
            // 초기화 로직 (필요시 구현)
            window.location.reload();
        }
    }, 1000);
}

// 전역 함수 노출 (HTML onclick 핸들러용)
window.openEditRoutineModal = openEditRoutineModal;
window.deleteRoutine = deleteRoutine;
window.toggleRoutineComplete = toggleRoutineComplete;
window.openEditTodoModal = openEditTodoModal;
window.deleteTodo = deleteTodo;
window.toggleTodoComplete = toggleTodoComplete;
window.restoreFromTrash = restoreFromTrash;
window.permanentDelete = permanentDelete;
