
import { defineStore } from 'pinia';
import { ref } from 'vue';
import JWTUtils from "@/utils/jwtUtils";
import type { UserInfoInterface } from '@/types/user';
import { selectUserById } from "@/api/UserManagement";
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter();

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

  function resetUserInfo() {
    if (userInfo.value?.username == null) {
      const tokenData = JWTUtils.getStoredToken();
      
      if (tokenData && tokenData.id) {
        selectUserById(tokenData?.id).then(res => {
          setUserInfo(res.data);
        }).catch(err => {
          ElMessage.error('获取用户信息失败，请重新登录');
          router.push('/');
        });
      }else {
        ElMessage.error('未检测到有效的登录信息，请重新登录');
        router.push('/');
      }
    }
  }

  // 不要忘记返回状态和函数
  return {
    userInfo,
    setUserInfo,
    reset,
    resetUserInfo
  };
});

