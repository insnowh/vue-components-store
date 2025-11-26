<script lang='ts' setup>

import { reactive, ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { ElInput, ElButton } from 'element-plus'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/button/style/css'

import useStompWebSocket, { type WebSocketMessage } from '../utils/stompWebSocket';
import { getUserConversations, createSingleConversation, createGroupConversation, getConversationDetail, getConversationMessages, getUnreadCount, removeParticipant } from '../api/Chat';

    type Message = {
        id: number;
        conversationId: number;
        content: string;
        createdAt: string;
        isReadByMe: boolean;
        messageType: number;
        parentId: number | null;
        parentMessage: null;
        senderAvatar: string | null;
        senderId: number;
        senderName: string;
        status: number;
    }

    type ConversationMessages = {
        data : Message[] | null;
    }

    type ChatUser = {
      id: number | null;
      avatar: string | null;
      displayName: string | null;
      isGroup: boolean | null;
      participants: string[] | string | null;
      title: string | null;
      type: number | null;
    }

    


    let conversationMessages = ref<ConversationMessages>()

    let chatUser = ref<ChatUser>({
      id: null,
      avatar: null,
      displayName: null,
      isGroup: null,
      participants: null,
      title: null,
      type: null,
    });

    // 使用 STOMP WebSocket
    const { 
      isConnected, 
      messages, 
      connect, 
      // sendMessage: sendStompMessage, 
      sendMessage, 
      disconnect,
      isConnecting, 
      error, 
      subscribe 
    } = useStompWebSocket();

    const newMessage = ref('');

    let selectConversation = (item:Conversation) => {
         console.log('点击了用户',item)

         if (item.id == chatUser.value.id) {
           chatUser = ref<ChatUser>({
             id: null,
             avatar: null,
             displayName: null,
             isGroup: null,
             participants: null,
             title: null,
             type: null,
           });
         }else{
           chatUser.value = item;
         }

         // 获取会话详情
         getConversationDetail(item.id).then(response => {
           console.log("获取会话详情:", response);
         }).catch(error => {
           console.error("获取会话详情失败:", error);
         });

         // 获取会话消息列表
        // getConversationMessages(item.id).then(response => {
        //   conversationMessages.value = response;
        //   console.log("获取会话消息列表:", response);
        // }).catch(error => {
        //   console.error("获取会话消息列表失败:", error);
        // });
        getConversationMessages(item.id).then(async response => {
          // 保持原有赋值逻辑
          conversationMessages.value = response;
          console.log("获取会话消息列表:", response);
          // 等待 DOM 更新后，将 .content 滚动到最底部（仅在点击会话时触发）
          await nextTick();
          const el = document.querySelector('.chatArea .content') as HTMLElement | null;
          if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
        }).catch(error => {
          console.error("获取会话消息列表失败:", error);
        });
     }

    

    // 并没有必要，因为后端会从JWT中解析出用户ID
    // const currentUserId = ref('user123'); // 实际应从登录信息获取

        // 确保 conversationMessages 已初始化为数组，避免未定义错误
    if (!conversationMessages.value) {
      conversationMessages.value = { data: [] }
    }

    // 监听来自 useStompWebSocket 的 messages，新增消息追加到 conversationMessages.data 末尾
    watch(
      messages,
      (nv: WebSocketMessage[] | undefined, ov: WebSocketMessage[] | undefined) => {
        console.log("收到新消息:", nv);
        console.log("旧消息列表:", ov);
        
        if (nv === undefined || nv.length === 0) {
          return;
        }
        if (nv[0].content == "") {
          return;
          
        }
        conversationMessages?.value?.data?.push(nv[0] as any)
        console.log(conversationMessages?.value?.data);
        nv.splice(0, nv.length); // 清空 messages，避免重复处理
        
        // const newArr = Array.isArray(nv) ? nv : []
        // const oldArr = Array.isArray(ov) ? ov : []
        // if (newArr.length > oldArr.length) {
        //   const toAppend = newArr.slice(oldArr.length)
        //   if (!conversationMessages.value) conversationMessages.value = { data: [] }
        //   if (!conversationMessages.value.data) conversationMessages.value.data = []
        //   conversationMessages.value.data.push(...toAppend as any)
        // }
        // console.log(conversationMessages?.value?.data);
        
      },
      { deep: true }
    )

        
    // 连接 WebSocket
    const connectWebSocket = () => {
      connect();
    };

    // 断开 WebSocket
    const disconnectWebSocket = () => {
      disconnect();
    };

    // 发送消息
    const sendChatMessage = () => {
      if (newMessage.value.trim()) {
        const message = {
          content: newMessage.value,
          conversationId: chatUser.value.id,
          type: 'CHAT_MESSAGE',
          // sender: currentUserId.value,
          timestamp: new Date().toISOString(),
          messageType: 1
        };
        
        // 发送到后端 @MessageMapping 方法
        // sendStompMessage('/chat.send', message);

        sendMessage('/chat/send', message, {
            'priority': 'normal',
            'persistent': 'true'
          });

          // sendMessage('/private-chat', message, {
          //   'priority': 'normal',
          //   'persistent': 'true'
          // });
        
        console.log("发送的消息:", message);
        
        console.log("当前消息列表:", messages.value);
        
        newMessage.value = "";
      }
    };

    // 自定义订阅处理
    const handleSystemMessage = (message: WebSocketMessage) => {
      console.log('系统消息:', message);
      // 处理系统消息逻辑
    };


    // 格式化时间
    const formatTime = (timestamp: string) => {
      return new Date(timestamp).toLocaleTimeString().slice(0,5);
    };

    type Conversation = {
      id: number;
      avatar: string;
      isGroup: boolean;
      participants: string[];
      title: string|null;
      type: number;
      unreadCount: number;
      updatedAt: string;
      lastMessage: lastMessage | null;
      displayName: string | null;
    };

    type lastMessage = {
      id: number;
      conversationId: number;
      content: string;
      createdAt: string;
      isReadByMe: boolean;
      messageType: number;
      parentId: number | null;
      parentMessage: null;
      senderAvatar: string | null;
      senderId: number;
      senderName: string;
      status: number;
    };

    const userConversationsList = ref<Conversation[]>([]);

    // 生命周期
    onMounted(() => {
      // 组件挂载时自动连接
      connectWebSocket();

      // 添加自定义订阅
      // setTimeout(() => {
      //   subscribe('/topic/system', handleSystemMessage, {
      //     'ack': 'client'
      //   });
      // }, 1000);

      subscribe('/user/queue/messages', handleSystemMessage, {
          'ack': 'client'
        });

      // 获取用户会话列表
      getUserConversations().then(response => {
        userConversationsList.value = response.data;
        console.log("获取用户会话列表:", response);
        console.log(userConversationsList.value);
        
      }).catch(error => {
        console.error("获取用户会话列表失败:", error);
      });

    });

    onUnmounted(() => {
      // 组件卸载时断开连接
      disconnectWebSocket();
    });
    


</script>

<template>
  <el-row class="chat-wrapper">
    <el-col :span="6" style="background-color: #F7F7F7;box-sizing: border-box;padding: 5px 10px 5px 0px;">
      <div v-for="(item,index) in userConversationsList" :key="index" class="item-wrapper" @click="selectConversation(item)">
        <!-- 透明遮罩层：移除 touchstart.prevent 避免非被动监听警告 -->
        <div class="overlay" tabindex="-1" aria-hidden="true" @mousedown.prevent></div>
        <div class="block">
          <el-row style="width: 100%;">
            <el-col class="avatar" :span="6">
              <el-avatar shape="square" :size="40"  :src="item.avatar" />
            </el-col>
            <el-col :span="18">
              <div class="chatTop">
                <div class="userName">{{ item.title ?? (item.participants && item.participants[0]) ?? item.displayName }}</div>
                <div class="newsChatTime">{{ item.lastMessage ? formatTime(item.lastMessage.createdAt) : '' }}</div>
              </div>

              <div class="chatBottom">
                <div class="newsChatMesasge">{{ item.lastMessage ? item.lastMessage.content : '' }}</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-col>
    <el-col :span="18" style="background-color: #EDEDED;">
      <div v-if="chatUser.id" class="chatArea">
        <div class="top">
          <img src="" alt="">
          {{ chatUser.title || chatUser.displayName || '聊天对象' }}
        </div>
        <div class="content">
          <div v-for="(item,index) in conversationMessages?.data" :key="index">
            <div class="sendTime">
              <!-- <div v-if="chatUser.chatMesasge[(index-1)||0].time-item.time">

              </div> -->
            </div>
            <!-- <div class="userAvatar">
              
            </div> -->
            <div class="userSendContent">
              <div class="userAvatarLeft" v-if="item.senderName==chatUser.displayName">
                <!-- <img src="" alt="" srcset=""> -->
                 <span>
                  {{ item.content }}
                 </span>
                
              </div>
              <div class="userAvatarRight" v-else>
                
                <!-- <img src="" alt="" srcset=""> -->
                 <span>
                  {{ item.content }}
                 </span>
              </div>
            </div>
          </div>
        </div>
        <div class="bottom">
          <div class="bottom-inner">
            <div class="input-wrap">
              <el-input
                v-model="newMessage"
                type="textarea"
                :rows="2"
                class="chat-input"
                placeholder="输入消息，按回车发送"
                @keydown.enter.prevent="sendChatMessage"
              />
            </div>
            <div class="btn-wrap">
              <el-button type="primary" class="send-btn" @click="sendChatMessage">发送</el-button>
            </div>
          </div>
        </div>
      </div>
      <div v-else>
        <el-empty description="请选择聊天用户">
          <el-button type="primary">开始聊天</el-button>
        </el-empty>
      </div>
    </el-col>
  </el-row>
</template>

<style scoped>
/* 页面整体固定为视口高度（剩余屏幕） */
.chat-wrapper {
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
}
/* 确保左右两列填满高度 */
.chat-wrapper > .el-col {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.item-wrapper {
    
  position: relative;
  width: 100%;
  cursor: default; /* 可根据需要改为 pointer */
  
  
}

/* 透明遮罩层，覆盖在每个项上，拦截点击事件（点击不会触发 selectConversation） */
.overlay {
  position: absolute;
  inset: 0;
  background: transparent;
  z-index: 20;
  pointer-events: auto;

  /* 防止被选中与隐藏文本输入光标 */
  user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  caret-color: transparent;
  outline: none;

  /* 避免触摸时高亮/聚焦行为，取代 touchstart.prevent */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
 
.block {
  display: flex;
  height: 8vh;
  width: 100%;
  box-sizing: content-box;
  /* padding-right: 10px; */
 
 }
 
 .avatar{
     display: flex;
     justify-content: center;
     align-items: center;
 }
 
 .chatTop{
     display: flex;
     justify-content: space-between;
     align-items: center;
     height: 4vh;
     width: 100%;
 }
 
 .chatBottom{
     display: flex;
     justify-content: flex-start;
     align-items: center;
     height: 4vh;
     width: 100%;
     font-size: 12px;
 }

.el-row{
    display: flex;
     height: 100%;
 }

 .userName{
  font-size: 15px;
 }

 .newsChatTime{
  color: #858585;
  font-size: 15px;
 }

 .newsChatMesasge{
  color: #858585;
  
 }

 
/* 新增：使用 Grid 布局使 chatArea 内部竖直分布并按比率占位 */
.chatArea {
  display: grid;
  grid-template-rows: 0.7fr 6fr 3.3fr; /* top / content / bottom (保持原窗口大小) */
   gap: 0; /* 若需间距可调整 */
   height: 100%;
   box-sizing: border-box;
   overflow: hidden;
}

/* top / content / bottom 的样式调整 */
.chatArea .top {
  padding: 30px;
  border-bottom: 1px solid transparent;
  overflow: hidden;
}

.chatArea .content {
  overflow: auto; /* 内容可滚动（保留滚轮/触摸滚动） */
  padding: 30px;
  background: transparent;
  /* 隐藏所有平台的滚动条但不影响滚动行为 */
  -ms-overflow-style: none; /* IE 10+ */
  scrollbar-width: none; /* Firefox */
}
.chatArea .content::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.chatArea .bottom {
  /* 保持外层高度不变，input 横向占满，去掉输入边框，底部保留发送按钮高度 */
  padding: 16px 30px 1vw; /* 底部保留 1vw 的内边距 */
  border-top: 0;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  background: transparent;
}

.bottom-inner{
  display:flex;
  width:100%;
  gap:1vw; /* 输入与按钮之间间距为 1vw */
  align-items:flex-end;
}

.input-wrap{
  flex:1 1 auto;
}
.chat-input ::v-deep textarea{
  resize: none;
  box-sizing: border-box;
  width:100%;
  border: 0;           /* 去掉边框 */
  outline: none;
  padding: 10px;
  background: transparent;
  max-height: 160px;
}
.btn-wrap{
  flex:0 0 auto;
  display:flex;
  align-items:flex-end;
}
.send-btn{
  min-height:36px;
  height:auto;
  align-self:flex-end;
}
 
 .userName{
  font-size: 15px;
 }

 .newsChatTime{
  color: #858585;
  font-size: 15px;
 }

 .newsChatMesasge{
  color: #858585;
  
 }

 
/* 新增：使用 Grid 布局使 chatArea 内部竖直分布并按比率占位 */
.chatArea {
  display: grid;
  grid-template-rows: 0.7fr 6fr 3.3fr; /* top / content / bottom (保持原窗口大小) */
   gap: 0; /* 若需间距可调整 */
   height: 100%;
   box-sizing: border-box;
   overflow: hidden;
}

/* top / content / bottom 的样式调整 */
.chatArea .top {
  padding: 30px;
  border-bottom: 1px solid transparent;
  overflow: hidden;
}

.chatArea .content {
  overflow: auto; /* 内容可滚动（保留滚轮/触摸滚动） */
  padding: 30px;
  background: transparent;
  /* 隐藏所有平台的滚动条但不影响滚动行为 */
  -ms-overflow-style: none; /* IE 10+ */
  scrollbar-width: none; /* Firefox */
}
.chatArea .content::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.chatArea .bottom {
  /* 保持外层高度不变，input 横向占满，去掉输入边框，底部保留发送按钮高度 */
  padding: 16px 30px 1vw; /* 底部保留 1vw 的内边距 */
  border-top: 0;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  background: transparent;
}

.bottom-inner{
  display:flex;
  width:100%;
  gap:1vw; /* 输入与按钮之间间距为 1vw */
  align-items:flex-end;
}

.input-wrap{
  flex:1 1 auto;
}
.chat-input ::v-deep textarea{
  resize: none;
  box-sizing: border-box;
  width:100%;
  border: 0;           /* 去掉边框 */
  outline: none;
  padding: 10px;
  background: transparent;
  max-height: 160px;
}
.btn-wrap{
  flex:0 0 auto;
  display:flex;
  align-items:flex-end;
}
.send-btn{
  min-height:36px;
  height:auto;
  align-self:flex-end;
}
 
 .userAvatarLeft{
   background-color: #FFFFFF;
   padding: 10px;
   border-radius: 10px;
   max-width: 60%;
   margin: 10px 0px;
 }
 
 .userAvatarRight{
   background-color: #409EFF;
   color: white;
   padding: 10px;
   border-radius: 10px;
   max-width: 60%;
   margin: 10px 0px;
   margin-left: auto;
 }
</style>