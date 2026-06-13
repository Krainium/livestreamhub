export interface StreamQuality {
  id: string;
  width: number;
  height: number;
  bitrate: number;
  label: string;
}

export interface StreamEntry {
  id: number;
  event: string;
  channel: string;
  raw_url: string;
  stream_url: string;
  stream_type: "hls" | "dash" | "other";
  referer: string | null;
  drm_scheme: string | null;
  drm_kid: string | null;
  drm_key: string | null;
  source: string;
  status: string;
  note: string;
  qualities: StreamQuality[] | null;
}

export interface ManifestInfo {
  type: "hls" | "dash" | "other";
  url: string;
  streamId: number;
  clearkeys?: Record<string, string>;
  preferServerHls?: boolean;
}
