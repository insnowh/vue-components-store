<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { workerManager } from '@/utils/worker-utils'

// 响应式数据
const uploadRef = ref(null)
const fileList = ref([])
const useWebWorker = ref(true)
const uploadStats = reactive({
  totalFiles: 0,
  successFiles: 0,
  successRate: 0,
  totalSize: 0
})

// 配置常量
const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB
const CONCURRENT_UPLOADS = 3

// 文件状态枚举
const FILE_STATUS = {
  WAITING: 'waiting',
  HASHING: 'hashing',
  UPLOADING: 'uploading',
  PAUSED: 'paused',
  SUCCESS: 'success',
  ERROR: 'error',
  CANCELLED: 'cancelled'
}

// 计算属性
const uploadingCount = computed(() => {
  return fileList.value.filter(file => 
    file.status === FILE_STATUS.UPLOADING || file.status === FILE_STATUS.HASHING
  ).length
})

// 初始化
onMounted(() => {
  if (!window.Worker) {
    console.warn('浏览器不支持Web Worker，将使用主线程计算哈希')
    useWebWorker.value = false
  }
  updateStats()
})

// 清理
onUnmounted(() => {
  workerManager.destroy()
})

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 处理文件选择
const handleFileChange = (uploadFile) => {
  const file = uploadFile.raw
  
  // 检查文件是否已存在
  if (fileList.value.some(f => f.name === file.name && f.size === file.size)) {
    ElMessage.warning(`文件 "${file.name}" 已存在`)
    return
  }
  
  // 创建文件对象
  const fileObj = {
    id: generateId(),
    file: file,
    name: file.name,
    size: file.size,
    status: FILE_STATUS.WAITING,
    progress: 0,
    hashProgress: 0,
    fileHash: '',
    totalChunks: Math.ceil(file.size / CHUNK_SIZE),
    uploadedChunks: 0,
    chunks: [],
    uploadedSize: 0,
    controller: null,
    pausing: false,
    useWorker: useWebWorker.value
  }
  
  fileList.value.push(fileObj)
  updateStats()
}

// 开始上传所有文件
const startUpload = async () => {
  const waitingFiles = fileList.value.filter(file => 
    file.status === FILE_STATUS.WAITING
  )
  
  if (waitingFiles.length === 0) {
    ElMessage.info('没有等待上传的文件')
    return
  }
  
  // 串行处理文件，避免并发问题
  for (const file of waitingFiles) {
    await processFile(file)
  }
}

// 处理单个文件上传
const processFile = async (fileObj) => {
  try {
    // 1. 计算文件哈希
    fileObj.status = FILE_STATUS.HASHING
    fileObj.fileHash = await calculateFileHash(fileObj)
    
    // 2. 检查文件是否已存在 (秒传)
    const existResult = await checkFileExist(fileObj.fileHash, fileObj.name)
    
    if (existResult.exist) {
      // 秒传成功
      fileObj.status = FILE_STATUS.SUCCESS
      fileObj.progress = 100
      ElMessage.success(`文件 "${fileObj.name}" 秒传成功`)
      updateStats()
      return
    }
    
    // 3. 检查已上传的分片 (断点续传)
    const uploadedChunks = existResult.uploadedChunks || []
    fileObj.uploadedChunks = uploadedChunks.length
    
    // 4. 初始化分片数据
    await initChunks(fileObj, uploadedChunks)
    
    // 5. 开始上传分片
    fileObj.status = FILE_STATUS.UPLOADING
    await uploadChunks(fileObj)
    
    // 6. 所有分片上传完成，请求合并
    if (fileObj.status === FILE_STATUS.UPLOADING) {
      await mergeChunks(fileObj)
      fileObj.status = FILE_STATUS.SUCCESS
      ElMessage.success(`文件 "${fileObj.name}" 上传成功`)
    }
  } catch (error) {
    if (error.name !== 'AbortError' && fileObj.status !== FILE_STATUS.CANCELLED) {
      console.error('上传出错:', error)
      fileObj.status = FILE_STATUS.ERROR
      ElMessage.error(`文件 "${fileObj.name}" 上传失败: ${error.message}`)
    }
  } finally {
    updateStats()
  }
}

// 计算文件哈希
const calculateFileHash = async (fileObj) => {
  if (useWebWorker.value) {
    try {
      return await workerManager.calculateFileHash(
        fileObj.file,
        (progress) => {
          fileObj.hashProgress = progress
        }
      )
    } catch (error) {
      console.error('Worker计算哈希失败，降级到主线程:', error)
      // 降级到主线程
      return calculateHashInMainThread(fileObj)
    }
  } else {
    return calculateHashInMainThread(fileObj)
  }
}

// 在主线程计算文件哈希
const calculateHashInMainThread = (fileObj) => {
  return new Promise((resolve, reject) => {
    const file = fileObj.file
    const chunkSize = 2 * 1024 * 1024
    const chunks = Math.ceil(file.size / chunkSize)
    const spark = new SparkMD5.ArrayBuffer()
    const fileReader = new FileReader()
    
    let currentChunk = 0
    
    fileReader.onload = e => {
      spark.append(e.target.result)
      currentChunk++
      
      // 更新哈希计算进度
      fileObj.hashProgress = Math.round((currentChunk / chunks) * 100)
      
      if (currentChunk < chunks) {
        loadNext()
      } else {
        resolve(spark.end())
      }
    }
    
    fileReader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    
    function loadNext() {
      const start = currentChunk * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)
      fileReader.readAsArrayBuffer(chunk)
    }
    
    loadNext()
  })
}

// 检查文件是否存在（秒传）- 模拟实现
const checkFileExist = async (fileHash, fileName) => {
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 模拟10%的概率文件已存在 (秒传)
    if (Math.random() < 0.1) {
      return { exist: true }
    }
    
    // 模拟返回已上传的分片 (用于断点续传)
    const uploadedChunks = Math.random() < 0.3 ? 
      Array.from({length: Math.floor(Math.random() * 5)}, (_, i) => i) : []
      
    return { 
      exist: false, 
      uploadedChunks 
    }
  } catch (error) {
    console.error('检查文件存在失败:', error)
    return { exist: false, uploadedChunks: [] }
  }
}

// 更新文件进度
const updateFileProgress = (fileObj) => {
  // 计算已上传的数据量
  const uploadedSize = fileObj.chunks.reduce((total, chunk) => {
    if (chunk.uploaded) {
      return total + (chunk.end - chunk.start)
    }
    return total
  }, 0)
  
  // 计算整体进度，确保不超过100%
  const progress = Math.min(Math.round((uploadedSize / fileObj.size) * 100), 100)
  
  fileObj.uploadedSize = uploadedSize
  fileObj.progress = progress
  fileObj.uploadedChunks = fileObj.chunks.filter(c => c.uploaded).length
  
  // 更新统计信息
  updateStats()
}

// 初始化分片数据
const initChunks = async (fileObj, uploadedChunks = []) => {
  const file = fileObj.file
  const totalChunks = fileObj.totalChunks
  
  fileObj.chunks = []
  
  // 为每个分片创建初始数据
  for (let index = 0; index < totalChunks; index++) {
    const start = index * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const chunk = file.slice(start, end)
    
    fileObj.chunks.push({
      index,
      start,
      end,
      chunk,
      uploaded: uploadedChunks.includes(index),
      progress: uploadedChunks.includes(index) ? 100 : 0,
      controller: null,
      retryCount: 0,
      error: null
    })
  }
  
  // 更新初始进度
  updateFileProgress(fileObj)
}

// 上传分片
const uploadChunks = async (fileObj) => {
  // 获取未上传完成的分片
  const chunksToUpload = fileObj.chunks.filter(chunk => !chunk.uploaded)
  const totalChunksToUpload = chunksToUpload.length
  
  if (totalChunksToUpload === 0) {
    return // 所有分片已上传
  }
  
  // 创建文件级别的AbortController
  fileObj.controller = new AbortController()
  
  // 使用队列管理分片上传
  const pendingChunks = [...chunksToUpload]
  const activeUploads = new Map() // 存储活跃的上传任务
  let completedUploads = 0
  
  // 处理队列中的分片
  const processQueue = () => {
    // 如果已暂停或取消，停止添加新任务
    if (fileObj.status === FILE_STATUS.PAUSED || 
        fileObj.status === FILE_STATUS.CANCELLED) {
      return
    }
    
    // 填充活跃队列，不超过并发限制
    while (activeUploads.size < CONCURRENT_UPLOADS && pendingChunks.length > 0) {
      const chunk = pendingChunks.shift()
      const uploadTask = uploadChunk(fileObj, chunk)
      
      activeUploads.set(chunk.index, {
        task: uploadTask,
        chunk: chunk,
        startTime: Date.now()
      })
      
      uploadTask
        .then((result) => {
          activeUploads.delete(chunk.index)
          
          // 检查是否是暂停导致的中断
          if (result && result.paused) {
            // 如果是暂停，重新放回队列最前面
            pendingChunks.unshift(chunk)
            return
          }
          
          // 正常完成
          completedUploads++
          
          // 更新文件上传进度
          updateFileProgress(fileObj)
          
          // 继续处理队列
          processQueue()
        })
        .catch((error) => {
          activeUploads.delete(chunk.index)
          
          // 如果是取消错误，不再重试
          if (error.message.includes('cancelled') || 
              fileObj.status === FILE_STATUS.CANCELLED) {
            return
          }
          
          // 其他错误，重新加入队列末尾重试
          if (!chunk.retryCount) {
            chunk.retryCount = 1
          } else if (chunk.retryCount < 3) {
            chunk.retryCount++
          } else {
            // 超过重试次数，标记为永久失败
            fileObj.status = FILE_STATUS.ERROR
            fileObj.error = `分片 ${chunk.index} 上传失败`
            return
          }
          
          pendingChunks.push(chunk)
          processQueue()
        })
    }
  }
  
  // 开始处理队列
  processQueue()
  
  // 等待所有分片上传完成或遇到暂停/取消
  await new Promise((resolve, reject) => {
    const checkCompletion = () => {
      // 检查是否所有分片都已完成
      const allChunksUploaded = fileObj.chunks.every(chunk => chunk.uploaded)
      if (allChunksUploaded) {
        resolve()
        return
      }
      
      // 检查是否被取消
      if (fileObj.status === FILE_STATUS.CANCELLED) {
        // 中止所有活跃的上传
        activeUploads.forEach(({ chunk }) => {
          if (chunk.controller) {
            chunk.controller.abort()
          }
        })
        activeUploads.clear()
        reject(new Error('Upload cancelled'))
        return
      }
      
      // 检查是否被暂停
      if (fileObj.status === FILE_STATUS.PAUSED) {
        // 中止所有活跃的上传
        activeUploads.forEach(({ chunk }) => {
          if (chunk.controller) {
            chunk.controller.abort()
          }
        })
        activeUploads.clear()
        
        // 等待恢复上传
        const waitForResume = () => {
          if (fileObj.status === FILE_STATUS.UPLOADING) {
            // 恢复上传，重新开始处理队列
            processQueue()
            checkCompletion()
          } else if (fileObj.status === FILE_STATUS.CANCELLED) {
            reject(new Error('Upload cancelled'))
          } else if (fileObj.status === FILE_STATUS.PAUSED) {
            setTimeout(waitForResume, 100)
          }
        }
        waitForResume()
        return
      }
      
      // 检查是否有错误
      if (fileObj.status === FILE_STATUS.ERROR) {
        reject(new Error(fileObj.error || 'Upload failed'))
        return
      }
      
      // 继续等待
      setTimeout(checkCompletion, 100)
    }
    
    checkCompletion()
  })
}

// 上传单个分片
const uploadChunk = async (fileObj, chunk) => {
  // 如果分片已经上传完成，直接返回
  if (chunk.uploaded) {
    return Promise.resolve()
  }
  
  // 创建分片独立的AbortController
  const chunkController = new AbortController()
  chunk.controller = chunkController
  
  return new Promise((resolve, reject) => {
    // 检查是否已经被取消
    if (fileObj.status === FILE_STATUS.CANCELLED) {
      reject(new Error('Upload cancelled'))
      return
    }
    
    // 检查是否已经暂停
    if (fileObj.status === FILE_STATUS.PAUSED) {
      // 暂停状态，等待恢复
      const waitForResume = () => {
        if (fileObj.status === FILE_STATUS.CANCELLED) {
          reject(new Error('Upload cancelled'))
        } else if (fileObj.status === FILE_STATUS.UPLOADING) {
          // 重新执行上传
          uploadChunk(fileObj, chunk).then(resolve).catch(reject)
        } else if (fileObj.status === FILE_STATUS.PAUSED) {
          setTimeout(waitForResume, 100)
        }
      }
      waitForResume()
      return
    }
    
    // 记录分片开始上传时间
    const startTime = Date.now()
    let lastProgress = chunk.progress || 0
    
    // 模拟上传过程
    const delay = 500 + Math.random() * 1500 // 0.5-2秒延迟
    const step = 100 / (delay / 100) // 每100ms的进度步长
    
    let progress = lastProgress
    const timer = setInterval(() => {
      // 检查是否被暂停或取消
      if (fileObj.status === FILE_STATUS.PAUSED) {
        clearInterval(timer)
        chunk.progress = progress // 保存当前进度
        
        // 等待恢复
        const waitForResume = () => {
          if (fileObj.status === FILE_STATUS.CANCELLED) {
            reject(new Error('Upload cancelled'))
          } else if (fileObj.status === FILE_STATUS.UPLOADING) {
            // 继续上传
            uploadChunk(fileObj, chunk).then(resolve).catch(reject)
          } else if (fileObj.status === FILE_STATUS.PAUSED) {
            setTimeout(waitForResume, 100)
          }
        }
        waitForResume()
        return
      }
      
      if (fileObj.status === FILE_STATUS.CANCELLED || 
          chunkController.signal.aborted) {
        clearInterval(timer)
        if (chunkController.signal.aborted && fileObj.status !== FILE_STATUS.CANCELLED) {
          // 只是分片被中止，可能是暂停导致的
          resolve({ paused: true })
        } else {
          reject(new Error('Upload cancelled'))
        }
        return
      }
      
      // 正常更新进度
      progress += step
      progress = Math.min(progress, 100)
      chunk.progress = progress
      
      // 上传完成
      if (progress >= 100) {
        clearInterval(timer)
        const endTime = Date.now()
        chunk.uploaded = true
        chunk.progress = 100
        chunk.uploadTime = endTime - startTime
        
        // 实际API调用示例（取消注释使用）
        /*
        const formData = new FormData();
        formData.append('file', chunk.chunk);
        formData.append('fileHash', fileObj.fileHash);
        formData.append('chunkIndex', chunk.index);
        formData.append('totalChunks', fileObj.totalChunks);
        formData.append('fileName', fileObj.name);
        
        try {
          await axios.post(`${apiBaseUrl}/upload/chunk`, formData, {
            signal: chunkController.signal,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const progress = Math.round(
                  (progressEvent.loaded / progressEvent.total) * 100
                );
                chunk.progress = progress;
              }
            },
            timeout: 30000
          });
          chunk.uploaded = true;
          resolve();
        } catch (error) {
          chunk.uploaded = false;
          if (error.code === 'ERR_CANCELED') {
            resolve({ paused: true });
          } else {
            reject(error);
          }
        }
        */
        
        resolve()
      }
    }, 100)
  })
}

// 合并分片 - 模拟实现
const mergeChunks = async (fileObj) => {
  // 模拟API调用
  try {
    // 模拟合并过程
    await new Promise(resolve => setTimeout(resolve, 1000))
  } catch (error) {
    throw new Error(`分片合并失败: ${error.message}`)
  }
}

// 暂停上传
const pauseUpload = async (fileObj) => {
  if (fileObj.pausing || fileObj.status !== FILE_STATUS.UPLOADING) {
    return
  }
  
  fileObj.pausing = true
  
  try {
    // 保存当前上传状态
    fileObj.pauseState = {
      timestamp: Date.now(),
      uploadedChunks: fileObj.uploadedChunks,
      uploadedSize: fileObj.uploadedSize,
      progress: fileObj.progress
    }
    
    // 设置状态为暂停
    fileObj.status = FILE_STATUS.PAUSED
    
    // 中止文件级别的控制器
    if (fileObj.controller) {
      fileObj.controller.abort('pause')
    }
    
    // 中止所有分片的上传
    fileObj.chunks.forEach(chunk => {
      if (chunk.controller && !chunk.uploaded) {
        chunk.controller.abort('pause')
        chunk.controller = null
      }
    })
    
    ElMessage.info(`文件 "${fileObj.name}" 已暂停 (进度: ${fileObj.progress}%)`)
  } catch (error) {
    console.error('暂停上传时出错:', error)
    fileObj.status = FILE_STATUS.ERROR
    ElMessage.error(`暂停文件 "${fileObj.name}" 时出错`)
  } finally {
    fileObj.pausing = false
    updateStats()
  }
}

// 继续上传
const resumeUpload = async (fileObj) => {
  if (fileObj.status !== FILE_STATUS.PAUSED) {
    return
  }
  
  try {
    // 设置状态为上传中
    fileObj.status = FILE_STATUS.UPLOADING
    
    // 创建新的文件控制器
    fileObj.controller = new AbortController()
    
    // 继续上传分片
    await uploadChunks(fileObj)
    
    // 检查是否所有分片都已完成
    const allUploaded = fileObj.chunks.every(chunk => chunk.uploaded)
    if (allUploaded && fileObj.status === FILE_STATUS.UPLOADING) {
      // 请求合并分片
      await mergeChunks(fileObj)
      fileObj.status = FILE_STATUS.SUCCESS
    }
  } catch (error) {
    if (error.message === 'Upload cancelled') {
      fileObj.status = FILE_STATUS.CANCELLED
    } else if (error.name !== 'AbortError') {
      console.error('恢复上传失败:', error)
      fileObj.status = FILE_STATUS.ERROR
      ElMessage.error(`文件 "${fileObj.name}" 恢复上传失败: ${error.message}`)
    }
  } finally {
    // 清理暂停状态
    delete fileObj.pauseState
    updateStats()
  }
}

// 取消上传
const cancelUpload = async (fileObj) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消文件 "${fileObj.name}" 的上传吗？`,
      '取消上传',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 设置状态为取消
    fileObj.status = FILE_STATUS.CANCELLED
    
    // 中止所有控制器
    if (fileObj.controller) {
      fileObj.controller.abort()
    }
    
    fileObj.chunks.forEach(chunk => {
      if (chunk.controller) {
        chunk.controller.abort()
      }
    })
    
    // 重置进度
    fileObj.chunks.forEach(chunk => {
      if (!chunk.uploaded) {
        chunk.progress = 0
      }
    })
    
    fileObj.progress = Math.round(
      (fileObj.chunks.filter(c => c.uploaded).length / fileObj.totalChunks) * 100
    )
    
    ElMessage.info(`文件 "${fileObj.name}" 的上传已取消`)
    updateStats()
  } catch {
    // 用户点击了取消
  }
}

// 清空所有文件
const clearAll = () => {
  if (uploadingCount.value > 0) {
    ElMessage.warning('有文件正在上传，无法清空')
    return
  }
  
  fileList.value = []
  updateStats()
  ElMessage.success('已清空文件列表')
}

// 更新统计信息
const updateStats = () => {
  const files = fileList.value
  uploadStats.totalFiles = files.length
  uploadStats.successFiles = files.filter(f => f.status === FILE_STATUS.SUCCESS).length
  uploadStats.successRate = files.length > 0 ? 
    Math.round((uploadStats.successFiles / files.length) * 100) : 0
  uploadStats.totalSize = files.reduce((sum, file) => sum + file.size, 0)
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取状态图标
const getStatusIcon = (status) => {
  const icons = {
    [FILE_STATUS.WAITING]: 'el-icon-time',
    [FILE_STATUS.HASHING]: 'el-icon-loading',
    [FILE_STATUS.UPLOADING]: 'el-icon-upload',
    [FILE_STATUS.PAUSED]: 'el-icon-video-pause',
    [FILE_STATUS.SUCCESS]: 'el-icon-circle-check',
    [FILE_STATUS.ERROR]: 'el-icon-circle-close',
    [FILE_STATUS.CANCELLED]: 'el-icon-remove'
  }
  return icons[status] || 'el-icon-question'
}

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    [FILE_STATUS.WAITING]: '等待上传',
    [FILE_STATUS.HASHING]: '计算哈希',
    [FILE_STATUS.UPLOADING]: '上传中',
    [FILE_STATUS.PAUSED]: '已暂停',
    [FILE_STATUS.SUCCESS]: '上传成功',
    [FILE_STATUS.ERROR]: '上传失败',
    [FILE_STATUS.CANCELLED]: '已取消'
  }
  return texts[status] || '未知状态'
}

// 获取状态样式类
const getStatusClass = (status) => {
  const classes = {
    [FILE_STATUS.WAITING]: '',
    [FILE_STATUS.HASHING]: 'uploading-status',
    [FILE_STATUS.UPLOADING]: 'uploading-status',
    [FILE_STATUS.PAUSED]: 'paused-status',
    [FILE_STATUS.SUCCESS]: 'success-status',
    [FILE_STATUS.ERROR]: 'error-status',
    [FILE_STATUS.CANCELLED]: 'error-status'
  }
  return classes[status] || ''
}
</script>

<template>
  <div class="advanced-upload-container">
    <h2 class="header">高级文件上传</h2>
    
    <div class="stats-panel">
      <div class="stats-title">上传统计</div>
      <div class="stats-content">
        <div class="stat-item">
          <div class="stat-value">{{ uploadStats.totalFiles }}</div>
          <div class="stat-label">总文件数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ uploadStats.successFiles }}</div>
          <div class="stat-label">成功上传</div>
        </div>
        <div class="stat-item">
          <div class="stat-value success-rate">{{ uploadStats.successRate }}%</div>
          <div class="stat-label">成功率</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ formatFileSize(uploadStats.totalSize) }}</div>
          <div class="stat-label">总大小</div>
        </div>
      </div>
    </div>
    
    <el-upload
      class="upload-area"
      ref="uploadRef"
      :auto-upload="false"
      :multiple="true"
      :on-change="handleFileChange"
      :show-file-list="false"
      drag>
      <div class="upload-content">
        <div class="upload-icon">
          <i class="el-icon-upload"></i>
        </div>
        <div class="upload-text">将文件拖到此处，或<em>点击上传</em></div>
        <div class="upload-tip">支持任意格式文件，单文件最大支持2GB</div>
      </div>
    </el-upload>

    <div class="file-list" v-if="fileList.length > 0">
      <div v-for="file in fileList" :key="file.id" class="file-item">
        <div class="file-icon">
          <i class="el-icon-document"></i>
        </div>
        <div class="file-info">
          <div class="file-name">{{ file.name }}</div>
          <div class="file-details">
            <div class="file-size">{{ formatFileSize(file.size) }}</div>
            <div class="file-status">
              <i class="status-icon" :class="getStatusIcon(file.status)"></i>
              <span :class="getStatusClass(file.status)">{{ getStatusText(file.status) }}</span>
            </div>
            <div class="chunk-info" v-if="file.status === 'uploading' || file.status === 'paused'">
              分片: {{ file.uploadedChunks }}/{{ file.totalChunks }}
            </div>
          </div>
          
          <!-- 文件哈希计算进度 -->
          <div class="hash-progress" v-if="file.status === 'hashing'">
            <el-progress 
              :percentage="file.hashProgress" 
              :stroke-width="6"
              :show-text="false">
            </el-progress>
            <div class="chunk-info">
              <span v-if="file.useWorker">使用Web Worker计算文件哈希... {{ file.hashProgress }}%</span>
              <span v-else>计算文件哈希中... {{ file.hashProgress }}%</span>
            </div>
          </div>
          
          <!-- 文件上传进度 -->
          <div class="file-progress" v-if="file.status === 'uploading' || file.status === 'paused'">
            <el-progress 
              :percentage="file.progress" 
              :stroke-width="8"
              :status="file.status === 'paused' ? 'warning' : ''">
            </el-progress>
          </div>
        </div>
        <div class="file-actions">
          <el-button 
            v-if="file.status === 'uploading'" 
            @click="pauseUpload(file)"
            class="pause-btn"
            size="small"
            :disabled="file.pausing">
            {{ file.pausing ? '暂停中...' : '暂停' }}
          </el-button>
          <el-button 
            v-if="file.status === 'paused'" 
            @click="resumeUpload(file)"
            class="resume-btn"
            size="small">
            继续
          </el-button>
          <el-button 
            v-if="file.status === 'waiting' || file.status === 'uploading' || file.status === 'paused'" 
            @click="cancelUpload(file)"
            class="cancel-btn"
            size="small">
            取消
          </el-button>
        </div>
      </div>
    </div>

    <div class="global-controls">
      <el-checkbox v-model="useWebWorker" :disabled="uploadingCount > 0">
        使用Web Worker计算哈希（不阻塞界面）
      </el-checkbox>
      <el-button @click="clearAll" :disabled="uploadingCount > 0">清空列表</el-button>
      <el-button 
        type="primary" 
        @click="startUpload" 
        :loading="uploadingCount > 0"
        :disabled="fileList.length === 0 || uploadingCount > 0">
        {{ uploadingCount > 0 ? `上传中 (${uploadingCount})` : '开始上传' }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.advanced-upload-container {
  max-width: 900px;
  margin: 30px auto;
  padding: 25px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 30px;
  color: #409EFF;
  font-size: 24px;
  font-weight: 600;
}

.upload-area {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 25px;
  background-color: #fafafa;
}

.upload-area:hover, .upload-area.dragover {
  border-color: #409EFF;
  background-color: #f0f9ff;
}

.upload-icon {
  font-size: 60px;
  color: #c0c4cc;
  margin-bottom: 20px;
}

.upload-text {
  font-size: 18px;
  margin-bottom: 10px;
  color: #606266;
}

.upload-tip {
  color: #909399;
  font-size: 14px;
}

.file-list {
  margin-top: 25px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #ebeef5;
  transition: background-color 0.3s;
}

.file-item:hover {
  background-color: #f5f7fa;
}

.file-icon {
  margin-right: 12px;
  font-size: 24px;
  color: #409EFF;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 5px;
}

.file-details {
  display: flex;
  align-items: center;
  color: #909399;
  font-size: 13px;
}

.file-size {
  margin-right: 15px;
}

.file-status {
  display: flex;
  align-items: center;
  margin-right: 15px;
}

.status-icon {
  margin-right: 5px;
}

.file-progress {
  width: 100%;
  margin-top: 8px;
}

.hash-progress {
  margin-top: 8px;
}

.chunk-info {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.file-actions {
  display: flex;
  gap: 8px;
}

.global-controls {
  margin-top: 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.stats-panel {
  background-color: #f5f7fa;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;
}

.stats-title {
  font-weight: 600;
  margin-bottom: 10px;
  color: #409EFF;
}

.stats-content {
  display: flex;
  justify-content: space-between;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #409EFF;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.success-rate {
  color: #67C23A;
}

.pause-btn {
  color: #E6A23C;
}

.resume-btn {
  color: #409EFF;
}

.cancel-btn {
  color: #F56C6C;
}

.success-status {
  color: #67C23A;
}

.uploading-status {
  color: #409EFF;
}

.paused-status {
  color: #E6A23C;
}

.error-status {
  color: #F56C6C;
}
</style>