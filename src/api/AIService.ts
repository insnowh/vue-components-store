import { ref } from 'vue';
import request from '../utils/request'; // 使用您已封装的axios实例

// 定义类型（根据您的项目结构，可放在单独types文件中）
type ChatRequest = {
    message: string;
    model?: string; // 可选，不传则用后端默认
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
    /**
     * 发送消息到AI（同步方式）
     * @param payload 包含message和可选model的请求体
     * @returns 包含AI响应内容的数据对象
     */
    async sendMessage(payload: ChatRequest) {
        return request({
            url: '/ai/chat', // 对应后端的 /api/ai/chat
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
}

// 导出单例
export const aiService = new AIService();

/**
 * AI流式对话WebSocket Hook (Vue3 Composition API风格)
 * 这是一个使用示例，您需要在Vue组件中调用它。
 */
export function useAIWebSocket() {
    let socket: WebSocket | null = null;
    const isConnected = ref(false);
    const messageHistory = ref<any[]>([]);

    /**
     * 连接到AI流式WebSocket端点
     * @param onMessage 收到消息时的回调函数
     * @param onError 发生错误时的回调函数
     */
    const connect = (onMessage: (data: any) => void, onError?: (error: Event) => void) => {
        // 构建WebSocket URL，确保与后端端点一致
        // const baseUrl = window.location.origin.replace('http', 'ws');
        const baseUrl = "ws://localhost:8083"; // 替换为你的后端地址
        const wsUrl = `${baseUrl}/ws/ai/stream`; // 对应 WebSocketConfig 中的 /ws/ai/stream

        console.log('Connecting to AI WebSocket at', wsUrl);
        
        
        socket = new WebSocket(wsUrl);
        

        socket.onopen = () => {
            console.log('AI WebSocket 连接成功');
            isConnected.value = true;
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                messageHistory.value.push(data);
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
     * @param message 用户输入的消息
     * @param model 使用的模型，默认为后端配置的默认模型
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

    return {
        isConnected,
        messageHistory,
        connect,
        sendMessage,
        disconnect
    };
}