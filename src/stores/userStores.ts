
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { UserInfoInterface } from '@/types/user';

// 使用setup风格定义store
export const useInfoStore = defineStore('userInfo', () => {
  // 状态
  const userInfo = ref<UserInfoInterface>({});

  // 动作（函数）
  function setUserInfo(userData: UserInfoInterface) {
    userInfo.value = userData;
  }

  function reset() {
    userInfo.value = {};
  }

  // 不要忘记返回状态和函数
  return {
    userInfo,
    setUserInfo,
    reset
  };
});