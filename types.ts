
export interface GroundingLink {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: string[];
  isVoice?: boolean;
  groundingLinks?: GroundingLink[];
}

export interface UploadedFile {
  name: string;
  url: string;
  type: string;
  content?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'INFO' | 'TOOL' | 'ERROR' | 'AUDIO' | 'SUCCESS';
  message: string;
}

export enum LiveStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}
