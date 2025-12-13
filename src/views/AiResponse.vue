[file name]: AiResponse.vue
[file content begin]
<template>
  <div id="app">
    <header class="app-header">
      <h1>🤖 AI智能助手</h1>
      <p>基于本地部署的AI模型，安全、快速、私密</p>
    </header>
    
    <main class="app-main">
      <div class="chat-wrapper">
        <AIChat />
      </div>
      
      <div class="info-panel">
        <h3>📊 系统信息</h3>
        <div class="info-item">
          <span>服务状态:</span>
          <span :class="aiStore.isServiceAvailable ? 'up' : 'down'">
            {{ aiStore.isServiceAvailable ? '正常' : '异常' }}
          </span>
        </div>
        <div class="info-item">
          <span>对话次数:</span>
          <span>{{ aiStore.conversationCount }}</span>
        </div>
        <div class="info-item">
          <span>当前模型:</span>
          <span>{{ aiStore.currentModel }}</span>
        </div>
        <div class="info-item">
          <span>历史消息:</span>
          <span>{{ aiStore.historyLength }} 条</span>
        </div>
        
        <div class="tips">
          <h4>💡 使用提示</h4>
          <ul>
            <li>Enter键发送消息</li>
            <li>Shift+Enter换行</li>
            <li>流式响应体验更佳</li>
            <li>可随时切换不同模型</li>
            <li>支持多轮对话历史</li>
          </ul>
        </div>
      </div>
    </main>
    
    <footer class="app-footer">
      <p>© 2024 Your AI Project | 本地AI集成方案</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import AIChat from '@/components/AIChat.vue';
import { useAIStore } from '@/stores/aiStore';

const aiStore = useAIStore();
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f6f8fa;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.app-header h1 {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.app-header p {
  font-size: 1.1rem;
  opacity: 0.9;
}

.app-main {
  flex: 1;
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 20px;
  gap: 30px;
  width: 100%;
}

.chat-wrapper {
  flex: 2;
  min-width: 0;
}

.info-panel {
  flex: 1;
  background: white;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid #e1e4e8;
  height: fit-content;
}

.info-panel h3 {
  margin-bottom: 20px;
  color: #24292e;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .up {
  color: #22863a;
  font-weight: 500;
}

.info-item .down {
  color: #cb2431;
  font-weight: 500;
}

.tips {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e1e4e8;
}

.tips h4 {
  margin-bottom: 12px;
  color: #24292e;
}

.tips ul {
  list-style: none;
  padding-left: 0;
}

.tips li {
  padding: 8px 0;
  color: #586069;
  font-size: 14px;
}

.tips li:before {
  content: '•';
  color: #0969da;
  margin-right: 8px;
}

.app-footer {
  text-align: center;
  padding: 20px;
  color: #586069;
  font-size: 14px;
  border-top: 1px solid #e1e4e8;
  background: white;
}

@media (max-width: 1024px) {
  .app-main {
    flex-direction: column;
  }
  
  .info-panel {
    order: -1;
  }
}
</style>
[file content end]