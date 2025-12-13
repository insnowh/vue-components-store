<template>
    <div class="session-manager">
        <div class="session-header">
            <h3>💬 会话管理</h3>
            <button @click="loadSessions" class="refresh-btn" title="刷新会话列表">
                🔄
            </button>
        </div>
        
        <div class="session-actions">
            <button @click="createNewSession" class="new-session-btn">
                + 新对话
            </button>
        </div>
        
        <div v-if="loading" class="loading-sessions">
            加载中...
        </div>
        
        <div v-else-if="sessions.length === 0" class="no-sessions">
            暂无历史对话
        </div>
        
        <div v-else class="sessions-list">
            <div 
                v-for="session in sessions" 
                :key="session.id"
                class="session-item"
                :class="{ active: session.id === currentSessionId }"
                @click="selectSession(session)"
            >
                <div class="session-title">{{ session.title }}</div>
                <div class="session-info">
                    <span class="session-model">{{ session.model }}</span>
                    <span class="session-time">{{ formatTime(session.updatedAt) }}</span>
                    <span class="session-count">{{ session.messageCount }} 条消息</span>
                </div>
                <div class="session-actions">
                    <button 
                        @click.stop="deleteSession(session.id)" 
                        class="delete-btn"
                        title="删除会话"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { aiService } from '@/api/AIService';

const props = defineProps<{
    currentSessionId?: string;
}>();

const emit = defineEmits<{
    (event: 'session-selected', sessionId: string): void;
    (event: 'session-created', sessionId: string): void;
}>();

const sessions = ref<any[]>([]);
const loading = ref(false);

// 当前会话ID
const currentSessionId = computed(() => props.currentSessionId || aiService.getCurrentSessionId());

// 加载会话列表
const loadSessions = async () => {
    try {
        loading.value = true;
        const response = await aiService.getUserSessions();
        if (response.code === 200) {
            sessions.value = response.data || [];
        } else {
            console.error('加载会话列表失败:', response.msg);
        }
    } catch (error) {
        console.error('加载会话列表失败:', error);
    } finally {
        loading.value = false;
    }
};

// 创建新会话
const createNewSession = async () => {
    try {
        const response = await aiService.createSession('新对话');
        if (response.code === 200 && response.data) {
            // 更新本地列表
            sessions.value.unshift(response.data);
            // 触发事件
            emit('session-created', response.data.id);
            // 重新加载列表
            loadSessions();
        }
    } catch (error) {
        console.error('创建会话失败:', error);
    }
};

// 选择会话
const selectSession = async (session: any) => {
    if (session.id === currentSessionId.value) {
        return;
    }
    
    try {
        // 加载会话消息
        const response = await aiService.getSessionWithMessages(session.id);
        if (response.code === 200) {
            emit('session-selected', session.id);
        }
    } catch (error) {
        console.error('加载会话失败:', error);
    }
};

// 删除会话
const deleteSession = async (sessionId: string) => {
    if (!confirm('确定要删除这个会话吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        const response = await aiService.deleteSession(sessionId);
        if (response.code === 200) {
            // 从列表中移除
            sessions.value = sessions.value.filter(s => s.id !== sessionId);
            // 如果删除的是当前会话，清空当前会话
            if (sessionId === currentSessionId.value) {
                aiService.clearCurrentSession();
            }
        } else {
            console.error('删除会话失败:', response.msg);
        }
    } catch (error) {
        console.error('删除会话失败:', error);
    }
};

// 格式化时间
const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // 1分钟内
        return '刚刚';
    } else if (diff < 3600000) { // 1小时内
        return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // 1天内
        return `${Math.floor(diff / 3600000)}小时前`;
    } else if (diff < 604800000) { // 1周内
        return `${Math.floor(diff / 86400000)}天前`;
    } else {
        return date.toLocaleDateString();
    }
};

// 初始化加载
onMounted(() => {
    loadSessions();
});
</script>

<style scoped>
.session-manager {
    background: white;
    border: 1px solid #e1e4e8;
    border-radius: 8px;
    padding: 16px;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.session-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.session-header h3 {
    margin: 0;
    font-size: 16px;
    color: #24292e;
}

.refresh-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    padding: 4px 8px;
    border-radius: 4px;
}

.refresh-btn:hover {
    background-color: #f6f8fa;
}

.session-actions {
    margin-bottom: 16px;
}

.new-session-btn {
    width: 100%;
    padding: 10px;
    background-color: #2ea44f;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
}

.new-session-btn:hover {
    background-color: #2c974b;
}

.loading-sessions,
.no-sessions {
    text-align: center;
    padding: 20px;
    color: #586069;
    font-size: 14px;
}

.sessions-list {
    flex: 1;
    overflow-y: auto;
    max-height: 400px;
}

.session-item {
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background-color 0.2s;
    border-radius: 6px;
    margin-bottom: 8px;
    border: 1px solid transparent;
}

.session-item:last-child {
    border-bottom: none;
    margin-bottom: 0;
}

.session-item:hover {
    background-color: #f6f8fa;
    border-color: #e1e4e8;
}

.session-item.active {
    background-color: #f0f7ff;
    border-color: #0969da;
}

.session-title {
    font-weight: 500;
    color: #24292e;
    font-size: 14px;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.session-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #586069;
}

.session-model {
    background-color: #e9ecef;
    padding: 2px 6px;
    border-radius: 4px;
}

.session-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
}

.delete-btn {
    background: none;
    border: none;
    color: #dc3545;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 6px;
    border-radius: 4px;
}

.delete-btn:hover {
    background-color: #f8d7da;
}
</style>