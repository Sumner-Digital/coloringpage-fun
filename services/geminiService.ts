
import { GoogleGenAI } from '@google/genai';
import type { GenerateVideoParams } from '../types';

// --- Best Practice: API Key Management ---

// This cache is now only for the production environment.
let apiKey: string | null = null;
let isInitialized = false;

/**
 * Detects if the app is running in the AI Studio environment.
 * @returns {boolean} True if in AI Studio, false otherwise.
 */
const isAiStudio = (): boolean => !!window.aistudio;

/**
 * Gets the API key, handling both production and development environments.
 * In production, it fetches the key from a secure server endpoint.
 * In development (AI Studio), it uses the key provided by the environment.
 * It caches the key after the first successful retrieval in production.
 * @returns {Promise<string>} The API key.
 */
async function getApiKey(): Promise<string> {
  // In AI Studio, always use process.env.API_KEY to get the latest selected key.
  if (isAiStudio()) {
    // The key is expected to be in process.env after user selection.
    if (!process.env.API_KEY) {
      throw new Error('DEV_KEY_MISSING'); // Special error for the UI to handle
    }
    return process.env.API_KEY;
  }
  
  // Production environment (e.g., Google Cloud Run)
  if (apiKey) {
    return apiKey;
  }

  console.log("Production environment detected. Fetching API key from server...");
  const response = await fetch('/api/get-key');
  if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch API key from server. Status: ${response.status}`, errorText);
      throw new Error(`Could not connect to the server to get the API key. Please check the server logs.`);
  }
  const data = await response.json();
  if (!data.apiKey) {
     throw new Error('Server responded but did not provide an API key.');
  }
  apiKey = data.apiKey;
  return apiKey;
}

/**
 * Initializes the application by trying to get the API key.
 * This determines if the app is ready to make API calls.
 * @returns {Promise<boolean>} True if the key is available, false otherwise.
 */
export async function initializeApp(): Promise<boolean> {
    // In AI Studio, first check if a key has been selected using the environment helper.
    if (isAiStudio()) {
      if (!window.aistudio) {
        // Should not happen if isAiStudio is true, but for type safety.
        isInitialized = false;
        return false;
      }
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
          console.log('API key not yet selected in AI Studio.');
          isInitialized = false;
          return false;
      }
    }
    try {
        await getApiKey();
        isInitialized = true;
        return true;
    } catch (error: any) {
        if (error.message === 'DEV_KEY_MISSING') {
            // This is an expected state in AI Studio before the user acts.
            console.log('API key not yet selected in AI Studio.');
            isInitialized = false;
            return false;
        }
        // For actual errors (like server connection failure), re-throw.
        throw error;
    }
}


// --- Video Generation Logic ---

const LOADING_MESSAGES = [
  'Summoning creative spirits...',
  'Teaching your monster to dance...',
  'Coloring in the animation cells...',
  'Adding a sprinkle of magic...',
  'Checking the monster rulebook...',
  'Reticulating splines...',
  'Polishing the final frames...',
];

export const generateVideoFromImage = async ({
  prompt,
  imageBase64,
  aspectRatio,
  setLoadingMessage,
}: GenerateVideoParams): Promise<string> => {

  if (!isInitialized) {
      throw new Error("Application is not initialized. Please select an API key if prompted.");
  }
  
  // This will get the latest key in AI Studio or the cached key in production.
  const key = await getApiKey();

  try {
    const ai = new GoogleGenAI({ apiKey: key });

    setLoadingMessage('Initializing animation sequence...');

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: imageBase64,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio,
      },
    });

    let messageIndex = 0;
    const intervalId = setInterval(() => {
      setLoadingMessage(LOADING_MESSAGES[messageIndex]);
      messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
    }, 5000);

    setLoadingMessage('The animation portal is open. Generating video...');

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      const pollingAi = new GoogleGenAI({ apiKey: key });
      operation = await pollingAi.operations.getVideosOperation({ operation: operation });
    }

    clearInterval(intervalId);
    setLoadingMessage('Finalizing your video...');

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
      throw new Error('Video generation failed to produce a download link.');
    }
    
    const response = await fetch(`${downloadLink}&key=${key}`);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to download the generated video. Status: ${response.statusText}. Details: ${errorBody}`
      );
    }

    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
  } catch (error: any) {
    console.error('Error during video generation:', error);
    // Invalidate the cached key only in production environments on permission errors.
    if (!isAiStudio() && error.message && error.message.includes('permission')) {
        apiKey = null;
        isInitialized = false;
    }
    throw error;
  }
};
