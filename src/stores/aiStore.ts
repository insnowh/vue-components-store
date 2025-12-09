import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ChatMessage } from '@/types/ai';
import { aiService } from '@/api/AIService';

export const useAIStore = defineStore('ai', () => {
  // 状态
  const messages = ref<ChatMessage[]>([]);
  const isLoading = ref(false);
  const isStreaming = ref(false);
  const isServiceAvailable = ref(false); 
  const currentModel = ref('qwen2.5:3b');

  // 计算属性
  const lastMessage = computed(() => {
    return messages.value[messages.value.length - 1];
  });

  const conversationCount = computed(() => {
    return messages.value.filter(m => m.role === 'user').length;
  });

  // 操作方法
  const addMessage = (role: ChatMessage['role'], content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now(),
    };
    messages.value.push(message);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading.value) return;

    // 添加用户消息
    addMessage('user', content);
    isLoading.value = true;

    try {
      // 获取AI响应
      const response = await aiService.sendMessage(content);
      addMessage('assistant', response);
    } catch (error) {
      addMessage('assistant', '抱歉，发生了一些错误。');
    } finally {
      isLoading.value = false;
    }
  };

  const sendStreamMessage = async (content: string) => {
    if (!content.trim() || isLoading.value) return;

    // 添加用户消息
    addMessage('user', content);
    isStreaming.value = true;

    // 添加空的AI消息用于流式更新
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    messages.value.push(aiMessage);

    try {
      // 流式获取响应
      let fullResponse = '';
      for await (const chunk of aiService.streamMessage(content)) {
        fullResponse += chunk;
        
        // 更新消息内容
        const index = messages.value.findIndex(m => m.id === aiMessageId);
        if (index !== -1) {
          messages.value[index].content = fullResponse;
        }
      }
    } catch (error) {
      const index = messages.value.findIndex(m => m.id === aiMessageId);
      if (index !== -1) {
        messages.value[index].content = '抱歉，流式响应中断了。';
      }
    } finally {
      isStreaming.value = false;
    }
  };

  const clearMessages = () => {
    messages.value = [];
  };

  const checkServiceHealth = async () => {
    isServiceAvailable.value = await aiService.checkHealth();
    return isServiceAvailable.value;
  };

  const switchModel = async (modelName: string) => {
    const success = await aiService.switchModel(modelName);
    if (success) {
      currentModel.value = modelName;
    }
    return success;
  };

  return {
    // 状态
    messages,
    isLoading,
    isStreaming,
    isServiceAvailable,
    currentModel,
    
    // 计算属性
    lastMessage,
    conversationCount,
    
    // 方法
    addMessage,
    sendMessage,
    sendStreamMessage,
    clearMessages,
    checkServiceHealth,
    switchModel,
  };
});