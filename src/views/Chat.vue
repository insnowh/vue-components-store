<script lang='ts' setup>

import { reactive, ref, onMounted, onUnmounted } from 'vue';
import { ElInput, ElButton } from 'element-plus'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/button/style/css'

import { useStompWebSocket } from '../utils/stompWebSocket';
import { getUserConversations, createSingleConversation, createGroupConversation, getConversationDetail, getConversationMessages, getUnreadCount, removeParticipant } from '../api/Chat';

    interface ChatUser {
        
        userName: string
        newsChatMesasge: string
        chatMesasge: chatMesasge[]
        newsChatTime: string
        squareUrl: string
    }

    interface chatMesasge {
        time: string
        userName: string
        content: string
    }



    let testUserList = ref<ChatUser[]>([
        {
            userName: '张三',
            newsChatMesasge: '你好啊，今天过得怎么样？',
            chatMesasge: [{
                time: '10:30',
                userName: '张三',
                content: '你好啊，今天过得怎么样？'
            },
            {
                time: '10:32',
                userName: '我',
                content: '还不错，你呢？'
            }],
            newsChatTime: '10:30',
            squareUrl:'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png'
        },
        {
            userName: '李四',
            newsChatMesasge: '今天心情不错，出去玩了',
            chatMesasge: [],
            newsChatTime: '09:20',
            squareUrl:'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png'
        },
        {
            userName: '王五',
            newsChatMesasge: '工作有点忙，没时间聊天',
            chatMesasge: [],
            newsChatTime: '昨天',
            squareUrl:'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png'
        },
        {
            userName: '赵六',
            newsChatMesasge: '最近在学习Vue3，很有趣',
            chatMesasge: [],
            newsChatTime: '前天',
            squareUrl:'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png'
        },
        {
            userName: '钱七',
            newsChatMesasge: '周末一起去爬山吧！',
            chatMesasge: [],
            newsChatTime: '周五',
            squareUrl:'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png'
        },
    ])

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


    let conversationMessages = ref<ConversationMessages>()

    let selectConversation = (item:Conversation) => {
        console.log('点击了用户',item)

        // 获取会话详情
        getConversationDetail(item.id).then(response => {

          console.log("获取会话详情:", response);
        }).catch(error => {
          console.error("获取会话详情失败:", error);
        });

        // 获取会话消息列表
        getConversationMessages(item.id).then(response => {
          conversationMessages.value = response;
          console.log("获取会话消息列表:", response);
        }).catch(error => {
          console.error("获取会话消息列表失败:", error);
        });


    }

    


    // 使用 STOMP WebSocket
    const { 
      isConnected, 
      messages, 
      connect, 
      sendMessage: sendStompMessage, 
      disconnect 
    } = useStompWebSocket();

    const newMessage = ref('');

    // 并没有必要，因为后端会从JWT中解析出用户ID
    const currentUserId = ref('user123'); // 实际应从登录信息获取

        
    // 连接 WebSocket
    const connectWebSocket = () => {
      connect();
    };

    // 断开 WebSocket
    const disconnectWebSocket = () => {
      disconnect();
    };

    // 发送消息
    const sendMessage = () => {
      if (newMessage.value.trim()) {
        const message = {
          content: newMessage.value,
          sender: currentUserId.value,
          timestamp: new Date().toISOString(),
          type: 'CHAT'
        };
        
        // 发送到后端 @MessageMapping 方法
        sendStompMessage('/chat.send', message);

        console.log("发送的消息:", message);
        

        newMessage.value = '';
      }
    };

    // 输入状态与发送逻辑

    //TODO: 暂时不需要
    // function sendMessage() {
    //   if (!chatUser.value) return
    //   const content = message.value.trim()
    //   if (!content) return
    //   chatUser.value.chatMesasge.push({
    //     time: new Date().toLocaleTimeString().slice(0,5),
    //     userName: '我',
    //     content
    //   })
    //   message.value = ''
    // }

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

    const UserConversationsList = ref<Conversation[]>([]);

    // 生命周期
    onMounted(() => {
      // 组件挂载时自动连接
      connectWebSocket();

      // 获取用户会话列表
      getUserConversations().then(response => {
        UserConversationsList.value = response.data;
        console.log("获取用户会话列表:", response);
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
  <el-row>
    <el-col :span="6" style="background-color: #F7F7F7;box-sizing: border-box;padding: 5px 10px 5px 0px;">
      <div v-for="(item,index) in UserConversationsList" :key="index" class="item-wrapper" @click="selectConversation(item)">
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
      <div v-if="conversationMessages" class="chatArea">
        <div class="top">
          <img src="" alt="">
          {{ chatUser.userName }}
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
              <div class="userAvatarLeft" v-if="item.userName==chatUser.userName">
                <!-- <img src="" alt="" srcset=""> -->
                {{ item.content }}
              </div>
              <div class="userAvatarRight" v-else>
                {{ item.content }}
                <!-- <img src="" alt="" srcset=""> -->
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
                @keydown.enter.prevent="sendMessage"
              />
            </div>
            <div class="btn-wrap">
              <el-button type="primary" class="send-btn" @click="sendMessage">发送</el-button>
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
/* 外层定位容器，负责遮罩定位 */
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
  overflow: auto; /* 内容可滚动 */
  padding: 30px;
  background: transparent;
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
  overflow: auto; /* 内容可滚动 */
  padding: 30px;
  background: transparent;
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