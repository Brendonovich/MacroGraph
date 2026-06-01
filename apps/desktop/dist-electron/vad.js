"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VAD = void 0;
const SPEECH_RMS = 0.012;
const SILENCE_MS = 500;
const MIN_UTTERANCE_MS = 350;
var VadState;
(function (VadState) {
    VadState[VadState["Idle"] = 0] = "Idle";
    VadState[VadState["Recording"] = 1] = "Recording";
    VadState[VadState["Flush"] = 2] = "Flush";
})(VadState || (VadState = {}));
var FlushReason;
(function (FlushReason) {
    FlushReason[FlushReason["Silence"] = 0] = "Silence";
    FlushReason[FlushReason["MaxDuration"] = 1] = "MaxDuration";
})(FlushReason || (FlushReason = {}));
class VAD {
    state = VadState.Idle;
    flushReason = FlushReason.Silence;
    buffer = [];
    utteranceSamples = 0;
    silenceSamples = 0;
    overlapSamples = 0;
    maxDurationSamples = 0;
    silenceThreshold;
    minUtteranceSamples;
    sampleRate;
    constructor(sampleRate = 16000) {
        this.sampleRate = sampleRate;
        this.silenceThreshold = Math.floor((SILENCE_MS / 1000) * sampleRate);
        this.minUtteranceSamples = Math.floor((MIN_UTTERANCE_MS / 1000) * sampleRate);
        this.maxDurationSamples = Math.floor(5 * sampleRate);
    }
    setMaxDuration(seconds) {
        this.maxDurationSamples = Math.floor(seconds * this.sampleRate);
    }
    setOverlap(seconds) {
        this.overlapSamples = Math.floor(seconds * this.sampleRate);
    }
    reset() {
        this.state = VadState.Idle;
        this.flushReason = FlushReason.Silence;
        this.buffer = [];
        this.utteranceSamples = 0;
        this.silenceSamples = 0;
    }
    process(chunk) {
        const rms = Math.sqrt(chunk.reduce((sum, s) => sum + s * s, 0) / chunk.length);
        const isSpeech = rms > SPEECH_RMS;
        switch (this.state) {
            case VadState.Idle:
                if (isSpeech) {
                    this.state = VadState.Recording;
                    this.buffer.push(chunk);
                    this.utteranceSamples += chunk.length;
                    this.silenceSamples = 0;
                }
                break;
            case VadState.Recording:
                this.buffer.push(chunk);
                this.utteranceSamples += chunk.length;
                if (isSpeech) {
                    this.silenceSamples = 0;
                }
                else {
                    this.silenceSamples += chunk.length;
                }
                if (this.utteranceSamples >= this.maxDurationSamples) {
                    this.flushReason = FlushReason.MaxDuration;
                    this.state = VadState.Flush;
                }
                else if (this.silenceSamples >= this.silenceThreshold) {
                    this.flushReason = FlushReason.Silence;
                    this.state = VadState.Flush;
                }
                break;
            case VadState.Flush:
                break;
        }
        if (this.state === VadState.Flush) {
            const utterance = this.flush();
            if (utterance.length >= this.minUtteranceSamples) {
                return utterance;
            }
        }
        return null;
    }
    flush() {
        this.state = VadState.Idle;
        let overlapStart = this.buffer.length;
        // Only retain overlap on forced split (max duration),
        // not on natural silence — silence is a clean word boundary.
        if (this.flushReason === FlushReason.MaxDuration && this.overlapSamples > 0) {
            let samples = 0;
            for (let i = this.buffer.length - 1; i >= 0; i--) {
                samples += this.buffer[i].length;
                if (samples >= this.overlapSamples) {
                    overlapStart = i;
                    break;
                }
            }
        }
        const transcribeBuffer = this.buffer.slice(0, overlapStart);
        const totalLength = transcribeBuffer.reduce((sum, c) => sum + c.length, 0);
        const merged = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of transcribeBuffer) {
            merged.set(chunk, offset);
            offset += chunk.length;
        }
        this.buffer = this.buffer.slice(overlapStart);
        this.utteranceSamples = this.buffer.reduce((sum, c) => sum + c.length, 0);
        this.silenceSamples = 0;
        this.flushReason = FlushReason.Silence;
        return merged;
    }
}
exports.VAD = VAD;
//# sourceMappingURL=vad.js.map