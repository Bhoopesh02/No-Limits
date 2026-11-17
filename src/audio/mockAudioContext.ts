/**
 * Lightweight mock of Web Audio API classes for unit testing in Node / Vitest.
 */

export class MockAudioParam {
  public value: number;

  constructor(defaultValue = 1) {
    this.value = defaultValue;
  }

  public setValueAtTime(value: number): void {
    this.value = value;
  }

  public setTargetAtTime(target: number): void {
    this.value = target;
  }

  public linearRampToValueAtTime(value: number): void {
    this.value = value;
  }

  public cancelScheduledValues(): void {
    // No-op for mock
  }
}

export class MockAudioNode {
  public connectedTo: MockAudioNode[] = [];

  public connect(dest: MockAudioNode): MockAudioNode {
    this.connectedTo.push(dest);
    return dest;
  }

  public disconnect(): void {
    this.connectedTo.length = 0;
  }
}

export class MockGainNode extends MockAudioNode {
  public readonly gain = new MockAudioParam(1);
}

export class MockOscillatorNode extends MockAudioNode {
  public type: OscillatorType = 'sine';
  public readonly frequency = new MockAudioParam(440);
  public isStarted = false;
  public isStopped = false;

  public start(): void {
    this.isStarted = true;
  }

  public stop(): void {
    this.isStopped = true;
  }
}

export class MockBiquadFilterNode extends MockAudioNode {
  public type: BiquadFilterType = 'lowpass';
  public readonly frequency = new MockAudioParam(350);
  public readonly Q = new MockAudioParam(1);
  public readonly gain = new MockAudioParam(0);
}

export class MockWaveShaperNode extends MockAudioNode {
  public curve: Float32Array | null = null;
  public oversample: OverSampleType = 'none';
}

export class MockAudioBuffer {
  public readonly numberOfChannels: number;
  public readonly length: number;
  public readonly sampleRate: number;
  private readonly channels: Float32Array[];

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  public getChannelData(channel: number): Float32Array {
    return this.channels[channel] || new Float32Array(this.length);
  }
}

export class MockAudioBufferSourceNode extends MockAudioNode {
  public buffer: MockAudioBuffer | null = null;
  public loop = false;
  public readonly playbackRate = new MockAudioParam(1);
  public isStarted = false;
  public isStopped = false;

  public start(): void {
    this.isStarted = true;
  }

  public stop(): void {
    this.isStopped = true;
  }
}

export class MockAudioContext {
  public currentTime = 0;
  public state: AudioContextState = 'running';
  public readonly destination = new MockAudioNode();

  public createGain(): MockGainNode {
    return new MockGainNode();
  }

  public createOscillator(): MockOscillatorNode {
    return new MockOscillatorNode();
  }

  public createBiquadFilter(): MockBiquadFilterNode {
    return new MockBiquadFilterNode();
  }

  public createWaveShaper(): MockWaveShaperNode {
    return new MockWaveShaperNode();
  }

  public createBuffer(channels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer(channels, length, sampleRate);
  }

  public createBufferSource(): MockAudioBufferSourceNode {
    return new MockAudioBufferSourceNode();
  }

  public async resume(): Promise<void> {
    this.state = 'running';
  }

  public async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  public async close(): Promise<void> {
    this.state = 'closed';
  }
}
