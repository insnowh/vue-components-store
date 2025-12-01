// Worker消息类型定义
export interface WorkerCalculateMessage {
  type: 'calculate'
  fileId: string
  file: File
  chunkSize?: number
}

export interface WorkerProgressMessage {
  type: 'progress'
  fileId: string
  progress: number
}

export interface WorkerCompleteMessage {
  type: 'complete'
  fileId: string
  hash: string
}

export interface WorkerErrorMessage {
  type: 'error'
  fileId: string
  error: string
}

export type WorkerMessage = 
  | WorkerCalculateMessage
  | WorkerProgressMessage
  | WorkerCompleteMessage
  | WorkerErrorMessage

// 文件对象类型
export interface UploadFile {
  id: string
  file: File
  name: string
  size: number
  status: 'waiting' | 'hashing' | 'uploading' | 'paused' | 'success' | 'error' | 'cancelled'
  progress: number
  hashProgress: number
  fileHash: string
  totalChunks: number
  uploadedChunks: number
  chunks: Chunk[]
  uploadedSize: number
  controller: AbortController | null
  pausing: boolean
  useWorker: boolean
}

export interface Chunk {
  index: number
  start: number
  end: number
  chunk: Blob
  uploaded: boolean
  progress: number
}