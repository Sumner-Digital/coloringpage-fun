
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { AspectRatio } from './types';
import { initializeApp, generateVideoFromImage } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

// --- Helper Components ---

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  previewUrl: string | null;
}

const ImageUploader = ({ onImageSelect, previewUrl }: ImageUploaderProps) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageSelect(event.target.files[0]);
    }
  };

  const openCamera = async () => {
    setCameraError(null);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, // Prefer rear camera
        });
        setStream(mediaStream);
        setIsCameraOpen(true);
      } catch (err) {
        console.error("Camera access denied:", err);
        setCameraError("Could not access the camera. Please check your browser permissions.");
        setIsCameraOpen(false);
      }
    } else {
      setCameraError("Camera access is not supported by this browser.");
    }
  };

  const closeCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsCameraOpen(false);
  }, [stream]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `monster-capture-${Date.now()}.png`, { type: 'image/png' });
            onImageSelect(file);
          }
          closeCamera();
        }, 'image/png');
      } else {
        closeCamera();
      }
    }
  };
  
  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraOpen, stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="w-full">
      {isCameraOpen ? (
        <div className="w-full h-64 bg-black rounded-lg relative flex items-center justify-center overflow-hidden">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
          <canvas ref={canvasRef} className="hidden"></canvas>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-4">
             <div className="relative w-full flex justify-center items-center">
                 <button
                     onClick={takePhoto}
                     className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 ring-2 ring-white ring-offset-2 ring-offset-black/50 hover:scale-110 transition-transform focus:outline-none focus:ring-indigo-500"
                     aria-label="Take Photo"
                 ></button>
                 <button
                     onClick={closeCamera}
                     className="absolute right-0 text-white text-sm bg-black/50 px-4 py-2 rounded-full hover:bg-black/80 transition-colors"
                 >
                     Cancel
                 </button>
             </div>
          </div>
        </div>
      ) : (
        <>
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="w-full h-64 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center hover:border-indigo-500 transition-colors duration-300 bg-gray-800/50">
              {previewUrl ? (
                <img src={previewUrl} alt="Monster preview" className="max-h-full max-w-full object-contain rounded-lg" />
              ) : (
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-400">
                    <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              )}
            </div>
          </label>
          <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />

          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-sm font-semibold">OR</span>
            <div className="flex-grow border-t border-gray-600"></div>
          </div>

          <button onClick={openCamera} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Use Camera
          </button>
          {cameraError && <p className="text-red-400 text-sm mt-2 text-center">{cameraError}</p>}
        </>
      )}
    </div>
  );
};

interface AspectRatioSelectorProps {
    selected: AspectRatio;
    onChange: (value: AspectRatio) => void;
}

const AspectRatioSelector = ({ selected, onChange }: AspectRatioSelectorProps) => {
    const ratios: {value: AspectRatio, label: string, icon: React.ReactNode}[] = [
        { value: '16:9', label: 'Landscape', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18" transform="rotate(90 12 12)" /></svg> },
        { value: '9:16', label: 'Portrait', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18" /></svg> }
    ];

    return (
        <div className="flex space-x-4">
            {ratios.map(ratio => (
                 <button key={ratio.value} onClick={() => onChange(ratio.value)} className={`flex-1 p-4 rounded-lg flex flex-col items-center justify-center border-2 transition-all duration-300 ${selected === ratio.value ? 'bg-indigo-600 border-indigo-500 shadow-lg' : 'bg-gray-700 border-gray-600 hover:border-indigo-500'}`}>
                    {ratio.icon}
                    <span className="mt-2 text-sm font-medium">{ratio.label} ({ratio.value})</span>
                 </button>
            ))}
        </div>
    );
};

interface LoadingIndicatorProps {
  message: string;
}

const LoadingIndicator = ({ message }: LoadingIndicatorProps) => (
  <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
    <p className="mt-4 text-lg text-white font-semibold">{message}</p>
    <p className="mt-2 text-sm text-gray-300">Video generation can take a few minutes. Please be patient!</p>
  </div>
);

interface ShareButtonProps {
  videoUrl: string;
  videoBlob: Blob;
}

const ShareButton = ({ videoUrl, videoBlob }: ShareButtonProps) => {
  const [shareError, setShareError] = useState<string | null>(null);

  const handleShare = async () => {
    setShareError(null);
    
    // Create a File object from the blob for sharing
    const videoFile = new File([videoBlob], `monster-animation-${Date.now()}.mp4`, {
      type: 'video/mp4',
    });

    // Check if Web Share API with file sharing is supported
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [videoFile] })) {
      try {
        await navigator.share({
          files: [videoFile],
          title: 'My Animated Monster',
          text: 'Check out my animated monster!',
        });
      } catch (err: any) {
        // User cancelled sharing - not an error
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
          setShareError('Sharing failed. Try the download option below.');
        }
      }
    } else {
      // Fallback: trigger download
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `monster-animation-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="mt-4 w-full">
      <button
        onClick={handleShare}
        className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-all duration-300 flex items-center justify-center gap-2 text-lg shadow-lg transform hover:scale-105"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share Video
      </button>
      {shareError && (
        <p className="text-red-400 text-sm mt-2 text-center">{shareError}</p>
      )}
    </div>
  );
};

// --- Main App Component ---
type AppState = 'initializing' | 'key_needed' | 'ready' | 'error';

export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Animate this hand-drawn monster, making it fun and lively with playful movements.');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Waking up the monster...');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedVideoBlob, setGeneratedVideoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('initializing');

  useEffect(() => {
    const init = async () => {
      try {
        const keyIsReady = await initializeApp();
        setAppState(keyIsReady ? 'ready' : 'key_needed');
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred during initialization.');
        setAppState('error');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImageBase64(null);
      setImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);
    
    let isCancelled = false;
    fileToBase64(imageFile).then(b64 => {
        if(!isCancelled){
            setImageBase64(b64);
        }
    });

    return () => {
      isCancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  const handleSelectApiKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // FIX: Assume key selection was successful to avoid race conditions.
        // The service will pick up the new key on the next API call.
        setAppState('ready');
        setError(null);
      } catch (e) {
        console.error("Error opening API key selector:", e);
        setError("Could not open the API key selector. Please try again.");
        setAppState('error');
      }
    }
  };

  const handleGenerateVideo = useCallback(async () => {
    if (appState !== 'ready') {
      setError("The application is not ready. Please select an API key if prompted.");
      return;
    }
    if (!imageBase64) {
      setError('Please upload an image of your monster first!');
      return;
    }
    if (!prompt) {
      setError('Please provide a prompt to animate your monster!');
      return;
    }

    setError(null);
    setGeneratedVideoUrl(null);
    setGeneratedVideoBlob(null);
    setIsLoading(true);

    try {
      const result = await generateVideoFromImage({
        prompt,
        imageBase64,
        aspectRatio,
        setLoadingMessage,
      });
      setGeneratedVideoUrl(result.url);
      setGeneratedVideoBlob(result.blob);
    } catch (e: any) {
      console.error('Generation Error:', e);
      if (e.message && e.message.includes('Requested entity was not found.')) {
          setError('The selected API key appears to be invalid. Please select another key.');
          setAppState('key_needed');
      } else {
          setError(e.message || 'An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [imageBase64, prompt, aspectRatio, appState]);

  if (appState === 'initializing') {
      return (
          <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
              <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
              <p className="mt-4 text-lg">Connecting to Server...</p>
          </div>
      );
  }

  return (
    <>
      {isLoading && <LoadingIndicator message={loadingMessage} />}
      <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
              Monster Animator AI
            </h1>
            <p className="mt-2 text-lg text-gray-400">Bring your hand-drawn monsters to life!</p>
          </header>

          <main className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Input */}
              <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg space-y-6">
                 <div>
                    <h2 className="text-xl font-semibold mb-1 text-indigo-300">1. Upload Your Monster</h2>
                    <p className="text-sm text-gray-400 mb-4">Choose a clear picture of your drawing.</p>
                    <ImageUploader onImageSelect={setImageFile} previewUrl={imagePreviewUrl} />
                 </div>
                 <div>
                    <h2 className="text-xl font-semibold mb-1 text-indigo-300">2. Describe the Animation</h2>
                    <p className="text-sm text-gray-400 mb-4">Tell the AI how you want your monster to move.</p>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full h-24 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="e.g., Make the monster dance happily..."
                    />
                 </div>
                 <div>
                    <h2 className="text-xl font-semibold mb-1 text-indigo-300">3. Choose Video Shape</h2>
                    <p className="text-sm text-gray-400 mb-4">Select the video's aspect ratio.</p>
                    <AspectRatioSelector selected={aspectRatio} onChange={setAspectRatio} />
                 </div>
                 
                 {appState === 'ready' ? (
                    <button
                        onClick={handleGenerateVideo}
                        disabled={!imageBase64 || isLoading}
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center text-lg shadow-lg disabled:shadow-none transform hover:scale-105 disabled:transform-none"
                        >
                        {isLoading ? 'Animating...' : 'Bring Monster to Life!'}
                    </button>
                 ) : (
                    <div>
                      <button
                        onClick={handleSelectApiKey}
                        className="w-full bg-yellow-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-yellow-600 transition-all duration-300 flex items-center justify-center text-lg shadow-lg transform hover:scale-105"
                      >
                        Action Required: Select API Key
                      </button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Veo video generation requires an API key for this session.
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-400 ml-1">
                          Billing info
                        </a>
                      </p>
                    </div>
                 )}
              </div>
              {/* Right Column: Output */}
              <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg flex flex-col items-center justify-center min-h-[30rem]">
                <h2 className="text-xl font-semibold mb-4 text-indigo-300">4. Watch Your Creation</h2>
                {error && (
                  <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-center w-full">
                    <p className="font-bold">Oh no! An error occurred.</p>
                    <p className="text-sm">{error}</p>
                  </div>
                )}
                {generatedVideoUrl && generatedVideoBlob ? (
                  <>
                    <video src={generatedVideoUrl} controls autoPlay loop className="w-full rounded-lg shadow-2xl" />
                    <ShareButton videoUrl={generatedVideoUrl} videoBlob={generatedVideoBlob} />
                  </>
                ) : (
                  <div className="text-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    <p className="mt-2">Your animated monster will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
