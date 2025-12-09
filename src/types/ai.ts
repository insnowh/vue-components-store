// src/types/ai.types.ts

// WebSocket消息类型
export interface AIStreamMessage {
    type: 'connected' | 'start' | 'chunk' | 'end' | 'error';
    message?: string;
    model?: string;
    content?: string;
    done?: boolean;
}

// 请求/响应类型
export interface AIChatRequest {
    message: string;
    model?: string;
}

export interface AIChatResponse {
    code: number;
    msg: string;
    data: {
        content: string;
        model: string;
        [key: string]: any;
    };
}

export interface AIModel {
    name: string;
    modified_at: string;
    size: number;
    digest: string;
}

export interface AIModelListResponse {
    code: number;
    msg: string;
    data: AIModel[];
}

export interface AIHealthResponse {
    code: number;
    msg: string;
    data?: {
        version?: string;
        [key: string]: any;
    };
}