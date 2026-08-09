/**
 * Tiny WebAudio ambience layer for the hallway.
 * Everything is synthesised — no asset files, no music playback UI.
 * Doorway "music" is a heavily low-passed motif per room, seeded from that
 * room's #1 song title, so each doorway reads as a distinct muffled texture.
 */

type DoorVoice = {
  z: number;
  x: number;
  gain: GainNode;
  target: number;
};

const STEP_INTERVAL = 0.42;
const IDLE_DELAY = 4;
const IDLE_REPEAT = 11;

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export type DoorSpec = { id: string; x: number; z: number; seed: string };

export class DormAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private doors: DoorVoice[] = [];
  private stepTimer = 0;
  private idleTimer = 0;
  private idleCue = 0;
  private specs: DoorSpec[];

  constructor(specs: DoorSpec[]) {
    this.specs = specs;
  }

  /** Must be called from a user gesture (keydown / pointerdown). */
  start() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    this.master = master;

    // shared noise buffer for footsteps
    const len = Math.floor(ctx.sampleRate * 0.3);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;

    for (const spec of this.specs) this.doors.push(this.makeDoorVoice(ctx, master, spec));
  }

  private makeDoorVoice(ctx: AudioContext, master: GainNode, spec: DoorSpec): DoorVoice {
    const gain = ctx.createGain();
    gain.gain.value = 0;

    // muffled: steep lowpass + gentle wobble, like sound through a closed door
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320;
    lp.Q.value = 0.7;
    lp.connect(gain);
    gain.connect(master);

    const seed = hash(spec.seed);
    const root = 110 * Math.pow(2, (seed % 7) / 12);
    const scale = [0, 3, 5, 7, 10];

    // slow bass pulse
    const bass = ctx.createOscillator();
    bass.type = "triangle";
    bass.frequency.value = root / 2;
    const bassGain = ctx.createGain();
    bassGain.gain.value = 0.35;
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 1.6 + (seed % 5) * 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.3;
    lfo.connect(lfoGain).connect(bassGain.gain);
    bass.connect(bassGain).connect(lp);
    bass.start();
    lfo.start();

    // sparse arpeggio so each doorway has its own melodic fingerprint
    const arp = ctx.createOscillator();
    arp.type = "sawtooth";
    const arpGain = ctx.createGain();
    arpGain.gain.value = 0;
    arp.connect(arpGain).connect(lp);
    arp.start();

    let step = 0;
    const tick = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const note = scale[(seed + step) % scale.length]!;
      const oct = ((seed >> 3) + step) % 3 === 0 ? 2 : 1;
      arp.frequency.setValueAtTime(root * oct * Math.pow(2, note / 12), t);
      arpGain.gain.cancelScheduledValues(t);
      arpGain.gain.setValueAtTime(0, t);
      arpGain.gain.linearRampToValueAtTime(0.22, t + 0.05);
      arpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      step++;
    };
    const period = 380 + (seed % 5) * 55;
    tick();
    window.setInterval(tick, period);

    return { x: spec.x, z: spec.z, gain, target: 0 };
  }

  private step() {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.master) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 620 + Math.random() * 180;
    bp.Q.value = 1.1;

    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.25);
  }

  private chime() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    [523.25, 784].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.035, t + i * 0.14 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.14 + 1.1);
      o.connect(g).connect(this.master!);
      o.start(t + i * 0.14);
      o.stop(t + i * 0.14 + 1.2);
    });
  }

  /** Called every frame. Returns idle seconds so the scene can idle-animate. */
  update(moving: boolean, px: number, pz: number, delta: number) {
    if (moving) this.idleTimer = 0;
    else this.idleTimer += delta;

    const ctx = this.ctx;
    if (!ctx) return this.idleTimer;

    // footsteps
    if (moving) {
      this.stepTimer -= delta;
      if (this.stepTimer <= 0) {
        this.step();
        this.stepTimer = STEP_INTERVAL;
      }
    } else {
      this.stepTimer = 0;
    }

    // idle cue
    if (this.idleTimer > IDLE_DELAY) {
      if (this.idleCue <= 0) {
        this.chime();
        this.idleCue = IDLE_REPEAT;
      }
      this.idleCue -= delta;
    } else {
      this.idleCue = 0;
    }

    // doorway bleed
    for (const d of this.doors) {
      const dist = Math.hypot(d.x - px, d.z - pz);
      const amt = Math.max(0, 1 - dist / 4.5);
      const target = amt * amt * 0.16;
      const g = d.gain.gain;
      g.setTargetAtTime(target, ctx.currentTime, 0.35);
    }
    return this.idleTimer;
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
