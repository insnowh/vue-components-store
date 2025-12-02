// src/utils/worker-pool.ts

import HashWorker from '@/components/workers/hash.worker?worker'

// Worker 任务接口
export interface WorkerTask {
  id: string
  type: string
  data: any
  resolve: (value: any) => void
  reject: (reason: any) => void
  onProgress?: (progress: number) => void
}

// Worker 池配置
export interface WorkerPoolConfig {
  maxWorkers?: number
  maxTasksPerWorker?: number
}

// Worker 包装器
class WorkerWrapper {
  private worker: Worker
  private tasks: Map<string, WorkerTask> = new Map()
  private currentTaskCount = 0
  private maxTasks: number

  constructor(workerScript: any, maxTasks: number = 10) {
    this.worker = new workerScript()
    this.maxTasks = maxTasks
    this.setupMessageHandler()
  }

  private setupMessageHandler(): void {
    this.worker.onmessage = (event: MessageEvent) => {
      const { taskId, type, progress, result, error } = event.data

      const task = this.tasks.get(taskId)
      if (!task) return

      if (type === 'progress' && task.onProgress) {
        task.onProgress(progress)
      } else if (type === 'complete') {
        task.resolve(result)
        this.tasks.delete(taskId)
        this.currentTaskCount--
      } else if (type === 'error') {
        task.reject(new Error(error))
        this.tasks.delete(taskId)
        this.currentTaskCount--
      }
    }

    this.worker.onerror = (error: ErrorEvent) => {
      // 发生错误时拒绝所有待处理任务
      this.tasks.forEach((task, taskId) => {
        task.reject(error)
        this.tasks.delete(taskId)
      })
      this.currentTaskCount = 0
    }
  }

  execute(task: WorkerTask): boolean {
    if (this.currentTaskCount >= this.maxTasks) {
      return false
    }

    this.tasks.set(task.id, task)
    this.currentTaskCount++

    this.worker.postMessage({
      taskId: task.id,
      type: task.type,
      ...task.data
    })

    return true
  }

  hasCapacity(): boolean {
    return this.currentTaskCount < this.maxTasks
  }

  getTaskCount(): number {
    return this.currentTaskCount
  }

  terminate(): void {
    this.worker.terminate()
    this.tasks.clear()
    this.currentTaskCount = 0
  }
}

// 主 Worker 池类
export class WorkerPool {
  private workers: WorkerWrapper[] = []
  private taskQueue: WorkerTask[] = []
  private maxWorkers: number
  private maxTasksPerWorker: number

  constructor(config: WorkerPoolConfig = {}) {
    this.maxWorkers = config.maxWorkers || navigator.hardwareConcurrency || 2
    this.maxTasksPerWorker = config.maxTasksPerWorker || 5
    
    this.initializeWorkers()
  }

  private initializeWorkers(): void {
    // 初始创建一半的 Worker，按需创建更多
    const initialWorkers = Math.min(2, this.maxWorkers)
    for (let i = 0; i < initialWorkers; i++) {
      this.createWorker()
    }
  }

  private createWorker(): WorkerWrapper {
    const worker = new WorkerWrapper(HashWorker, this.maxTasksPerWorker)
    this.workers.push(worker)
    return worker
  }

  private getAvailableWorker(): WorkerWrapper | null {
    // 查找有容量的现有 Worker
    for (const worker of this.workers) {
      if (worker.hasCapacity()) {
        return worker
      }
    }

    // 如果没有可用 Worker 且可以创建新 Worker，则创建
    if (this.workers.length < this.maxWorkers) {
      return this.createWorker()
    }

    return null
  }

  // 执行任务
  execute<T>(type: string, data: any, onProgress?: (progress: number) => void): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: this.generateTaskId(),
        type,
        data,
        resolve: resolve as (value: any) => void,
        reject,
        onProgress
      }

      const availableWorker = this.getAvailableWorker()
      if (availableWorker && availableWorker.execute(task)) {
        return
      }

      // 如果没有可用 Worker，加入队列
      this.taskQueue.push(task)
      this.processQueue()
    })
  }

  private processQueue(): void {
    while (this.taskQueue.length > 0) {
      const availableWorker = this.getAvailableWorker()
      if (!availableWorker) break

      const task = this.taskQueue.shift()
      if (task) {
        availableWorker.execute(task)
      }
    }
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 获取池状态
  getStatus() {
    const totalTasks = this.workers.reduce((sum, worker) => sum + worker.getTaskCount(), 0)
    return {
      totalWorkers: this.workers.length,
      maxWorkers: this.maxWorkers,
      queuedTasks: this.taskQueue.length,
      activeTasks: totalTasks
    }
  }

  // 清理所有 Worker
  terminate(): void {
    this.workers.forEach(worker => worker.terminate())
    this.workers = []
    this.taskQueue = []
  }
}

// 单例实例
let globalWorkerPool: WorkerPool | null = null

export const getWorkerPool = (config?: WorkerPoolConfig): WorkerPool => {
  if (!globalWorkerPool) {
    globalWorkerPool = new WorkerPool(config)
  }
  return globalWorkerPool
}

export const destroyWorkerPool = (): void => {
  if (globalWorkerPool) {
    globalWorkerPool.terminate()
    globalWorkerPool = null
  }
}