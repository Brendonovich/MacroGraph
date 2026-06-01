interface SttApi {
  sendAudioChunk(data: ArrayBuffer): void;
  enumerateDevices(): Promise<{ deviceId: string; label: string }[]>;
  loadModel(modelName: string): Promise<boolean>;
  unloadModel(): Promise<boolean>;
  isBackendAvailable(): Promise<boolean>;
  downloadModel(modelName: string): Promise<void>;
  getCachedModels(): Promise<Array<{ name: string; path: string; size: number }>>;
  deleteModel(modelName: string): Promise<boolean>;
  getStatus(): Promise<{
    modelLoaded: boolean;
    currentModel: string | null;
    isCapturing: boolean;
    isTranscribing: boolean;
    error?: string | null;
  }>;
  startCapture(micId: string, modelName?: string, settings?: { maxDurationSecs?: number; overlapSecs?: number }): Promise<{ success?: boolean; error?: string }>;
  stopCapture(): Promise<boolean>;
}

interface ElectronAPI {
  stt: SttApi;
  onEvent(channel: string, callback: (...args: any[]) => void): () => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
