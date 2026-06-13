import { Some } from "@macrograph/option";
import type { Ctx } from "../ctx";

const WORKLET_CODE = `
class PCMCapture extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0) {
      this.port.postMessage(input[0]);
    }
    return true;
  }
}
registerProcessor("pcm-capture", PCMCapture);
`.trim();

export class CaptureManager {
  private ctx: Ctx;
  private audioCtx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;

  constructor(ctx: Ctx) {
    this.ctx = ctx;

    if (ctx.wasCapturing().unwrapOr(false)) {
      setTimeout(async () => {
        const modelName = ctx.selectedModel().unwrapOr("base.en");
        const micId = ctx.selectedMic().unwrapOr("");
        await window.electronAPI.stt.loadModel(modelName);
        await this.start(micId);
      }, 2000);
    }
  }

  get isCapturing() {
    return this.stream !== null;
  }

  async start(micId?: string) {
    const modelName = this.ctx.selectedModel().unwrapOr("base.en");
    if (!micId) micId = this.ctx.selectedMic().unwrapOr("");
    const settings = this.ctx.captureSettings();

    const result = await window.electronAPI.stt.startCapture("", modelName, settings);
    if (result?.error) {
      this.ctx.setStatus((s) => ({ ...s, error: result.error }));
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: micId ? { deviceId: { exact: micId } } : true,
      };
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      this.audioCtx = new AudioContext({ sampleRate: 16000 });
      const source = this.audioCtx.createMediaStreamSource(this.stream);

      const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      await this.audioCtx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      this.workletNode = new AudioWorkletNode(this.audioCtx, "pcm-capture");
      this.workletNode.port.onmessage = (e) => {
        window.electronAPI.stt.sendAudioChunk(e.data.buffer);
      };

      source.connect(this.workletNode);
      this.workletNode.connect(this.audioCtx.destination);

      this.ctx.setWasCapturing(Some(true));
      this.ctx.setStatus((s) => ({ ...s, isCapturing: true }));
    } catch (err: any) {
      this.ctx.setStatus((s) => ({ ...s, error: `Mic error: ${err.message}`, isCapturing: false }));
      this.cleanup();
    }
  }

  stop() {
    this.cleanup();
    window.electronAPI.stt.stopCapture();
    this.ctx.setWasCapturing(Some(false));
    this.ctx.setStatus((s) => ({ ...s, isCapturing: false }));
  }

  private cleanup() {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
