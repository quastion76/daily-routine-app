// Supabase 설정 및 초기화
// 사용자가 제공한 올바른 정보 적용 (2026-02-05)
const SUPABASE_URL = 'https://osjszfwgguyyjeuhqlor.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zanN6ZndnZ3V5eWpldWhxbG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTc5MjAsImV4cCI6MjA4NTgzMzkyMH0.VMAaiLIiaEwFDPKI94Xp2PAY3XZCz8OMr9Ovy0hzfro';

// Supabase 클라이언트 생성
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
    }
});

// 자동 로그인 정보
const AUTO_LOGIN = {
    email: 'doomwarp@gmail.com',
    password: 'kym0310!@#'
};

// 현재 사용자
let currentUser = null;

// ========================================
// 인증 관리
// ========================================

async function initAuth() {
    console.log('🔐 인증 초기화 시작...');

    // 1. 현재 세션 확인
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError) {
        console.error('❌ 세션 확인 에러: ' + sessionError.message);
    }

    if (session) {
        console.log('✅ 기존 세션 발견');
        console.log('👤 User ID: ' + session.user.id);
        currentUser = session.user;
        await loadAllData();
        return;
    }

    // 2. 자동 로그인 시도
    console.log('🔑 자동 로그인 시도 중...');

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: AUTO_LOGIN.email,
        password: AUTO_LOGIN.password
    });

    if (error) {
        console.error('❌ 로그인 실패: ' + error.message);
        console.warn('⚠️ 데이터 동기화가 작동하지 않습니다.');
        return;
    }

    console.log('✅ 로그인 성공!');
    console.log('👤 User ID: ' + data.user.id);

    currentUser = data.user;
    await loadAllData();
}

// 모든 데이터 로드
async function loadAllData() {
    console.log('📥 데이터 로딩 중...');
    try {
        await Promise.all([
            loadRoutinesFromSupabase(),
            loadTodosFromSupabase(),
            loadTrashFromSupabase()
        ]);
        console.log('✅ 모든 초기 데이터 로드 완료');
    } catch (e) {
        console.error('❌ 데이터 로드 중 에러 발생: ' + e.message);
    }
}

// ========================================
// Routines CRUD (Supabase)
// ========================================

async function loadRoutinesFromSupabase() {
    const { data, error } = await supabaseClient
        .from('routines')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('루틴 로딩 실패:', error);
        return;
    }

    routines = data || [];
    renderRoutines();
}

async function saveRoutineToSupabase(routine) {
    const { data, error } = await supabaseClient
        .from('routines')
        .insert([{
            user_id: currentUser.id,
            title: routine.title,
            description: routine.description,
            completed: routine.completed
        }])
        .select()
        .single();

    if (error) {
        console.error('루틴 저장 실패:', error);
        throw error;
    }

    return data;
}

async function updateRoutineInSupabase(id, updates) {
    const { error } = await supabaseClient
        .from('routines')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('루틴 업데이트 실패:', error);
        throw error;
    }
}

async function deleteRoutineFromSupabase(id) {
    const { error } = await supabaseClient
        .from('routines')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('루틴 삭제 실패:', error);
        throw error;
    }
}

// ========================================
// Todos CRUD (Supabase)
// ========================================

async function loadTodosFromSupabase() {
    const { data, error } = await supabaseClient
        .from('todos')
        .select('*')
        .order('priority', { ascending: true });

    if (error) {
        console.error('할일 로딩 실패:', error);
        return;
    }

    todos = data || [];
    renderTodos();
}

async function saveTodoToSupabase(todo) {
    const { data, error } = await supabaseClient
        .from('todos')
        .insert([{
            user_id: currentUser.id,
            title: todo.title,
            description: todo.description,
            due_date: todo.due_date || todo.dueDate, // 필드명 호환성
            completed: todo.completed,
            priority: todo.priority || 0
        }])
        .select()
        .single();

    if (error) {
        console.error('할일 저장 실패:', error);
        throw error;
    }

    return data;
}

async function updateTodoInSupabase(id, updates) {
    const { error } = await supabaseClient
        .from('todos')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('할일 업데이트 실패:', error);
        throw error;
    }
}

async function deleteTodoFromSupabase(id) {
    const { error } = await supabaseClient
        .from('todos')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('할일 삭제 실패:', error);
        throw error;
    }
}

// ========================================
// Trash CRUD (Supabase)
// ========================================

async function loadTrashFromSupabase() {
    const { data, error } = await supabaseClient
        .from('trash')
        .select('*')
        .order('deleted_at', { ascending: false });

    if (error) {
        console.error('휴지통 로딩 실패:', error);
        return;
    }

    trash = data || [];
}

async function moveToTrashSupabase(item, type) {
    const { error } = await supabaseClient
        .from('trash')
        .insert([{
            user_id: currentUser.id,
            original_id: item.id,
            item_type: type,
            data: item
        }]);

    if (error) {
        console.error('휴지통 이동 실패:', error);
        throw error;
    }
}

async function deleteTrashItemFromSupabase(id) {
    const { error } = await supabaseClient
        .from('trash')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('휴지통 항목 삭제 실패:', error);
        throw error;
    }
}

async function emptyTrashSupabase() {
    const { error } = await supabaseClient
        .from('trash')
        .delete()
        .eq('user_id', currentUser.id);

    if (error) {
        console.error('휴지통 비우기 실패:', error);
        throw error;
    }
}

// ========================================
// 실시간 동기화
// ========================================

function setupRealtimeSubscriptions() {
    // Routines 실시간 구독
    supabaseClient
        .channel('routines-changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'routines' },
            (payload) => {
                console.log('루틴 변경 감지:', payload);
                loadRoutinesFromSupabase();
            }
        )
        .subscribe();

    // Todos 실시간 구독
    supabaseClient
        .channel('todos-changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'todos' },
            (payload) => {
                console.log('할일 변경 감지:', payload);
                loadTodosFromSupabase();
            }
        )
        .subscribe();

    console.log('📡 실시간 동기화 활성화');
}

// 앱 초기화 시 인증 실행
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    setupRealtimeSubscriptions();
});
