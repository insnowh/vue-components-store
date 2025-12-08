<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { workerManager } from '@/utils/worker-utils'
// 导入上传API
import {
  checkFileExist as apiCheckFileExist,
  uploadChunk as apiUploadChunk,
  mergeChunks as apiMergeChunks,
  cancelUpload as apiCancelUpload,
  verifyResume,
  getUploadedChunks as apiGetUploadedChunks,
  pauseUpload as apiPauseUpload,
  validateChunks as apiValidateChunks
} from '@/api/upload'

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
const CONCURRENT_UPLOADS = 1


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

// 添加全局上传管理器
const uploadManager = {
  // 存储所有上传任务的控制器
  activeUploads: new Map(),
  
  // 添加上传任务
  addUpload(taskId, controller) {
    this.activeUploads.set(taskId, controller)
  },
  
  // 暂停所有上传
  pauseAll() {
    this.activeUploads.forEach((controller, taskId) => {
      if (controller && !controller.signal.aborted) {
        controller.abort('pause')
        // console.log(`中止上传任务: ${taskId}`)
      }
    })
  },
  
  // 取消所有上传
  cancelAll() {
    this.activeUploads.forEach((controller, taskId) => {
      if (controller && !controller.signal.aborted) {
        controller.abort()
        // console.log(`取消上传任务: ${taskId}`)
      }
    })
    this.activeUploads.clear()
  },
  
  // 移除上传任务
  removeUpload(taskId) {
    if (this.activeUploads.has(taskId)) {
      const controller = this.activeUploads.get(taskId)
      if (controller && !controller.signal.aborted) {
        controller.abort()
      }
      this.activeUploads.delete(taskId)
    }
  },
  
  // 获取活跃任务数量
  getActiveCount() {
    return Array.from(this.activeUploads.values())
      .filter(controller => controller && !controller.signal.aborted)
      .length
  }
}


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
    const existResult = await checkFileExist({
      fileHash: fileObj.fileHash,
      fileName: fileObj.name,
      fileSize: fileObj.size
    })
    
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

// 检查文件是否存在（秒传）- 实际API调用
const checkFileExist = async (params) => {
  try {
    // 实际API调用
    const response = await apiCheckFileExist(params)
    
    return response
  } catch (error) {
    console.error('检查文件存在失败:', error)
    // 失败时返回空数组，不影响正常上传
    return { 
      exist: false, 
      uploadedChunks: [] 
    }
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

// 修改上传分片的主函数
const uploadChunks = async (fileObj) => {
  // 使用新的串行上传方式
  await uploadMissingChunks(fileObj)
}

// 验证分片完整性
async function validateChunks(fileObj) {
  try {
    const response = await apiValidateChunks({
      fileHash: fileObj.fileHash,
      fileName: fileObj.name,
      totalChunks: fileObj.totalChunks
    })
    
    return response.success && response.valid
  } catch (error) {
    console.error('验证分片失败:', error)
    return false
  }
}

// 合并分片（增强错误处理）
const mergeChunks = async (fileObj) => {

  // console.log(`开始合并分片: ${fileObj.name}`)
  
  // 验证分片完整性
  const isValid = await validateChunks(fileObj)
  if (!isValid) {
    throw new Error('分片不完整，无法合并')
  }
  // console.log(`开始合并分片: ${fileObj.name}, 总片数: ${fileObj.totalChunks}`)
  
  // 验证所有分片都已上传
  const missingChunks = fileObj.chunks
    .filter(chunk => !chunk.uploaded)
    .map(chunk => chunk.index)
    
  if (missingChunks.length > 0) {
    throw new Error(`分片未全部上传完成，缺失分片: ${missingChunks.join(', ')}`)
  }
  
  try {
    // 获取文件MIME类型
    const mimeType = fileObj.file.type || 'application/octet-stream'
    
    // 合并请求
    const response = await apiMergeChunks({
      fileHash: fileObj.fileHash,
      fileName: fileObj.name,
      totalChunks: fileObj.totalChunks,
      fileSize: fileObj.size,
      mimeType: mimeType
    })
    
    if (response.success) {
      // console.log('合并成功:', response.fileUrl)
      // ElMessage.success(`文件 "${fileObj.name}" 合并成功`)
    } else {
      throw new Error(response.message || '合并失败')
    }
    
  } catch (error) {
    console.error('合并失败:', error)
    
    if (error.response) {
      console.error('错误详情:', error.response.data)
      
      // 处理分片缺失错误
      if (error.response.data?.message?.includes('分片缺失')) {
        // 重新检查已上传分片
        const uploadedChunks = await getUploadedChunks(fileObj.fileHash, fileObj.name)
        // console.log('服务器端已上传分片:', uploadedChunks)
        
        // 找出实际缺失的分片
        const serverMissing = Array.from({length: fileObj.totalChunks}, (_, i) => i)
          .filter(i => !uploadedChunks.includes(i))
        
        if (serverMissing.length > 0) {
          throw new Error(`服务器报告缺失分片: ${serverMissing.join(', ')}，请重新上传这些分片`)
        } else {
          throw new Error('服务器报告分片缺失，但本地记录显示所有分片已上传，请联系管理员')
        }
      }
    }
    
    throw new Error(`分片合并失败: ${error.message}`)
  }
}
// 暂停上传（重构）
const pauseUpload = async (fileObj) => {
  if (fileObj.pausing || fileObj.status !== FILE_STATUS.UPLOADING) {
    return
  }
  
  // console.log(`暂停上传文件: ${fileObj.name}, 当前状态: ${fileObj.status}`)
  
  fileObj.pausing = true
  
  try {
    // 保存当前上传状态
    fileObj.pauseState = {
      timestamp: Date.now(),
      uploadedChunks: fileObj.uploadedChunks,
      uploadedSize: fileObj.uploadedSize,
      progress: fileObj.progress
    }
    
    // 先设置状态为暂停，阻止新的上传任务
    fileObj.status = FILE_STATUS.PAUSED
    
    // 中止文件级别的控制器
    if (fileObj.controller) {
      // console.log(`中止文件控制器: ${fileObj.name}`)
      fileObj.controller.abort('pause')
      fileObj.controller = null
    }
    
    // 中止所有分片的上传
    fileObj.chunks.forEach(chunk => {
      if (chunk.controller) {
        // console.log(`中止分片 ${chunk.index} 的控制器`)
        chunk.controller.abort('pause')
        chunk.controller = null
      }
    })
    
    // 中止上传管理器中的所有相关任务
    uploadManager.pauseAll()
    
    // 通知后端暂停上传
    try {
      await apiPauseUpload(fileObj.fileHash, fileObj.name)
      // console.log(`通知后端暂停上传成功: ${fileObj.name}`)
    } catch (error) {
      console.error('通知后端暂停上传失败:', error)
      // 不抛出错误，暂停操作应该继续
    }
    
    ElMessage.info(`文件 "${fileObj.name}" 已暂停 (进度: ${fileObj.progress}%)`)
    // console.log(`文件 "${fileObj.name}" 暂停完成`)
    
  } catch (error) {
    console.error('暂停上传时出错:', error)
    fileObj.status = FILE_STATUS.ERROR
    fileObj.error = `暂停失败: ${error.message}`
    ElMessage.error(`暂停文件 "${fileObj.name}" 时出错`)
  } finally {
    fileObj.pausing = false
    updateStats()
  }
}

// 继续上传（完全重构）
const resumeUpload = async (fileObj) => {
  if (fileObj.status !== FILE_STATUS.PAUSED) {
    return
  }
  
  // console.log(`恢复上传文件: ${fileObj.name}, 之前进度: ${fileObj.progress}%`)
  
  try {
    // 1. 检查是否可以恢复
    // console.log('检查恢复状态...')
    const response = await verifyResume(fileObj.fileHash, fileObj.name)
    // console.log('恢复检查结果:', response)
    
    if (!response?.success) {
      throw new Error('恢复检查失败: ' + (response?.message || '未知错误'))
    }
    
    const verifyResult = response.verifyResult || response
    if (!verifyResult?.canResume) {
      throw new Error('无法恢复上传: ' + (verifyResult?.message || '服务器不允许恢复'))
    }
    
    // 2. 获取已上传的分片
    const uploadedChunks = verifyResult.uploadedChunks || []
    // console.log(`已上传分片数量: ${uploadedChunks.length}`)
    
    // 3. 设置状态为上传中
    fileObj.status = FILE_STATUS.UPLOADING
    fileObj.controller = new AbortController()
    
    // 4. 重新初始化分片状态（但不重新切片）
    await resetChunksStatus(fileObj, uploadedChunks)
    
    // 5. 开始上传缺失的分片
    await uploadMissingChunks(fileObj)
    
    // 6. 检查是否需要合并
    const allChunksUploaded = fileObj.chunks.every(chunk => chunk.uploaded)
    if (allChunksUploaded && fileObj.status === FILE_STATUS.UPLOADING) {
      // console.log('所有分片上传完成，开始合并')
      await mergeChunks(fileObj)
      fileObj.status = FILE_STATUS.SUCCESS
      ElMessage.success(`文件 "${fileObj.name}" 上传成功`)
    }
    
  } catch (error) {
    console.error('恢复上传失败:', error)
    
    if (error.message === 'Upload cancelled' || error.name === 'AbortError') {
      fileObj.status = FILE_STATUS.CANCELLED
    } else if (error.message.includes('无法恢复上传')) {
      // 询问是否重新开始
      try {
        await ElMessageBox.confirm(
          `文件 "${fileObj.name}" 无法恢复，是否从头开始上传？`,
          '恢复失败',
          {
            confirmButtonText: '重新开始',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        await restartFromBeginning(fileObj)
      } catch {
        fileObj.status = FILE_STATUS.CANCELLED
      }
    } else {
      fileObj.status = FILE_STATUS.ERROR
      fileObj.error = error.message
      ElMessage.error(`文件 "${fileObj.name}" 恢复上传失败: ${error.message}`)
    }
  } finally {
    delete fileObj.pauseState
    updateStats()
  }
}

// 重置分片状态（不重新切片）
const resetChunksStatus = async (fileObj, uploadedChunks = []) => {
  // console.log(`重置分片状态，总片数: ${fileObj.totalChunks}, 已上传: ${uploadedChunks.length}`)
  
  // 如果分片已存在，只更新状态
  if (fileObj.chunks && fileObj.chunks.length > 0) {
    fileObj.chunks.forEach(chunk => {
      const isUploaded = uploadedChunks.includes(chunk.index)
      chunk.uploaded = isUploaded
      chunk.progress = isUploaded ? 100 : 0
      chunk.controller = null
      chunk.error = null
      // 注意：不要重新创建chunk.blob，使用已有的
    })
  } else {
    // 如果没有分片，重新初始化
    await initChunks(fileObj, uploadedChunks)
  }
  
  // 更新进度
  fileObj.uploadedChunks = uploadedChunks.length
  fileObj.uploadedSize = uploadedChunks.length * CHUNK_SIZE
  if (uploadedChunks.length === fileObj.totalChunks) {
    fileObj.uploadedSize = fileObj.size // 如果是最后一个分片，可能不是完整的CHUNK_SIZE
  }
  fileObj.progress = Math.min(Math.round((uploadedChunks.length / fileObj.totalChunks) * 100), 100)
  
  // console.log(`重置完成，进度: ${fileObj.progress}%`)
}

// 上传缺失的分片
const uploadMissingChunks = async (fileObj) => {
  const missingChunks = fileObj.chunks.filter(chunk => !chunk.uploaded)
  const totalMissing = missingChunks.length
  
  if (totalMissing === 0) {
    // console.log('没有缺失分片，无需上传')
    return
  }
  
  // console.log(`开始上传 ${totalMissing} 个缺失分片`)
  
  // 使用简单的串行上传，避免并发问题
  for (let i = 0; i < missingChunks.length; i++) {
    const chunk = missingChunks[i]
    
    // 检查状态
    if (fileObj.status !== FILE_STATUS.UPLOADING) {
      // console.log(`上传中断，状态变为: ${fileObj.status}`)
      break
    }
    
    // console.log(`上传分片 ${chunk.index + 1}/${fileObj.totalChunks}`)
    
    try {
      await uploadSingleChunkSafely(fileObj, chunk)
      
      // 更新进度
      fileObj.uploadedChunks++
      fileObj.progress = Math.min(Math.round((fileObj.uploadedChunks / fileObj.totalChunks) * 100), 100)
      updateStats()
      
    } catch (error) {
      console.error(`分片 ${chunk.index} 上传失败:`, error)
      
      if (error.message.includes('pause') || error.message.includes('AbortError')) {
        // 用户暂停或取消
        break
      } else if (error.message.includes('400')) {
        // HTTP 400错误，可能是分片已存在或格式错误
        console.warn(`分片 ${chunk.index} 可能已存在，标记为已上传`)
        chunk.uploaded = true
        chunk.progress = 100
      } else {
        // 其他错误，重试一次
        // console.log(`重试分片 ${chunk.index}`)
        try {
          await uploadSingleChunkSafely(fileObj, chunk)
        } catch (retryError) {
          throw new Error(`分片 ${chunk.index} 上传失败: ${retryError.message}`)
        }
      }
    }
  }
}

// 安全上传单个分片
const uploadSingleChunkSafely = async (fileObj, chunk) => {
  return new Promise((resolve, reject) => {
    // 创建分片控制器
    const chunkController = new AbortController()
    chunk.controller = chunkController
    
    // 生成唯一任务ID
    const taskId = `${fileObj.fileHash}_${chunk.index}_${Date.now()}`
    uploadManager.addUpload(taskId, chunkController)
    
    // 检查状态
    if (fileObj.status !== FILE_STATUS.UPLOADING) {
      uploadManager.removeUpload(taskId)
      reject(new Error('上传已中断'))
      return
    }
    
    // console.log(`上传分片 ${chunk.index}, 大小: ${chunk.chunk.size} 字节`)
    
    apiUploadChunk(
      {
        file: chunk.chunk,
        fileHash: fileObj.fileHash,
        chunkIndex: chunk.index,
        totalChunks: fileObj.totalChunks,
        fileName: fileObj.name,
        chunkSize: CHUNK_SIZE,
        fileSize: fileObj.size
      },
      (progress) => {
        chunk.progress = progress.progress
      }
    )
      .then((response) => {
        uploadManager.removeUpload(taskId)
        
        if (response.success) {
          chunk.uploaded = true
          chunk.progress = 100
          chunk.controller = null
          resolve()
        } else {
          reject(new Error(response.message || '上传失败'))
        }
      })
      .catch((error) => {
        uploadManager.removeUpload(taskId)
        
        if (error.code === 'ERR_CANCELED' || error.message.includes('AbortError')) {
          reject(new Error('上传被中止'))
        } else {
          reject(error)
        }
      })
  })
}

// 从头开始上传
const restartFromBeginning = async (fileObj) => {
  try {
    // console.log(`从头开始上传文件: ${fileObj.name}`)
    
    // 重置状态
    fileObj.status = FILE_STATUS.UPLOADING
    fileObj.progress = 0
    fileObj.uploadedChunks = 0
    fileObj.uploadedSize = 0
    fileObj.controller = new AbortController()
    
    // 重新初始化分片
    await initChunks(fileObj, [])
    
    // 上传所有分片
    await uploadMissingChunks(fileObj)
    
    // 合并
    if (fileObj.status === FILE_STATUS.UPLOADING) {
      const allUploaded = fileObj.chunks.every(chunk => chunk.uploaded)
      if (allUploaded) {
        await mergeChunks(fileObj)
        fileObj.status = FILE_STATUS.SUCCESS
        ElMessage.success(`文件 "${fileObj.name}" 上传成功`)
      }
    }
    
  } catch (error) {
    console.error('重新开始上传失败:', error)
    fileObj.status = FILE_STATUS.ERROR
    ElMessage.error(`重新开始上传失败: ${error.message}`)
  }
}

// 新增方法：获取已上传的分片列表
async function getUploadedChunks(fileHash, fileName) {
  try {
    const response = await apiGetUploadedChunks(fileHash, fileName)
    if (response.success) {
      return response.uploadedChunks || []
    }
    return []
  } catch (error) {
    console.error('获取已上传分片失败:', error)
    return []
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
    
    // 通知后端取消上传
    try {
      await apiCancelUpload(fileObj.fileHash, fileObj.name)
    } catch (error) {
      console.error('通知后端取消上传失败:', error)
    }
    
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