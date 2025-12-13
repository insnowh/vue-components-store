
<template>
    <div class="ai-chat">
        <!-- 会话管理区域 -->
        <div class="chat-header">
            <div class="session-info">
                <div v-if="currentSession" class="session-title">
                    {{ currentSession.title }}
                </div>
                <div v-else class="session-title">
                    新对话
                </div>
                <div :class="['status', isConnected ? 'connected' : 'disconnected']">
                    {{ isConnected ? 'AI已连接' : 'AI未连接' }}
                </div>
            </div>
            
            <div class="session-controls">
                <button v-if="isLoggedIn" @click="createNewSession" class="session-btn" title="新对话">
                    🆕
                </button>
                <button v-if="isLoggedIn && currentSession" @click="deleteCurrentSession" class="session-btn delete" title="删除当前对话">
                    🗑️
                </button>
            </div>
        </div>

        <!-- 消息展示区域 -->
        <div class="message-container">
            <div v-for="(msg, index) in messages" :key="index" class="message">
                <strong>{{ msg.role === 'user' ? '你' : 'AI' }}:</strong>
                {{ msg.content }}
            </div>
            <div v-if="isReceiving" class="typing-indicator">AI正在输入...</div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
            <textarea 
                v-model="inputMessage" 
                @keydown.enter.exact.prevent="send" 
                :placeholder="isLoggedIn ? '输入您的问题...' : '请先登录以保存对话'"
                :disabled="!isConnected"
            ></textarea>
            <button @click="send" :disabled="!isConnected || !inputMessage.trim()">
                发送
            </button>
            <button @click="toggleConnection" class="connect-btn">
                {{ isConnected ? '断开连接' : '连接AI' }}
            </button>
        </div>

        <!-- 模型选择和用户信息 -->
        <div class="footer-controls">
            <div class="model-selector">
                <label>选择模型:</label>
                <select v-model="selectedModel" :disabled="!isConnected">
                    <option v-for="model in availableModels" :key="model.name" :value="model.name">
                        {{ model.name }} ({{ (model.size / 1024 / 1024).toFixed(0) }}MB)
                    </option>
                </select>
            </div>
            
            <div v-if="isLoggedIn" class="user-info">
                已登录: {{ username }}
            </div>
            <div v-else class="login-prompt">
                <button @click="showLogin = true" class="login-btn">
                    登录以保存对话
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { aiService, useAIWebSocket } from '@/api/AIService';

// 响应式数据
const inputMessage = ref('');
const messages = ref<Array<{role: 'user' | 'ai', content: string}>>([]);
const availableModels = ref<any[]>([]);
const selectedModel = ref('qwen2.5:3b');
const isReceiving = ref(false);
const currentAiResponse = ref('');
const currentSession = ref<any>(null);
const isLoggedIn = ref(false);
const username = ref('');
const showLogin = ref(false);

// WebSocket
const { isConnected, connect, sendMessage: sendWsMessage, disconnect, setUserId } = useAIWebSocket();

// 计算属性
const hasHistory = computed(() => messages.value.length > 0);

// 初始化
onMounted(async () => {
    try {
        // 加载模型列表
        const res = await aiService.getModels();
        availableModels.value = res.data || [];
        
        // 检查登录状态
        checkLoginStatus();
        
        // 如果有登录用户，加载最近会话
        if (isLoggedIn.value) {
            await loadRecentSession();
        }
    } catch (error) {
        console.error('初始化失败:', error);
    }
});

// 检查登录状态
const checkLoginStatus = () => {
    // 从localStorage或cookie获取登录状态
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        isLoggedIn.value = true;
        username.value = JSON.parse(user).username;
        
        // 设置用户ID到aiService
        const userId = JSON.parse(user).id;
        setUserId(userId);
    }
};

// 加载最近会话
const loadRecentSession = async () => {
    try {
        const sessionId = aiService.getCurrentSessionId();
        if (sessionId) {
            const response = await aiService.getSessionWithMessages(sessionId);
            if (response.code === 200 && response.data) {
                currentSession.value = response.data.session;
                // 转换消息格式
                const dbMessages = response.data.messages || [];
                messages.value = dbMessages
                    .filter((msg: any) => msg.role !== 'SYSTEM')
                    .map((msg: any) => ({
                        role: msg.role.toLowerCase() === 'user' ? 'user' : 'ai',
                        content: msg.content
                    }));
            }
        }
    } catch (error) {
        console.error('加载会话失败:', error);
    }
};

// 连接/断开WebSocket
const toggleConnection = () => {
    if (isConnected.value) {
        disconnect();
    } else {
        connect(handleWsMessage, handleWsError);
    }
};

// 处理WebSocket消息
const handleWsMessage = (data: any) => {
    switch (data.type) {
        case 'connected':
            console.log('AI服务已连接');
            if (data.sessionId && !currentSession.value) {
                // 如果是新创建的会话，更新当前会话
                currentSession.value = {
                    id: data.sessionId,
                    title: '新对话'
                };
            }
            break;
        case 'start':
            isReceiving.value = true;
            currentAiResponse.value = '';
            messages.value.push({ role: 'ai', content: '' });
            break;
        case 'chunk':
            if (data.content) {
                currentAiResponse.value += data.content;
                // 更新最后一条AI消息
                const lastMsg = messages.value[messages.value.length - 1];
                if (lastMsg.role === 'ai') {
                    lastMsg.content = currentAiResponse.value;
                }
            }
            break;
        case 'end':
            isReceiving.value = false;
            // 如果已登录，可以在这里同步消息到数据库
            break;
        case 'error':
            console.error('AI服务错误:', data.message);
            messages.value.push({ role: 'ai', content: `错误: ${data.message}` });
            break;
        case 'history_loaded':
            // 数据库加载的历史消息
            if (data.messages) {
                messages.value = data.messages.map((msg: any) => ({
                    role: msg.role === 'user' ? 'user' : 'ai',
                    content: msg.content
                }));
            }
            break;
    }
};

const handleWsError = (error: Event) => {
    console.error('WebSocket错误:', error);
};

// 创建新会话
const createNewSession = async () => {
    try {
        const response = await aiService.createSession('新对话', selectedModel.value);
        if (response.code === 200 && response.data) {
            currentSession.value = response.data;
            messages.value = [];
            
            // 重新连接WebSocket以使用新会话
            if (isConnected.value) {
                disconnect();
                setTimeout(() => {
                    connect(handleWsMessage, handleWsError);
                }, 500);
            }
        }
    } catch (error) {
        console.error('创建会话失败:', error);
    }
};

// 删除当前会话
const deleteCurrentSession = async () => {
    if (!currentSession.value || !confirm('确定要删除当前对话吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        const response = await aiService.deleteSession(currentSession.value.id);
        if (response.code === 200) {
            currentSession.value = null;
            messages.value = [];
            aiService.clearCurrentSession();
        }
    } catch (error) {
        console.error('删除会话失败:', error);
    }
};

// 发送消息
const send = async () => {
    if (!inputMessage.value.trim()) return;

    const userMessage = inputMessage.value;
    messages.value.push({ role: 'user', content: userMessage });
    inputMessage.value = '';

    // 如果是第一条消息且没有会话，为登录用户创建会话
    if (isLoggedIn.value && !currentSession.value && messages.value.length === 1) {
        await createNewSession();
    }

    // 方法1: 使用WebSocket流式响应
    if (isConnected.value) {
        sendWsMessage(userMessage, selectedModel.value);
    } 
    // 方法2: 降级为同步HTTP请求
    else {
        try {
            const res = await aiService.sendMessage({ 
                message: userMessage, 
                model: selectedModel.value 
            });
            if (res.status === 200 && res.data) {
                messages.value.push({ role: 'ai', content: res.data.content });
            } else {
                messages.value.push({ role: 'ai', content: '抱歉，AI服务返回错误。' });
            }
        } catch (error) {
            messages.value.push({ role: 'ai', content: '抱歉，AI服务暂时不可用。' });
        }
    }
};

// 清理
onUnmounted(() => {
    disconnect();
});
</script>

<style scoped>
/* 保持原有样式，新增以下样式 */
.chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e0e0e0;
}

.session-info {
    flex: 1;
}

.session-title {
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
    font-size: 14px;
}

.session-controls {
    display: flex;
    gap: 8px;
}

.session-btn {
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 14px;
}

.session-btn.delete {
    color: #dc3545;
}

.session-btn:hover {
    background-color: #f5f5f5;
}

.footer-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e0e0e0;
}

.user-info {
    font-size: 12px;
    color: #666;
}

.login-prompt {
    font-size: 12px;
}

.login-btn {
    padding: 4px 8px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}

.login-btn:hover {
    background-color: #0056b3;
}

/* 其他原有样式保持不变 */
</style>