// src/components/workers/hash.worker.ts

// 导入SparkMD5库
// importScripts('https://cdn.jsdelivr.net/npm/spark-md5@3.0.2/spark-md5.min.js')
// import SparkMD5 from 'spark-md5/dist/spark-md5.min.js';
import SparkMD5 from "spark-md5"

// Worker 消息接口
interface WorkerRequest {
  taskId: string
  type: string
  file?: File
  chunkSize?: number
}

interface WorkerResponse {
  taskId: string
  type: 'progress' | 'complete' | 'error'
  progress?: number
  result?: string
  error?: string
}

// 处理主线程消息
self.onmessage = function(event: MessageEvent<WorkerRequest>) {
  const { taskId, type, file, chunkSize } = event.data
  
  if (type === 'calculateHash' && file) {
    calculateFileHash(taskId, file, chunkSize || 2 * 1024 * 1024)
  } else {
    self.postMessage({
      taskId,
      type: 'error',
      error: `未知的任务类型: ${type}`
    } as WorkerResponse)
  }
}

// 计算文件哈希
function calculateFileHash(taskId: string, file: File, chunkSize: number): void {
  const chunks = Math.ceil(file.size / chunkSize)
  const spark = new SparkMD5.ArrayBuffer()
  const fileReader = new FileReader()
  
  let currentChunk = 0
  
  fileReader.onload = function(e: ProgressEvent<FileReader>) {
    if (!e.target?.result) {
      self.postMessage({
        taskId,
        type: 'error',
        error: '文件读取结果为空'
      } as WorkerResponse)
      return
    }
    
    spark.append(e.target.result as ArrayBuffer)
    currentChunk++
    
    // 发送进度更新
    const progress = Math.round((currentChunk / chunks) * 100)
    self.postMessage({
      taskId,
      type: 'progress',
      progress
    } as WorkerResponse)
    
    if (currentChunk < chunks) {
      loadNext()
    } else {
      // 计算完成
      const hash = spark.end()
      self.postMessage({
        taskId,
        type: 'complete',
        result: hash
      } as WorkerResponse)
    }
  }
  
  fileReader.onerror = function() {
    self.postMessage({
      taskId,
      type: 'error',
      error: '文件读取失败'
    } as WorkerResponse)
  }
  
  function loadNext(): void {
    const start = currentChunk * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    
    try {
      const chunk = file.slice(start, end)
      fileReader.readAsArrayBuffer(chunk)
    } catch (error) {
      self.postMessage({
        taskId,
        type: 'error',
        error: `文件切片失败: ${error}`
      } as WorkerResponse)
    }
  }
  
  loadNext()
}

// 确保 TypeScript 知道这是 Worker 上下文
export default null as any

