/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, DragEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { geminiService } from '../../services/geminiService';
import { cn } from '../../lib/utils';
// FIX: Added ArrowLeft to the lucide-react imports
import { Loader2, Square, RectangleVertical, RectangleHorizontal, ArrowLeft } from 'lucide-react';
import { AspectRatio } from '../../types';

type View = 'config' | 'result';
interface GeneratedImageState {
    status: 'pending' | 'done' | 'error';
    url?: string;
    error?: string;
}

const ASPECT_RATIO_OPTIONS: { id: string; name: string; value: AspectRatio['value']; icon: React.ReactNode }[] = [
    { id: 'ar1', name: 'Portrait', value: '3:4', icon: <RectangleVertical size={18} /> },
    { id: 'ar2', name: 'Square', value: '1:1', icon: <Square size={16} /> },
    { id: 'ar3', name: 'Landscape', value: '4:3', icon: <RectangleHorizontal size={18} /> },
    { id: 'ar4', name: 'Stories', value: '9:16', icon: <RectangleVertical size={20} /> },
];

const ANGLE_OPTIONS = [
    { id: 'front', label: 'Front', prompt: "Shift the virtual camera to a direct front-on perspective of the product. Every other element in the scene must remain unchanged." },
    { id: 'back', label: 'Back', prompt: "Shift the virtual camera to a direct rear-on perspective of the product. Re-render the product's back side realistically while keeping the environment identical." },
    { id: 'side_left', label: 'Side Left', prompt: "Rotate the virtual camera around the product to a side-left profile view (90 degrees left). Maintain all environmental details, lighting, and reflections exactly as they appear in the original." },
    { id: 'side_right', label: 'Side Right', prompt: "Rotate the virtual camera around the product to a side-right profile view (90 degrees right). Ensure the background and props are preserved with perfect consistency." },
    { id: 'top', label: 'Top', prompt: "Move the virtual camera to a position directly above the product, looking straight down. Preserve the surface texture and background elements from this new top-down perspective." },
    { id: 'bottom', label: 'Bottom', prompt: "Move the virtual camera to a position directly below the product, looking straight up. Maintain the atmospheric lighting and background colors." },
    { id: 'three_quarter', label: '3/4 View', prompt: "Move the virtual camera to a three-quarter perspective (45 degrees off-center). This must feel like a natural rotation of the camera within the existing scene." },
    { id: 'close_up', label: 'Close-up', prompt: "Zoom the virtual camera in significantly for a tight detail shot. Keep the lighting and background bokeh consistent with a macro lens perspective of the same scene." },
    { id: 'in_context', label: 'In Context', prompt: "Widen the camera frame slightly to show more of the existing environment. Do not change the background; simply reveal more of what is already there in the reference." },
    { id: '45_left', label: '45° Left Angle', prompt: "Rotate the virtual camera 45 degrees to the left. Every prop and shadow must be re-rendered to match this new viewpoint while remaining identical in substance to the original." },
    { id: '45_right', label: '45° Right Angle', prompt: "Rotate the virtual camera 45 degrees to the right. Every prop and shadow must be re-rendered to match this new viewpoint while remaining identical in substance to the original." },
    { id: 'macro_detail', label: 'Macro Detail', prompt: "Perform an extreme macro zoom into the product's primary material. The background should become a soft, blurred version of the original scene." },
    { id: 'tilt_up', label: 'Tilted Up View', prompt: "Position the virtual camera low to the ground and tilt it upward toward the product. Preserve the original background and lighting from this new heroic angle." },
    { id: 'tilt_down', label: 'Tilted Down View', prompt: "Position the virtual camera high and tilt it downward toward the product. Preserve the original background and lighting from this new high-angle perspective." },
    { id: 'wide_frame', label: 'Wide Frame Shot', prompt: "Increase the camera's field of view to capture a wide-angle shot of the scene. The core environment must be a perfect expansion of the provided reference." },
    { id: 'product_only_isolated_view', label: 'Isolation Real Scene View', prompt: "Keep the real background and props exactly as they are. Use a shallower depth of field to make the product pop within its existing environment." }
];

const Uploader = ({ onImageUpload }: { onImageUpload: (file: File) => void }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) onImageUpload(e.target.files[0]);
    };
    const handleDrop = (e: DragEvent<HTMLElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) onImageUpload(e.dataTransfer.files[0]);
    };
    const handleDragEvents = (e: DragEvent<HTMLElement>, enter: boolean) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(enter);
    };

    return (
        <label htmlFor="product-upload" className={cn("cursor-pointer aspect-[4/5] w-full max-w-md flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors", isDragOver ? "border-violet-500 bg-violet-500/10" : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600")} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onDragEnter={(e) => handleDragEvents(e, true)} onDragLeave={(e) => handleDragEvents(e, false)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-zinc-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
            <span className="text-zinc-400 font-semibold">Drop your image here</span>
            <span className="text-zinc-500 text-sm mt-1">or click to upload</span>
            <input id="product-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
        </label>
    );
};

interface ResultCardProps {
    title: string;
    imageUrl?: string;
    status: GeneratedImageState['status'];
    error?: string;
    onRetry: () => void;
    onDownload: () => void;
    ratio: AspectRatio['value'];
}

const ResultCard: React.FC<ResultCardProps> = ({ title, imageUrl, status, error, onRetry, onDownload, ratio }) => {
    return (
        <div className="flex flex-col w-full">
            <h3 className="font-semibold text-base text-zinc-100 mb-2 text-center">{title}</h3>
            <div className={cn(
                "w-full bg-zinc-925 rounded-lg border border-white/10 flex items-center justify-center text-zinc-500 text-center relative overflow-hidden group shadow-lg",
                ratio === '1:1' ? 'aspect-square' : ratio === '3:4' ? 'aspect-[3/4]' : ratio === '4:3' ? 'aspect-[4/3]' : 'aspect-[9/16]'
            )}>
                {status === 'pending' && <Loader2 className="animate-spin h-10 w-10 text-violet-400" />}
                {status === 'error' && <div className="p-4 text-red-400"><p className="font-semibold mb-2">Generation Failed</p><p className="text-xs text-zinc-400 mb-4">{error}</p><button onClick={onRetry} className="text-sm bg-red-600/20 text-red-300 px-3 py-1 rounded-md hover:bg-red-600/40">Retry</button></div>}
                {status === 'done' && imageUrl && <img src={imageUrl} alt={title} className="w-full h-full object-cover" />}
                {status === 'done' && imageUrl && (
                    <div className="absolute top-2 right-2 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onDownload} className="p-2 bg-zinc-800/80 rounded-full text-zinc-200 hover:bg-zinc-700" aria-label="Download"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                        <button onClick={onRetry} className="p-2 bg-zinc-800/80 rounded-full text-zinc-200 hover:bg-zinc-700" aria-label="Regenerate"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.899 2.186l-1.42.71a5.002 5.002 0 00-8.479-1.554H10a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm12 14a1 1 0 01-1-1v-2.101a7.002 7.002 0 01-11.899-2.186l1.42-.71a5.002 5.002 0 008.479 1.554H10a1 1 0 110-2h6a1 1 0 011 1v6a1 1 0 01-1 1z" clipRule="evenodd" /></svg></button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function ProductSceneGenerator({ onBack }: { onBack: () => void }) {
    const [view, setView] = useState<View>('config');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [selectedAngles, setSelectedAngles] = useState<string[]>([]);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio['value']>('1:1');
    const [generatedImages, setGeneratedImages] = useState<Record<string, GeneratedImageState>>({});
    const [isGenerating, setIsGenerating] = useState(false);

    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setUploadedImage(reader.result as string);
            setGeneratedImages({});
        };
        reader.readAsDataURL(file);
    };

    const toggleAngle = (angleId: string) => {
        setSelectedAngles(prev =>
            prev.includes(angleId) ? prev.filter(id => id !== angleId) : [...prev, angleId]
        );
    };

    const handleGenerateSingle = async (angleId: string) => {
        if (!uploadedImage) return;
        const angle = ANGLE_OPTIONS.find(a => a.id === angleId);
        if (!angle) return;

        setGeneratedImages(prev => ({ ...prev, [angleId]: { status: 'pending' } }));

        try {
            const basePrompt = `**SCENE PRESERVATION DIRECTIVE (CRITICAL):** 
You are an expert digital cinematographer. I am providing you with a base image that defines a complete real-world scene. Your task is to re-render this EXACT scene—keeping every single object, prop, background element, lighting source, and stylistic nuance 100% identical—but from a different camera perspective. 

**RULES:**
1. DO NOT invent a new background.
2. DO NOT use a plain studio background unless it's already in the original.
3. DO NOT remove, add, or move any props or background items.
4. The product's materials, colors, and branding MUST be perfectly preserved.
5. Imagine the camera is moving around the physical set from the provided image.

**NEW CAMERA ACTION:** ${angle.prompt}

**ASPECT RATIO (CRITICAL):** Use the requested ${aspectRatio} format. The final result MUST be a full-bleed image with NO black borders, perfectly filling the ${aspectRatio} canvas.`;
            
            const resultUrl = await geminiService.generateStyledImage(basePrompt, [uploadedImage], aspectRatio);
            setGeneratedImages(prev => ({ ...prev, [angleId]: { status: 'done', url: resultUrl } }));
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setGeneratedImages(prev => ({ ...prev, [angleId]: { status: 'error', error: message } }));
        }
    };

    const handleGenerateAll = async () => {
        if (!uploadedImage || selectedAngles.length === 0) return;
        setIsGenerating(true);
        setView('result');

        const initialStates: Record<string, GeneratedImageState> = {};
        selectedAngles.forEach(id => {
            initialStates[id] = { status: 'pending' };
        });
        setGeneratedImages(initialStates);

        const concurrencyLimit = 3;
        const queue = [...selectedAngles];

        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (queue.length > 0) {
                const angleId = queue.shift();
                if (angleId) {
                    await handleGenerateSingle(angleId);
                }
            }
        });

        await Promise.all(workers);
        setIsGenerating(false);
    };

    const handleStartOver = () => {
        setUploadedImage(null);
        setSelectedAngles([]);
        setGeneratedImages({});
        setView('config');
    };

    const handleDownload = (url: string | undefined, filename: string) => {
        if (!url) return;
        const link = document.createElement('a');
        link.href = url;
        link.download = `virtual-studio-${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const generateButtonText = isGenerating ? "Generating..." : `Generate (${selectedAngles.length})`;

    const renderConfigView = () => (
        <div className="w-full grid md:grid-cols-2 gap-8 items-start">
            <div className="flex flex-col items-center gap-4">
                <h3 className="font-bold text-xl text-zinc-200 mb-1 w-full text-center">1. Upload Your Product</h3>
                {uploadedImage ? (
                    <div className="relative group aspect-[4/5] w-full max-w-sm rounded-md overflow-hidden shadow-2xl border border-white/5"><img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" /><button onClick={() => setUploadedImage(null)} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-opacity opacity-0 group-hover:opacity-100" aria-label="Remove image"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                ) : <Uploader onImageUpload={handleImageUpload} />}
            </div>
            <div className="bg-zinc-900/70 border border-white/10 rounded-xl p-6 shadow-lg flex flex-col gap-8">
                <div className={cn(!uploadedImage && "opacity-50 pointer-events-none")}>
                    <h3 className="font-bold text-xl text-zinc-200 mb-3 flex items-center gap-2">
                        <span className="text-violet-400">2.</span> Aspect Ratio
                    </h3>
                    <div className="flex-shrink-0 bg-zinc-950 p-1.5 rounded-full flex items-center gap-1 border border-zinc-800 shadow-inner-soft">
                        {ASPECT_RATIO_OPTIONS.map(ar => (
                            <button
                                key={ar.id}
                                onClick={() => setAspectRatio(ar.value)}
                                className={`flex-1 flex items-center justify-center gap-1.5 p-2 text-sm font-medium rounded-full transition-all duration-200 h-10 ${
                                    aspectRatio === ar.value ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                                title={ar.name}
                            >
                                {ar.icon}
                                <span className="hidden sm:inline">{ar.name}</span>
                                <span className="sm:hidden text-xs">{ar.value}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={cn(!uploadedImage && "opacity-50 pointer-events-none")}>
                    <h3 className="font-bold text-xl text-zinc-200 mb-3 flex items-center gap-2">
                        <span className="text-violet-400">3.</span> Select Angles
                    </h3>
                    <p className="text-zinc-400 text-sm mb-4">Choose the perspectives you want the virtual camera to capture.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ANGLE_OPTIONS.map(angle => (
                            <button 
                                key={angle.id} 
                                onClick={() => toggleAngle(angle.id)} 
                                className={cn(
                                    'px-3 py-2.5 text-xs rounded-lg transition-all duration-200 font-bold uppercase tracking-wider border', 
                                    selectedAngles.includes(angle.id) 
                                        ? 'bg-violet-600 text-white border-violet-500 shadow-glow-sm' 
                                        : 'bg-zinc-850 text-zinc-400 border-white/5 hover:border-white/10 hover:bg-zinc-800'
                                )}
                            >
                                {angle.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={handleGenerateAll} 
                    disabled={!uploadedImage || selectedAngles.length === 0 || isGenerating} 
                    className="w-full mt-4 flex items-center justify-center gap-2 text-white font-black uppercase tracking-[0.2em] text-sm py-4 px-6 rounded-xl bg-brand-primary hover:bg-brand-primary-hover disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-button-glow"
                >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : null}
                    {generateButtonText}
                </button>
            </div>
        </div>
    );

    const renderResultView = () => (
        <div className="w-full flex flex-col items-center gap-8 pb-20">
            <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                 <ResultCard title="Original" imageUrl={uploadedImage!} status='done' onRetry={() => {}} onDownload={() => handleDownload(uploadedImage, 'original')} ratio={aspectRatio} />
                 {Object.entries(generatedImages).map(([angleId, state]: [string, GeneratedImageState]) => {
                     const angle = ANGLE_OPTIONS.find(a => a.id === angleId);
                     if (!angle) return null;
                     return <ResultCard key={angleId} title={angle.label} imageUrl={state.url} status={state.status} error={state.error} onRetry={() => handleGenerateSingle(angleId)} onDownload={() => handleDownload(state.url, angleId)} ratio={aspectRatio} />
                 })}
            </div>
            <button onClick={handleStartOver} className="font-bold uppercase tracking-[0.2em] text-xs text-center text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/5 py-3 px-8 rounded-full transition-all duration-300 hover:scale-105 mt-12 flex items-center gap-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                Start New Shoot
            </button>
        </div>
    );
    
    return (
        <div className="bg-zinc-950 text-zinc-200 min-h-screen w-full flex flex-col items-center font-sans relative overflow-x-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/5 blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-blue-600/5 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-7xl mx-auto flex flex-col items-center z-10 px-4 sm:px-6">
                <header className="w-full flex justify-between items-center py-6 mb-4">
                    <button onClick={view === 'config' ? onBack : handleStartOver} className="group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800 shadow-inner-highlight">
                        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                        {view === 'config' ? 'Studio' : 'Back'}
                    </button>
                </header>
                
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                        </span>
                        Photorealistic Virtual Camera
                    </div>
                    <h2 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-zinc-600 mb-4 flex items-center justify-center gap-5 tracking-tighter italic uppercase">
                        One To Many
                    </h2>
                    <p className="text-sm sm:text-lg text-zinc-500 max-w-xl mx-auto leading-relaxed font-medium">
                        Move the camera, not the set. Generate multiple angles of your product while keeping the environment locked.
                    </p>
                </div>

                <div className="w-full flex-grow flex flex-col items-center min-h-0">
                    {view === 'config' ? renderConfigView() : renderResultView()}
                </div>
            </motion.div>
        </div>
    );
}
