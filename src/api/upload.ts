// src/api/upload.ts

import request from '../utils/request'

// 文件上传配置
interface UploadConfig {
  chunkSize?: number
  maxConcurrentUploads?: number
  timeout?: number
}

// 文件上传分片
interface UploadChunkData {
  file: Blob
  fileHash: string
  chunkIndex: number
  totalChunks: number
  fileName: string
  chunkSize: number
  fileSize: number
}

// 文件合并请求
interface MergeChunksRequest {
  fileHash: string
  fileName: string
  totalChunks: number
  fileSize: number
  mimeType?: string
}

// 文件秒传检查
interface CheckFileExistRequest {
  fileHash: string
  fileName: string
  fileSize: number
}

// 文件秒传检查响应
interface CheckFileExistResponse {
  exist: boolean
  uploadedChunks?: number[]
  fileUrl?: string
}

// 文件上传进度
interface UploadProgress {
  fileHash: string
  chunkIndex: number
  progress: number
  loaded: number
  total: number
}

// 获取文件上传配置
function getUploadConfig(): Promise<UploadConfig> {
  return request({
    url: 'upload/config',
    method: 'get'
  })
}

// 检查文件是否存在（秒传）
function checkFileExist(data: CheckFileExistRequest): Promise<CheckFileExistResponse> {
  return request({
    url: 'upload/check',
    params: data,
    method: 'get'
  })
}

// 上传文件分片 - 增加更好的错误处理
function uploadChunk(data: UploadChunkData, onProgress?: (progress: UploadProgress) => void): Promise<any> {
  const formData = new FormData()
  
  // 添加分片数据
  formData.append('file', data.file)
  formData.append('fileHash', data.fileHash)
  formData.append('chunkIndex', data.chunkIndex.toString())
  formData.append('totalChunks', data.totalChunks.toString())
  formData.append('fileName', data.fileName)
  formData.append('chunkSize', data.chunkSize.toString())
  formData.append('fileSize', data.fileSize.toString())
  
  return request({
    url: 'upload/chunk',
    data: formData,
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 60000, // 增加超时时间
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress: UploadProgress = {
          fileHash: data.fileHash,
          chunkIndex: data.chunkIndex,
          progress: Math.round((progressEvent.loaded / progressEvent.total) * 100),
          loaded: progressEvent.loaded,
          total: progressEvent.total
        }
        onProgress(progress)
      }
    }
  })
}

// 获取已上传的分片列表
function getUploadedChunks(fileHash: string, fileName: string): Promise<number[]> {
  return request({
    url: 'upload/chunks',
    params: {
      fileHash,
      fileName
    },
    method: 'get'
  })
}

// 合并文件分片
function mergeChunks(data: MergeChunksRequest): Promise<{ fileUrl: string }> {
  return request({
    url: 'upload/merge',
    data,
    method: 'post'
  })
}

// 取消文件上传
function cancelUpload(fileHash: string, fileName: string): Promise<void> {
  return request({
    url: 'upload/cancel',
    params: {
      fileHash,
      fileName
    },
    method: 'post'
  })
}

// 获取上传任务列表
interface UploadTask {
  fileHash: string
  fileName: string
  fileSize: number
  totalChunks: number
  uploadedChunks: number
  status: 'uploading' | 'paused' | 'completed' | 'failed'
  progress: number
  startTime: string
  lastUpdateTime: string
}

function getUploadTasks(): Promise<UploadTask[]> {
  return request({
    url: 'upload/tasks',
    method: 'get'
  })
}

// 删除上传任务
function deleteUploadTask(fileHash: string, fileName: string): Promise<void> {
  return request({
    url: 'upload/task',
    params: {
      fileHash,
      fileName
    },
    method: 'delete'
  })
}

// 批量删除上传任务
function deleteUploadTasks(fileHashes: string[]): Promise<void> {
  return request({
    url: 'upload/tasks',
    data: fileHashes,
    method: 'delete'
  })
}

// 获取上传统计信息
interface UploadStats {
  totalFiles: number
  successFiles: number
  failedFiles: number
  totalSize: number
  uploadedSize: number
  averageSpeed: number
  estimatedTime: number
}

// 分片验证请求接口
interface ValidateChunksRequest {
  fileHash: string
  fileName: string
  totalChunks: number
}

// 分片验证响应接口
interface ValidateChunksResponse {
  success: boolean
  valid: boolean
  message: string
}

// 验证分片完整性
function validateChunks(data: ValidateChunksRequest): Promise<ValidateChunksResponse> {
  return request({
    url: 'upload/validate',
    data,
    method: 'post'
  })
}

function getUploadStats(): Promise<UploadStats> {
  return request({
    url: 'upload/stats',
    method: 'get'
  })
}

// 批量文件上传（多个文件同时上传）
interface BatchUploadRequest {
  files: Array<{
    file: File
    fileHash: string
    fileName: string
  }>
}

function batchUpload(data: BatchUploadRequest): Promise<Array<{ fileHash: string; fileUrl: string }>> {
  return request({
    url: 'upload/batch',
    data,
    method: 'post'
  })
}

// 断点续传验证
function verifyResume(fileHash: string, fileName: string): Promise<{
  canResume: boolean
  uploadedChunks: number[]
  totalChunks: number
}> {
  return request({
    url: 'upload/verify',
    params: {
      fileHash,
      fileName
    },
    method: 'get'
  })
}

function pauseUpload(fileHash: string, fileName: string): Promise<void>  {
  return request({
    url: 'upload/pause',
    params: {
      fileHash,
      fileName
    },
    method: 'post'
  })
}

export {

    // API 函数
    getUploadConfig,
    checkFileExist,
    uploadChunk,
    getUploadedChunks,
    mergeChunks,
    cancelUpload,
    getUploadTasks,
    deleteUploadTask,
    deleteUploadTasks,
    getUploadStats,
    batchUpload,
    verifyResume,
    pauseUpload,
    validateChunks
}
export type {
    // 接口类型
    UploadConfig,
    UploadChunkData,
    MergeChunksRequest,
    CheckFileExistRequest,
    CheckFileExistResponse,
    UploadProgress,
    UploadTask,
    UploadStats,
    ValidateChunksRequest,
    ValidateChunksResponse
}
