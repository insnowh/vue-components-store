// src/utils/worker-utils.ts

import { getWorkerPool } from './worker-pool'

// Worker 任务类型
export enum WorkerTaskType {
  CALCULATE_HASH = 'calculateHash',
  IMAGE_PROCESSING = 'imageProcessing',
  DATA_PARSING = 'dataParsing'
}

// Worker 管理器
export class WorkerManager {
  private static instance: WorkerManager
  private workerPool = getWorkerPool()

  private constructor() {}

  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager()
    }
    return WorkerManager.instance
  }

  // 执行哈希计算任务
  async calculateFileHash(file: File, onProgress?: (progress: number) => void): Promise<string> {
    return this.workerPool.execute(
      WorkerTaskType.CALCULATE_HASH,
      { file, chunkSize: 2 * 1024 * 1024 },
      onProgress
    )
  }

  // 批量计算文件哈希
  async calculateMultipleFileHashes(
    files: File[], 
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<string[]> {
    const promises = files.map((file, index) => 
      this.calculateFileHash(file, (progress) => {
        onProgress?.(index, progress)
      })
    )
    
    return Promise.all(promises)
  }

  // 获取 Worker 池状态
  getWorkerPoolStatus() {
    return this.workerPool.getStatus()
  }

  // 调整 Worker 池大小
  resizeWorkerPool(maxWorkers: number): void {
    this.workerPool.resize(maxWorkers)
  }

  // 清理
  destroy(): void {
    this.workerPool.terminate()
  }
}

// 便捷函数
export const workerManager = WorkerManager.getInstance()