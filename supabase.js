// Supabase 설정 및 초기화
// 사용자가 제공한 올바른 정보 적용 (2026-02-05)
const SUPABASE_URL = 'https://osjszfwgguyyjeuhqlor.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zanN6ZndnZ3V5eWpldWhxbG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTc5MjAsImV4cCI6MjA4NTgzMzkyMH0.VMAaiLIiaEwFDPKI94Xp2PAY3XZCz8OMr9Ovy0hzfro';

// Supabase 클라이언트 생성 (옵션 추가: 세션 지속성 및 자동 갱신)
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

// window.logToScreen 사용 (index.html에 정의됨)

// ========================================
// 인증 관리
// ========================================

// 연결 상태 정밀 진단
async function testNetwork() {
    logToScreen('📡 네트워크 정밀 진단 중...', 'info');
    logToScreen(`ℹ️ Target: ${SUPABASE_URL}`, 'info');

    try {
        // 1. 일반 요청 (CORS, apikey 포함)
        const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'HEAD',
            headers: { 'apikey': SUPABASE_ANON_KEY }
        });

        if (res.ok) {
            logToScreen(`✅ 정상 연결 확인 (Status: ${res.status})`, 'success');
            return true;
        } else {
            logToScreen(`⚠️ 서버 응답 코드: ${res.status}`, 'error');
            // 400번대 에러라도 서버가 응답했으면 연결은 성공한 것임
            return true;
        }
    } catch (e) {
        logToScreen(`❌ 일반 연결 실패: ${e.message}`, 'error');

        // 2. no-cors 요청 (CORS 무시하고 연결만 확인)
        logToScreen('🕵️ CORS 문제인지 확인 중...', 'info');
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/`, {
                method: 'HEAD',
                mode: 'no-cors' // 응답은 못 읽지만 연결 여부는 확인 가능
            });
            logToScreen('🚨 네트워크는 연결되지만 보안(CORS)에 막혔습니다!', 'error');
            logToScreen('👉 해결책: Supabase 대시보드에서 CORS 설정을 확인해야 합니다.', 'info');
        } catch (e2) {
            logToScreen(`☠️ 완전히 연결할 수 없습니다: ${e2.message}`, 'error');
            logToScreen('인터넷 연결이나 방화벽을 확인해주세요.', 'error');
        }
        return false;
    }
}

async function initAuth() {
    logToScreen('🔐 인증 초기화 시작...');

    // 네트워크 사전 점검
    await testNetwork();

    // 1. 현재 세션 확인
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError) {
        logToScreen('❌ 세션 확인 에러: ' + sessionError.message, 'error');
    }

    if (session) {
        logToScreen('✅ 기존 세션 발견', 'success');
        logToScreen('👤 User ID: ' + session.user.id);
        currentUser = session.user;
        await loadAllData();
        return;
    }

    // 2. 자동 로그인 시도
    logToScreen('🔑 자동 로그인 시도 중...');
    logToScreen(`📧 Email: ${AUTO_LOGIN.email.substring(0, 3)}***@***`); // 이메일 일부만 노출

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: AUTO_LOGIN.email,
        password: AUTO_LOGIN.password
    });

    if (error) {
        logToScreen('❌ 로그인 실패: ' + error.message, 'error');
        logToScreen('⚠️ 데이터 동기화가 작동하지 않습니다.', 'error');
        return;
    }

    logToScreen('✅ 로그인 성공!', 'success');
    logToScreen('👤 User ID: ' + data.user.id);
    logToScreen('✨ 데이터 공유가 활성화되었습니다.', 'success');

    currentUser = data.user;
    await loadAllData();
}

// 모든 데이터 로드
async function loadAllData() {
    logToScreen('📥 데이터 로딩 중...');
    try {
        await Promise.all([
            loadRoutinesFromSupabase(),
            loadTodosFromSupabase(),
            loadTrashFromSupabase()
        ]);
        logToScreen('✅ 모든 초기 데이터 로드 완료', 'success');
    } catch (e) {
        logToScreen('❌ 데이터 로드 중 에러 발생: ' + e.message, 'error');
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
