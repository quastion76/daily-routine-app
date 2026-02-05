// Supabase 설정 및 초기화
const SUPABASE_URL = 'https://osjszfwgguyyjeuhqlor.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zanN6ZndnZ3V5eWpldWhxbG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTc5MjAsImV4cCI6MjA4NTgzMzkyMH0.VMAaiLIiaEwFDPKI94Xp2PAY3XZCz8OMr9Ovy0hzfro';

// 전역 변수 초기화 (app.js와 공유)
window.routines = [];
window.todos = [];
window.trash = [];

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

// 모든 데이터 로드 (전역 변수에 할당)
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

const DEFAULT_ROUTINES = [
    { title: '재활용품 수거', description: '협곡길(1), 거점지역(3), 아부레이 채석장(1), 오리지늄 연구구역(2), 광맥구역(2), 에너지 공급 고지(2)' },
    { title: '무트코인 (거래소)', description: '시세 확인 후 유리한 품목 매매 (루틴 최우선)' },
    { title: '딸배 (물류 운송)', description: '사명 위탁 돌려놓기' },
    { title: '이성 빼기', description: '에너지 풀 차기 전에 소모' },
    { title: '서브거점 관리', description: '생산 물품 단순 납품 및 수거' },
    { title: '제강호 시설 관리', description: '제강호 업그레이드 및 생산 대기열 확인' },
    { title: '희귀 자원 채집', description: '리젠된 희귀 재료 포인트 파밍' },
    { title: '선물로 신뢰도 올리기', description: '오퍼레이터별 선호 선물 전달 및 신뢰도 관리' }
];

async function loadRoutinesFromSupabase() {
    const { data, error } = await supabaseClient
        .from('routines')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('루틴 로딩 실패:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('✨ 기본 루틴 데이터 초기화 중...');
        await seedDefaultRoutines();
    } else {
        window.routines = data; // 전역 변수 업데이트
        renderRoutines();
    }
}

async function seedDefaultRoutines() {
    if (!currentUser) return;

    const inserts = DEFAULT_ROUTINES.map(r => ({
        user_id: currentUser.id,
        title: r.title,
        description: r.description,
        completed: false
    }));

    const { data, error } = await supabaseClient
        .from('routines')
        .insert(inserts)
        .select();

    if (error) {
        console.error('기본 루틴 추가 실패:', error);
    } else {
        window.routines = data; // 전역 변수 업데이트
        renderRoutines();
    }
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

    window.todos = data || []; // 전역 변수 업데이트
    renderTodos();
}

async function saveTodoToSupabase(todo) {
    const dueDate = (todo.due_date || todo.dueDate) ? (todo.due_date || todo.dueDate) : null;

    const { data, error } = await supabaseClient
        .from('todos')
        .insert([{
            user_id: currentUser.id,
            title: todo.title,
            description: todo.description,
            due_date: dueDate,
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

    window.trash = data || []; // 전역 변수 업데이트
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

    await loadTrashFromSupabase();
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

    await loadTrashFromSupabase();
}

// ========================================
// Realtime & Init
// ========================================

function setupRealtimeSubscriptions() {
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
}

// 전역 스코프에 주요 함수 노출 (app.js 등에서 접근 가능하도록)
window.saveRoutineToSupabase = saveRoutineToSupabase;
window.updateRoutineInSupabase = updateRoutineInSupabase;
window.deleteRoutineFromSupabase = deleteRoutineFromSupabase;
window.saveTodoToSupabase = saveTodoToSupabase;
window.updateTodoInSupabase = updateTodoInSupabase;
window.deleteTodoFromSupabase = deleteTodoFromSupabase;
window.moveToTrashSupabase = moveToTrashSupabase;
window.deleteTrashItemFromSupabase = deleteTrashItemFromSupabase;
window.emptyTrashSupabase = emptyTrashSupabase;
window.loadTrashFromSupabase = loadTrashFromSupabase;
window.loadRoutinesFromSupabase = loadRoutinesFromSupabase;
window.loadTodosFromSupabase = loadTodosFromSupabase;

// 초기화 시작
document.addEventListener('DOMContentLoaded', async () => {
    // window.supabase 로딩 대기
    if (!window.supabase) {
        console.warn('Supabase SDK 로딩 지연... 1초 후 재시도');
        setTimeout(async () => {
            await initAuth();
            setupRealtimeSubscriptions();
        }, 1000);
    } else {
        await initAuth();
        setupRealtimeSubscriptions();
    }
});
