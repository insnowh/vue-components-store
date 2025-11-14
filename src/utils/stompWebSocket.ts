// 安装依赖
// npm install @stomp/stompjs sockjs-client

import { Client , type IMessage , type StompSubscription  } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.min.js';
import { ref , onUnmounted } from 'vue';
import {getToken} from './auth';

// 类型定义
export interface WebSocketMessage {
  id?: string;
  type: string;
  content: any;
  timestamp?: number;
  sender?: string;
}

export interface StompHeaders {
  [key: string]: any;
}

export interface ConnectionOptions {
  headers?: StompHeaders;
  reconnectDelay?: number;
  heartbeatIncoming?: number;
  heartbeatOutgoing?: number;
}


// useStompWebSocket.ts
function useStompWebSocket() {
  const client = ref<Client | null>(null);
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const error = ref<string | null>(null);
  const messages = ref<WebSocketMessage[]>([]);

  // 订阅管理
  const subscriptions = ref<Map<string, StompSubscription>>(new Map());
  
    // 获取 WebSocket 服务器地址
    const getWebSocketUrl = () => {
        return 'http://localhost:8083/ws-chat'; // 替换为你的 WebSocket 服务器地址
    }

  /**
   * 连接 WebSocket
   * @param options 连接选项，可设置请求头等参数
   */
  const connect = (options: ConnectionOptions = {}) => {

    if (isConnecting.value || isConnected.value) {
      console.warn('WebSocket 正在连接或已连接');
      return;
    }

    isConnecting.value = true;
    error.value = null;

    try {
      console.log('Authorization'+ getToken());
      
      // 创建 STOMP 客户端
      client.value = new Client({
        // 使用 SockJS 作为传输层
        webSocketFactory: () => new SockJS(getWebSocketUrl()),
        
        // 设置连接头 - 这里可以添加认证信息等
        connectHeaders: {
          'Authorization': getToken() ? `Bearer ${getToken()}` : '', // 示例：JWT Token（确保为字符串）
          // 没必要，后端从JWT中解析
          // 'User-Id': 'user123', // 示例：用户ID
          'Client-Type': 'web-frontend',
          ...options.headers // 合并外部传入的headers
        },

        // 重连配置
        reconnectDelay: options.reconnectDelay || 5000,
        heartbeatIncoming: options.heartbeatIncoming || 40000,
        heartbeatOutgoing: options.heartbeatOutgoing || 40000,

        // 连接回调
        onConnect: (frame) => {
          console.log('STOMP 连接成功');
          isConnected.value = true;
          isConnecting.value = false;
          error.value = null;
          
          // 订阅用户专属队列
          subscribeToUserQueue();
          
          // 订阅公共主题（如果需要）
          subscribeToPublicTopics();
        },
        
        // 断开连接回调
        onDisconnect: (frame) => {
          console.log('STOMP 连接断开', frame);
          isConnected.value = false;
          isConnecting.value = false;
          clearSubscriptions();
        },

        // WebSocket 关闭回调
        onWebSocketClose: (event) => {
          console.log('WebSocket 连接关闭', event);
          isConnected.value = false;
          isConnecting.value = false;
        },

        // STOMP 错误处理
        onStompError: (frame) => {
          console.error('STOMP 协议错误:', frame);
          error.value = `STOMP错误: ${frame.headers?.message || '未知错误'}`;
          isConnecting.value = false;
        },
        
        // WebSocket 错误处理
        onWebSocketError: (event) => {
          console.error('WebSocket 错误:', event);
          error.value = `WebSocket连接错误`;
          isConnecting.value = false;
        }

      });
      
      // 激活客户端
      client.value.activate();
    } catch (err:any) {
      console.error('连接初始化错误:', err);
      error.value = `连接初始化错误: ${err}`;
      isConnecting.value = false;
    }
    
  };

  // 订阅用户专属消息队列
  const subscribeToUserQueue = (): StompSubscription | null => {
    if (!client.value || !isConnected.value) {
      console.warn('客户端未连接，无法订阅用户队列');
      return null;
    }
    

    try {
      // 关键：订阅用户专属队列
      // 这个路径对应后端的 convertAndSendToUser 发送路径
      const subscription = client.value.subscribe(
        `/user/queue/messages`,
        (message: IMessage) => {
          try {
            const parsedMessage: WebSocketMessage = JSON.parse(message.body);
            messages.value.push(parsedMessage);
            console.log('收到用户专属消息:', parsedMessage);
            
            // 触发消息接收事件
            window.dispatchEvent(new CustomEvent('websocket-message', {
              detail: parsedMessage
            }));
          } catch (error) {
            console.error('消息解析错误:', error, message.body);
          }
        },
        {
          // 订阅时可以添加额外的headers
          'id': `user-queue-${Date.now()}`,
          'persistent': 'true'
        }
      );
      
      subscriptions.value.set('/user/queue/messages', subscription);
      return subscription;
    } catch (err) {
      console.error('订阅用户队列失败:', err);
      return null;
    }
  };


  /**
   * 订阅公共主题（广播消息）
   */
  const subscribeToPublicTopics = (): void => {
    if (!client.value || !isConnected.value) return;
    
    try {
      // 订阅公共通知
      const notificationSub = client.value.subscribe(
        '/topic/notifications', 
        (message: IMessage) => {
          const notification = JSON.parse(message.body);
          console.log('收到公共通知:', notification);
        },
        { 'id': `topic-notifications-${Date.now()}` }
      );
      subscriptions.value.set('/topic/notifications', notificationSub);
      
      // 订阅聊天室消息
      const chatSub = client.value.subscribe(
        '/topic/chat/room/*', 
        (message: IMessage) => {
          const chatMessage = JSON.parse(message.body);
          console.log('收到聊天室消息:', chatMessage);
        },
        { 'id': `topic-chat-${Date.now()}` }
      );
      subscriptions.value.set('/topic/chat/room/*', chatSub);
    } catch (err) {
      console.error('订阅公共主题失败:', err);
    }
  };

  /**
   * 自定义订阅方法
   * @param destination 目标地址
   * @param callback 消息回调
   * @param headers 订阅头信息
   */
  const subscribe = (
    destination: string, 
    callback: (message: WebSocketMessage) => void,
    headers: StompHeaders = {}
  ): StompSubscription | null => {
    if (!client.value || !isConnected.value) {
      console.warn('客户端未连接，无法订阅');
      return null;
    }
    
    try {
      const subscription = client.value.subscribe(
        destination,
        (message: IMessage) => {
          try {
            const parsedMessage: WebSocketMessage = JSON.parse(message.body);
            callback(parsedMessage);
          } catch (error) {
            console.error('消息解析错误:', error);
          }
        },
        { 
          'id': `sub-${destination}-${Date.now()}`,
          ...headers 
        }
      );
      
      subscriptions.value.set(destination, subscription);
      return subscription;
    } catch (err) {
      console.error(`订阅 ${destination} 失败:`, err);
      return null;
    }
  };

  /**
   * 取消订阅
   * @param destination 目标地址
   */
  const unsubscribe = (destination: string): void => {
    const subscription = subscriptions.value.get(destination);
    if (subscription) {
      subscription.unsubscribe();
      subscriptions.value.delete(destination);
      console.log(`已取消订阅: ${destination}`);
    }
  };

  /**
   * 发送消息到应用目的地
   * @param destination 目标地址
   * @param body 消息体
   * @param headers 消息头信息
   */
  const sendMessage = (
    destination: string, 
    body: any, 
    headers: StompHeaders = {}
  ): boolean => {
    if (!client.value || !isConnected.value) {
      console.warn('客户端未连接，无法发送消息');
      return false;
    }

    try {
      client.value.publish({
        destination: `/app${destination}`,
        body: JSON.stringify(body),
        headers: {
          'content-type': 'application/json',
          'timestamp': Date.now().toString(),
          ...headers
        }
      });
      return true;
    } catch (err) {
      console.error('发送消息失败:', err);
      return false;
    }
  };

  /**
   * 发送消息到指定目的地（不自动添加/app前缀）
   * @param destination 完整的目标地址
   * @param body 消息体
   * @param headers 消息头信息
   */
  const sendToDestination = (
    destination: string,
    body: any,
    headers: StompHeaders = {}
  ): boolean => {
    if (!client.value || !isConnected.value) {
      console.warn('客户端未连接，无法发送消息');
      return false;
    }

    try {
      client.value.publish({
        destination,
        body: JSON.stringify(body),
        headers: {
          'content-type': 'application/json',
          ...headers
        }
      });
      return true;
    } catch (err) {
      console.error('发送消息失败:', err);
      return false;
    }
  };

  /**
   * 清除所有订阅
   */
  const clearSubscriptions = (): void => {
    subscriptions.value.forEach((subscription, destination) => {
      subscription.unsubscribe();
      console.log(`已取消订阅: ${destination}`);
    });
    subscriptions.value.clear();
  };

  /**
   * 断开连接
   */
  const disconnect = (): void => {
    if (client.value) {
      clearSubscriptions();
      client.value.deactivate();
      client.value = null;
    }
    isConnected.value = false;
    isConnecting.value = false;
  };

  /**
   * 重新连接
   * @param options 连接选项
   */
  const reconnect = (options: ConnectionOptions = {}): void => {
    disconnect();
    // 延迟一下确保完全断开
    setTimeout(() => {
      connect(options);
    }, 1000);
  };

  // 自动清理：组件卸载时断开连接
  onUnmounted(() => {
    disconnect();
  });

  return {
    // 状态
    client,
    isConnected,
    isConnecting,
    error,
    messages,
    
    // 方法
    connect,
    disconnect,
    reconnect,
    sendMessage,
    sendToDestination,
    subscribe,
    unsubscribe,
    
    // 工具方法
    clearSubscriptions
  };
}

// 默认导出
export default useStompWebSocket;