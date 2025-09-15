<script lang='ts' setup>
import { reactive, ref } from 'vue';

    interface ChatUser {
        userName: string
        newsChatMesasge: string
        newsChatTime: string
        squareUrl: string
    }

    let testUserList = ref<ChatUser[]>([
        {
            userName: '张三',
            newsChatMesasge: '你好啊，今天过得怎么样？',
            newsChatTime: '10:30',
            squareUrl:'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png'
        },
        {
            userName: '李四',
            newsChatMesasge: '今天心情不错，出去玩了',
            newsChatTime: '09:20',
            squareUrl:'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png'
        },
        {
            userName: '王五',
            newsChatMesasge: '工作有点忙，没时间聊天',
            newsChatTime: '昨天',
            squareUrl:'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png'
        },
        {
            userName: '赵六',
            newsChatMesasge: '最近在学习Vue3，很有趣',
            newsChatTime: '前天',
            squareUrl:'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png'
        },
        {
            userName: '钱七',
            newsChatMesasge: '周末一起去爬山吧！',
            newsChatTime: '周五',
            squareUrl:'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png'
        },
    ])

    let selectChatUser = (item:ChatUser) => {
        console.log('点击了用户',item)
    }
</script>

<template>
  <el-row>
    <el-col :span="6" style="background-color: #F7F7F7;box-sizing: border-box;padding-right: 10px;">
      <div v-for="(item,index) in testUserList" :key="index" class="item-wrapper" @click="selectChatUser(item)">
        <!-- 透明遮罩层：移除 touchstart.prevent 避免非被动监听警告 -->
        <div class="overlay" tabindex="-1" aria-hidden="true" @mousedown.prevent></div>
        <div class="block">
          <el-row style="width: 100%;">
            <el-col class="avatar" :span="6">
              <el-avatar shape="square" :size="50" :src="item.squareUrl" />
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
</style>
