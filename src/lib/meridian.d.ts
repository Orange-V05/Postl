export interface MeridianOptions {
  root?: Element | string | null;
  themeRoot?: Element | null;
  smooth?: boolean;
  smoothness?: number;
  wheelMultiplier?: number;
  reveal?: boolean;
  threshold?: number;
  silk?: number;
  warp?: number;
  chroma?: number;
  depth?: number;
  hud?: boolean;
  reticle?: boolean;
  ruler?: boolean;
  streaks?: boolean;
  decode?: string;
  accent?: string;
  selector?: string;
  exclude?: string;
  anchorOffset?: number;
}

export interface MeridianInstance {
  readonly version: string;
  readonly options: MeridianOptions;
  readonly velocity: number;
  scrollTo(target: Element | string | number, opts?: { offset?: number; immediate?: boolean }): void;
  refresh(): void;
  destroy(): void;
}

declare const Meridian: {
  readonly version: string;
  readonly defaults: MeridianOptions;
  readonly instance: MeridianInstance | null;
  init(opts?: MeridianOptions): MeridianInstance | null;
};

export default Meridian;
