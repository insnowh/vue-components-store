import { ref } from 'vue';
import request from '../utils/request';

// 定义类型
type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
    tokens?: number;
    model?: string;
    createdAt?: string;
}

type ChatSession = {
    id: string;
    userId?: number;
    title: string;
    model: string;
    messageCount: number;
    tokenCount: number;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
}

type ChatRequest = {
    message: string;
    model?: string;
    sessionId?: string;
    userId?: number;
}

type ChatResponse = {
    code: number;
    msg: string;
    data: any;
}

type OllamaModel = {
    name: string;
    modified_at: string;
    size: number;
    digest: string;
}

/**
 * AI服务模块
 * 提供与后端AI功能交互的API，包括同步对话、获取模型列表和健康检查。
 * 流式对话通过WebSocket实现，见下面的 useAIWebSocket。
 */
class AIService {
    // 当前会话ID
    private currentSessionId: string | null = null;
    // 当前用户ID（从登录系统获取）
    private currentUserId: number | null = null;
    
    /**
     * 设置当前用户ID
     */
    setCurrentUserId(userId: number) {
        this.currentUserId = userId;
        // 尝试从本地存储恢复会话ID
        const savedSessionId = localStorage.getItem(`ai_session_${userId}`);
        if (savedSessionId) {
            this.currentSessionId = savedSessionId;
        }
    }
    
    /**
     * 获取当前用户ID
     */
    getCurrentUserId(): number | null {
        return this.currentUserId;
    }
    
    /**
     * 发送消息到AI（同步方式）
     */
    async sendMessage(payload: ChatRequest) {
        // 如果用户已登录，添加用户ID
        if (this.currentUserId) {
            payload.userId = this.currentUserId;
        }
        
        return request({
            url: '/ai/chat',
            method: 'post',
            data: payload,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    
    /**
     * 获取Ollama可用的模型列表
     */
    async getModels() {
        return request({
            url: '/ai/models',
            method: 'get'
        });
    }
    
    /**
     * 检查AI服务健康状态
     */
    async checkHealth() {
        return request({
            url: '/ai/health',
            method: 'get'
        });
    }
    
    /**
     * 获取用户的所有会话
     */
    async getUserSessions(): Promise<ChatResponse> {
        if (!this.currentUserId) {
            throw new Error('用户未登录');
        }
        
        return request({
            url: '/api/chat/history/sessions',
            method: 'get',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
    }
    
    /**
     * 创建新会话
     */
    async createSession(title: string = '新对话', model: string = 'qwen2.5:3b'): Promise<ChatResponse> {
        if (!this.currentUserId) {
            throw new Error('用户未登录');
        }
        
        const response = await request({
            url: '/api/chat/history/session',
            method: 'post',
            data: { title, model },
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.data && response.data.id) {
            this.currentSessionId = response.data.id;
            // 保存到本地存储
            localStorage.setItem(`ai_session_${this.currentUserId}`, response.data.id);
        }
        
        return response;
    }
    
    /**
     * 获取会话详情和消息
     */
    async getSessionWithMessages(sessionId: string): Promise<ChatResponse> {
        if (!this.currentUserId) {
            throw new Error('用户未登录');
        }
        
        return request({
            url: `/api/chat/history/session/${sessionId}`,
            method: 'get',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
    }
    
    /**
     * 保存消息到数据库
     */
    async saveMessage(sessionId: string, role: 'system' | 'user' | 'assistant', 
                     content: string, model?: string, tokens?: number): Promise<ChatResponse> {
        if (!this.currentUserId) {
            throw new Error('用户未登录');
        }
        
        return request({
            url: '/api/chat/history/message',
            method: 'post',
            data: {
                sessionId,
                role,
                content,
                model: model || 'qwen2.5:3b',
                tokens
            },
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
    }
    
    /**
     * 删除会话
     */
    async deleteSession(sessionId: string): Promise<ChatResponse> {
        if (!this.currentUserId) {
            throw new Error('用户未登录');
        }
        
        return request({
            url: `/api/chat/history/session/${sessionId}`,
            method: 'delete',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
    }
    
    /**
     * 设置当前会话ID
     */
    setCurrentSessionId(sessionId: string) {
        this.currentSessionId = sessionId;
        if (this.currentUserId) {
            localStorage.setItem(`ai_session_${this.currentUserId}`, sessionId);
        }
    }
    
    /**
     * 获取当前会话ID
     */
    getCurrentSessionId(): string | null {
        return this.currentSessionId;
    }
    
    /**
     * 清除当前会话
     */
    clearCurrentSession() {
        this.currentSessionId = null;
        if (this.currentUserId) {
            localStorage.removeItem(`ai_session_${this.currentUserId}`);
        }
    }
}

// 导出单例
export const aiService = new AIService();

import { useInfoStore } from '@/stores/userStores';


// let userInfo: any;


/**
 * AI流式对话WebSocket Hook
 */
export function useAIWebSocket() {
    let socket: WebSocket | null = null;
    const isConnected = ref(false);
    const messageHistory = ref<ChatMessage[]>([]);
    const currentSessionId = ref<string | null>(null);
    const currentUserId = ref<number | null>(null);

    // 引入用户store
    const userStore = useInfoStore();
    
    
    // 从aiService获取用户ID
    currentUserId.value = aiService.getCurrentUserId();
    
    
    /**
     * 连接到AI流式WebSocket端点
     */
    const connect = async (onMessage: (data: any) => void, onError?: (error: Event) => void) => {
        const baseUrl = "ws://localhost:8083";
        
        // 构建WebSocket URL，包含用户ID和会话ID
        let wsUrl = `${baseUrl}/ws/ai/stream`;

                
        // 从store获取用户信息（此时store应该已经初始化）
        const userInfo = userStore.getUserInfo();

        console.log("userInfo:" + userInfo.id);
        
        
        const params = new URLSearchParams();
        if (userInfo.id) {
            params.append('userId', userInfo.id.toString());
        }
        
        const sessionId = aiService.getCurrentSessionId();
        if (sessionId) {
            params.append('sessionId', sessionId);
            currentSessionId.value = sessionId;
        }
        
        if (params.toString()) {
            wsUrl += `?${params.toString()}`;
        }

        console.log('Connecting to AI WebSocket at', wsUrl);
        
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('AI WebSocket 连接成功');
            isConnected.value = true;
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // 处理历史消息加载
                if (data.type === 'history_loaded' && data.messages) {
                    messageHistory.value = data.messages.map((msg: any) => ({
                        role: msg.role,
                        content: msg.content
                    }));
                }
                
                // 处理会话ID
                if (data.sessionId) {
                    currentSessionId.value = data.sessionId;
                    aiService.setCurrentSessionId(data.sessionId);
                }
                
                if (onMessage) onMessage(data);
            } catch (e) {
                console.error('解析WebSocket消息失败:', e, event.data);
            }
        };

        socket.onerror = (error) => {
            console.error('AI WebSocket 错误:', error);
            if (onError) onError(error);
        };

        socket.onclose = () => {
            console.log('AI WebSocket 连接关闭');
            isConnected.value = false;
            socket = null;
        };
    };

    /**
     * 通过WebSocket发送消息给AI
     */
    const sendMessage = (message: string, model: string = 'qwen2.5:3b') => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            console.error('WebSocket未连接');
            return;
        }
        
        const payload = {
            message,
            model
        };
        socket.send(JSON.stringify(payload));
    };

    /**
     * 断开WebSocket连接
     */
    const disconnect = () => {
        if (socket) {
            socket.close();
            socket = null;
        }
        isConnected.value = false;
    };
    
    /**
     * 设置用户ID
     */
    const setUserId = (userId: number) => {
        currentUserId.value = userId;
        aiService.setCurrentUserId(userId);
    };

    return {
        isConnected,
        messageHistory,
        currentSessionId,
        connect,
        sendMessage,
        disconnect,
        setUserId
    };
}