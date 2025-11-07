// 安装依赖
// npm install @stomp/stompjs sockjs-client

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.min.js';
import { ref } from 'vue';

// useStompWebSocket.ts
export function useStompWebSocket() {
  const client = ref<Client | null>(null);
  const isConnected = ref(false);
  const messages = ref<any[]>([]);
  
    // 获取 WebSocket 服务器地址
    const getWebSocketUrl = () => {
        return 'http://localhost:8083/ws-chat'; // 替换为你的 WebSocket 服务器地址
    }

  const connect = () => {
    // 创建 STOMP 客户端
    client.value = new Client({
      // 使用 SockJS 作为传输层
      webSocketFactory: () => new SockJS(getWebSocketUrl()),
      
      // 连接回调
      onConnect: (frame) => {
        console.log('STOMP 连接成功');
        isConnected.value = true;
        
        // 订阅用户专属队列
        subscribeToUserQueue();
        
        // 订阅公共主题（如果需要）
        subscribeToPublicTopics();
      },
      
      // 断开连接回调
      onDisconnect: (frame) => {
        console.log('STOMP 连接断开');
        isConnected.value = false;
      },
      
      // 错误处理
      onStompError: (frame) => {
        console.error('STOMP 协议错误:', frame);
      }
    });
    
    // 激活客户端
    client.value.activate();
  };

  // 订阅用户专属消息队列
  const subscribeToUserQueue = () => {
    if (!client.value) return;
    
    // 关键：订阅用户专属队列
    // 这个路径对应后端的 convertAndSendToUser 发送路径
    const subscription = client.value.subscribe(
      `/user/queue/messages`,  // 注意：前面有 /user 前缀
      (message:any) => {
        try {
          const parsedMessage = JSON.parse(message.body);
          messages.value.push(parsedMessage);
          console.log('收到用户专属消息:', parsedMessage);
        } catch (error) {
          console.error('消息解析错误:', error);
        }
      }
    );
    
    return subscription;
  };

  // 订阅公共主题（广播消息）
  const subscribeToPublicTopics = () => {
    if (!client.value) return;
    
    // 订阅公共通知
    client.value.subscribe('/topic/notifications', (message:any) => {
      const notification = JSON.parse(message.body);
      console.log('收到公共通知:', notification);
    });
    
    // 订阅聊天室消息
    client.value.subscribe('/topic/chat/room/*', (message:any) => {
      const chatMessage = JSON.parse(message.body);
      console.log('收到聊天室消息:', chatMessage);
    });
  };

  // 发送消息到应用目的地
  const sendMessage = (destination: string, body: any) => {
    if (client.value && isConnected.value) {
      client.value.publish({
        destination: `/app${destination}`,  // 注意：前面有 /app 前缀
        body: JSON.stringify(body)
      });
    }
  };

  // 断开连接
  const disconnect = () => {
    if (client.value) {
      client.value.deactivate();
      client.value = null;
    }
    isConnected.value = false;
  };

  return {
    client,
    isConnected,
    messages,
    connect,
    sendMessage,
    disconnect
  };
}