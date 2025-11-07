import request from '../utils/request';

type CreateGroupRequest = {
    title: string | null,
    participantIds: Array<number> | null
}

// 获取用户会话列表
function getUserConversations() {
    return request({
        url: 'conversations',
        method: 'get'
    });
}

// 创建私聊会话
function createSingleConversation(targetUserId:number) {
    return request({
        url: 'conversations/single',
        params: targetUserId,
        method: 'post'
    });
}

// 创建组群会话
function createGroupConversation(CreateGroupRequest:CreateGroupRequest) {
    return request({
        url: 'conversations/group',
        data: CreateGroupRequest,
        method: 'post'
    });
}

// 获取会话详情
function getConversationDetail(conversationId:number) {
    return request({
        url: `conversations/${conversationId}`,
        method: 'get'
    });
}

// 获取会话消息列表
function getConversationMessages(conversationId:number) {
    return request({
        url: `conversations/${conversationId}/messages`,
        method: 'get'
    });
}

// 获取未读消息数
function getUnreadCount(conversationId:number) {
    return request({
        url: `conversations/${conversationId}/unread-count`,
        method: 'get'
    });
}

// 移除参与者
function removeParticipant(conversationId:number,userId:number) {
    return request({
        url: `conversations/${conversationId}/participants/${userId}`,
        method: 'delete'
    });
}


export { getUserConversations, createSingleConversation, createGroupConversation, getConversationDetail, getConversationMessages, getUnreadCount, removeParticipant };