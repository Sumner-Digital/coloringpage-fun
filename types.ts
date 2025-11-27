
export type AspectRatio = '16:9' | '9:16';

export interface GenerateVideoParams {
  prompt: string;
  imageBase64: string;
  aspectRatio: AspectRatio;
  setLoadingMessage: (message: string) => void;
}

export interface GenerateVideoResult {
  url: string;
  blob: Blob;
}

// FIX: Define the AIStudio interface to resolve type conflicts.
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// Correct: Add type definitions for the AI Studio environment functions.
declare global {
  interface Window {
    aistudio?: AIStudio;
  }
}
