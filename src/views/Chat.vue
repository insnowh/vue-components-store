<script lang='ts' setup>
import { reactive, ref } from 'vue';

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

    let selectChatUser = (item:ChatUser) => {
        console.log('点击了用户',item)
        if (chatUser.value === item) {
            chatUser.value = undefined
            return
        }
        chatUser.value = item
    }

    let chatUser = ref<ChatUser>()
</script>

<template>
  <el-row>
    <el-col :span="6" style="background-color: #F7F7F7;box-sizing: border-box;padding: 5px 10px 5px 0px;">
      <div v-for="(item,index) in testUserList" :key="index" class="item-wrapper" @click="selectChatUser(item)">
        <!-- 透明遮罩层：移除 touchstart.prevent 避免非被动监听警告 -->
        <div class="overlay" tabindex="-1" aria-hidden="true" @mousedown.prevent></div>
        <div class="block">
          <el-row style="width: 100%;">
            <el-col class="avatar" :span="6">
              <el-avatar shape="square" :size="40" :src="item.squareUrl" />
            </el-col>
            <el-col :span="18">
              <div class="chatTop">
                <div class="userName">{{ item.userName }}</div>
                <div class="newsChatTime">{{ item.newsChatTime }}</div>
              </div>

              <div class="chatBottom">
                <div class="newsChatMesasge">{{ item.newsChatMesasge }}</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-col>
    <el-col :span="18" style="background-color: #EDEDED;">
      <div v-if="chatUser" class="chatArea">
        <div class="top">
          {{ chatUser.userName }}
        </div>
        <div class="content">
          <div v-for="(item,index) in chatUser.chatMesasge" :key="index">
            <div class="sendTime">
              <!-- <div v-if="chatUser.chatMesasge[(index-1)||0].time-item.time">

              </div> -->
            </div>
            <div class="userAvatar">
              <div v-if="item.userName==chatUser.userName">
                对面发送 {{ item.content }}
              </div>
              <div v-else>
                我发送 {{ item.content }}
              </div>
            </div>
            <div class="userSendContent"></div>
          </div>
        </div>
        <div class="bottom">
          
        </div>
      </div>
      <div v-else>
        <el-empty description="请选择聊天用户"></el-empty>
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

/* 透明遮罩层，覆盖在每个项上，拦截点击事件（点击不会触发 selectChatUser） */
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
  grid-template-rows: 0.7fr 6fr 3.3fr; /* top / content / bottom */
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
  padding: 30px;
  border-top: 1px solid transparent;
  overflow: hidden;
}
</style>
135406700+insnowh@users.noreply.github.com