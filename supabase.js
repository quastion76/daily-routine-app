// ========================================
// Supabase Service Module
// ========================================

const SUPABASE_URL = 'https://osjszfwgguyyjeuhqlor.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zanN6ZndnZ3V5eWpldWhxbG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTc5MjAsImV4cCI6MjA4NTgzMzkyMH0.VMAaiLIiaEwFDPKI94Xp2PAY3XZCz8OMr9Ovy0hzfro';

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

class SupabaseService {
    constructor() {
        this.client = null;
        this.currentUser = null;
        this.isInitialized = false;
    }

    // 초기화 메서드
    init() {
        if (!window.supabase) {
            console.error('Supabase SDK가 로드되지 않았습니다.');
            return false;
        }

        try {
            this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: false
                }
            });
            this.isInitialized = true;
            console.log('✅ Supabase Client 초기화 성공');
            return true;
        } catch (e) {
            console.error('❌ Supabase Client 초기화 실패:', e);
            alert('서비스 연결에 실패했습니다. 페이지를 새로고침 해주세요.');
            return false;
        }
    }

    // 인증 관련
    async getSession() {
        if (!this.isInitialized) return null;
        const { data: { session }, error } = await this.client.auth.getSession();
        if (error) console.error('세션 확인 오류:', error);

        if (session) {
            this.currentUser = session.user;
        }
        return session;
    }

    async signIn(email, password) {
        if (!this.isInitialized) throw new Error('서비스가 초기화되지 않았습니다.');

        const { data, error } = await this.client.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        this.currentUser = data.user;
        return data.user;
    }

    async signOut() {
        if (!this.isInitialized) return;
        await this.client.auth.signOut();
        this.currentUser = null;
        window.location.reload();
    }

    // 데이터 로드
    async loadAllData() {
        if (!this.currentUser) return { routines: [], todos: [], trash: [] };

        const [routines, todos, trash] = await Promise.all([
            this.fetchRoutines(),
            this.fetchTodos(),
            this.fetchTrash()
        ]);

        return { routines, todos, trash };
    }

    // Routines
    async fetchRoutines() {
        const { data, error } = await this.client
            .from('routines')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('루틴 로딩 실패:', error);
            return [];
        }

        if (!data || data.length === 0) {
            return await this.seedDefaultRoutines();
        }
        return data;
    }

    async seedDefaultRoutines() {
        if (!this.currentUser) return [];

        const inserts = DEFAULT_ROUTINES.map(r => ({
            user_id: this.currentUser.id,
            title: r.title,
            description: r.description,
            completed: false
        }));

        const { data, error } = await this.client
            .from('routines')
            .insert(inserts)
            .select();

        if (error) console.error('기본 루틴 생성 실패:', error);
        return data || [];
    }

    async saveRoutine(routine) {
        const { data, error } = await this.client
            .from('routines')
            .insert([{
                user_id: this.currentUser.id,
                title: routine.title,
                description: routine.description,
                completed: routine.completed
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateRoutine(id, updates) {
        const { error } = await this.client
            .from('routines')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    }

    async deleteRoutine(id) {
        const { error } = await this.client
            .from('routines')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // Todos
    async fetchTodos() {
        const { data, error } = await this.client
            .from('todos')
            .select('*')
            .order('priority', { ascending: true });

        if (error) console.error('할일 로딩 실패:', error);
        return data || [];
    }

    async saveTodo(todo) {
        const { data, error } = await this.client
            .from('todos')
            .insert([{
                user_id: this.currentUser.id,
                title: todo.title,
                description: todo.description,
                due_date: todo.dueDate || null,
                completed: todo.completed,
                priority: todo.priority || 0
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateTodo(id, updates) {
        // DB 컬럼명 매핑 (dueDate -> due_date)
        const dbUpdates = { ...updates };
        if (dbUpdates.dueDate !== undefined) {
            dbUpdates.due_date = dbUpdates.dueDate;
            delete dbUpdates.dueDate;
        }

        const { error } = await this.client
            .from('todos')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    }

    async deleteTodo(id) {
        const { error } = await this.client
            .from('todos')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // Trash
    async fetchTrash() {
        const { data, error } = await this.client
            .from('trash')
            .select('*')
            .order('deleted_at', { ascending: false });

        if (error) console.error('휴지통 로딩 실패:', error);
        return data || [];
    }

    async moveToTrash(item, type) {
        const { error } = await this.client
            .from('trash')
            .insert([{
                user_id: this.currentUser.id,
                original_id: item.id,
                item_type: type,
                data: item
            }]);

        if (error) throw error;
    }

    async deleteTrashItem(id) {
        const { error } = await this.client
            .from('trash')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async emptyTrash() {
        const { error } = await this.client
            .from('trash')
            .delete()
            .eq('user_id', this.currentUser.id);

        if (error) throw error;
    }
}

// 전역 인스턴스 생성
window.supabaseService = new SupabaseService();

