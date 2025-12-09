<template>
    <div class="ai-chat">
        <!-- 连接状态 -->
        <div :class="['status', isConnected ? 'connected' : 'disconnected']">
            {{ isConnected ? 'AI已连接' : 'AI未连接' }}
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
            <textarea v-model="inputMessage" @keydown.enter.exact.prevent="send" placeholder="输入您的问题..."></textarea>
            <button @click="send" :disabled="!isConnected || !inputMessage.trim()">发送</button>
            <button @click="toggleConnection" class="connect-btn">
                {{ isConnected ? '断开连接' : '连接AI' }}
            </button>
        </div>

        <!-- 模型选择 -->
        <div class="model-selector">
            <label>选择模型:</label>
            <select v-model="selectedModel">
                <option v-for="model in availableModels" :key="model.name" :value="model.name">
                    {{ model.name }} ({{ (model.size / 1024 / 1024).toFixed(0) }}MB)
                </option>
            </select>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { aiService, useAIWebSocket } from '@/api/AIService';

// 响应式数据
const inputMessage = ref('');
const messages = ref<Array<{role: 'user' | 'ai', content: string}>>([]);
const availableModels = ref<any[]>([]);
const selectedModel = ref('qwen2.5:3b');
const isReceiving = ref(false);
const currentAiResponse = ref('');

// WebSocket
const { isConnected, connect, sendMessage: sendWsMessage, disconnect } = useAIWebSocket();

// 初始化：加载模型列表
onMounted(async () => {
    try {
        const res = await aiService.getModels();
        availableModels.value = res.data || [];
    } catch (error) {
        console.error('加载模型列表失败:', error);
    }
});

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
            break;
        case 'error':
            console.error('AI服务错误:', data.message);
            messages.value.push({ role: 'ai', content: `错误: ${data.message}` });
            break;
    }
};

const handleWsError = (error: Event) => {
    console.error('WebSocket错误:', error);
};

// 发送消息
const send = async () => {
    if (!inputMessage.value.trim()) return;

    const userMessage = inputMessage.value;
    messages.value.push({ role: 'user', content: userMessage });
    inputMessage.value = '';

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
            // AxiosResponse has `status`; check HTTP status and presence of data
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
.ai-chat {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    max-width: 600px;
    margin: 0 auto;
}

.status {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 12px;
    display: inline-block;
}
.status.connected {
    background-color: #e8f5e9;
    color: #2e7d32;
}
.status.disconnected {
    background-color: #ffebee;
    color: #c62828;
}

.message-container {
    min-height: 300px;
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
}

.message {
    margin-bottom: 8px;
    padding: 8px;
    border-radius: 4px;
}
.message:nth-child(odd) {
    background-color: #f9f9f9;
}

.input-area {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
}
.input-area textarea {
    flex: 1;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
}
.input-area button {
    padding: 8px 16px;
    background-color: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}
.input-area button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
}
.connect-btn {
    background-color: #757575 !important;
}

.model-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
}
.model-selector select {
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #ddd;
}
</style>