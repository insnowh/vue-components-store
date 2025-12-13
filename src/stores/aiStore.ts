// stores/aiStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAIStore = defineStore('ai', () => {
  // 状态
  const isServiceAvailable = ref(true);
  const conversationCount = ref(0);
  const currentModel = ref('qwen2.5:3b');
  const history = ref<any[]>([]);
  
  // 计算属性
  const historyLength = computed(() => history.value.length);
  
  // 动作
  const incrementConversation = () => {
    conversationCount.value++;
  };
  
  const setCurrentModel = (model: string) => {
    currentModel.value = model;
  };
  
  const setHistory = (newHistory: any[]) => {
    history.value = newHistory;
  };
  
  const addMessage = (message: any) => {
    history.value.push(message);
  };
  
  const clearHistory = () => {
    history.value = [];
  };
  
  return {
    isServiceAvailable,
    conversationCount,
    currentModel,
    history,
    historyLength,
    incrementConversation,
    setCurrentModel,
    setHistory,
    addMessage,
    clearHistory
  };
});