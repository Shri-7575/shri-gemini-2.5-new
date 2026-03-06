
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, Share2, UploadCloud, Check, Copy, Wand2, 
    Download, Trash2, Layout, Sparkles, MessageCircle, 
    Twitter, Instagram, Smartphone, Loader2, ImagePlus, Type, X, Edit3, Undo, Brush
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { SOCIAL_TEMPLATES } from '../../context/socialStore';
import { cn } from '../../lib/utils';
import { SocialRatio } from '../../types';

/**
 * High-end masking component for social visual editing
 */
const SocialImageEditor: React.FC<{ 
    imageUrl: string; 
    onClose: () => void; 
    onApply: (maskB64: string, prompt: string) => void;
    isProcessing: boolean;
}> = ({ imageUrl, onClose, onApply, isProcessing }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(40);
    const [prompt, setPrompt] = useState('');
    const [history, setHistory] = useState<ImageData[]>([]);

    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img || !img.complete) return;

        const container = containerRef.current;
        if (!container) return;

        const { clientWidth, clientHeight } = container;
        const imgRatio = img.naturalWidth / img.naturalHeight;
        
        let displayWidth = clientWidth;
        let displayHeight = clientWidth / imgRatio;

        if (displayHeight > clientHeight) {
            displayHeight = clientHeight;
            displayWidth = displayHeight * imgRatio;
        }

        canvas.width = displayWidth;
        canvas.height = displayHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, displayWidth, displayHeight);
            setHistory([ctx.getImageData(0, 0, displayWidth, displayHeight)]);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(initCanvas, 100);
        window.addEventListener('resize', initCanvas);
        return () => {
            window.removeEventListener('resize', initCanvas);
            clearTimeout(timer);
        };
    }, [initCanvas]);

    const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const coords = getCoords(e);
        if (!coords) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            setIsDrawing(true);
            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
            ctx.lineCap = 'round';
            ctx.lineWidth = brushSize;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const coords = getCoords(e);
        if (!coords) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
            setHistory(prev => [...prev, ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height)]);
        }
    };

    const handleUndo = () => {
        if (history.length > 1) {
            const newHistory = [...history];
            newHistory.pop();
            const lastState = newHistory[newHistory.length - 1];
            canvasRef.current?.getContext('2d')?.putImageData(lastState, 0, 0);
            setHistory(newHistory);
        }
    };

    const handleSubmit = () => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (canvas && img && prompt.trim()) {
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = img.naturalWidth;
            finalCanvas.height = img.naturalHeight;
            const fctx = finalCanvas.getContext('2d');
            if (fctx) {
                fctx.fillStyle = 'black';
                fctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
                fctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, finalCanvas.width, finalCanvas.height);
                
                const imgData = fctx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
                for (let i = 0; i < imgData.data.length; i += 4) {
                    if (imgData.data[i + 3] > 10) { 
                        imgData.data[i] = 255;
                        imgData.data[i + 1] = 255;
                        imgData.data[i + 2] = 255;
                        imgData.data[i + 3] = 255;
                    } else {
                        imgData.data[i] = 0;
                        imgData.data[i + 1] = 0;
                        imgData.data[i + 2] = 0;
                        imgData.data[i + 3] = 255;
                    }
                }
                fctx.putImageData(imgData, 0, 0);
                onApply(finalCanvas.toDataURL('image/png'), prompt);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-2 sm:p-4">
            <div className="w-full max-w-5xl flex flex-col h-full max-h-[95vh] sm:max-h-[90vh] bg-zinc-925 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between p-4 sm:p-6 bg-zinc-900 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-600/20 text-violet-400">
                            {/* FIX: Removed invalid 'sm:size' prop. */}
                            <Edit3 size={20} />
                        </div>
                        <h3 className="text-sm sm:text-base font-black uppercase tracking-tighter italic">Refine Studio Visual</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors"><X size={24} /></button>
                </div>

                <div className="flex-grow flex flex-col lg:flex-row overflow-hidden min-h-0">
                    <div ref={containerRef} className="flex-grow relative flex items-center justify-center p-4 sm:p-6 bg-black/20 overflow-hidden min-h-[300px] lg:min-h-0">
                        <img 
                            ref={imageRef}
                            src={imageUrl} 
                            alt="Edit target" 
                            className="max-w-full max-h-full object-contain pointer-events-none rounded-lg"
                            onLoad={initCanvas}
                        />
                        <canvas
                            ref={canvasRef}
                            className="absolute z-10 cursor-crosshair touch-none"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                    </div>

                    <div className="w-full lg:w-80 p-4 sm:p-6 bg-zinc-900 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col gap-6 sm:gap-8 overflow-y-auto custom-scrollbar">
                        <div className="space-y-3 sm:space-y-4">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">1. Transformation Instructions</label>
                            <textarea 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe what the AI should paint in the masked area..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-sm focus:ring-1 focus:ring-violet-500 transition-all min-h-[100px] sm:min-h-[120px] resize-none shadow-inner-soft"
                            />
                        </div>

                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">2. Precision Brush</label>
                                <span className="text-[10px] font-mono text-violet-400 font-bold">{brushSize}px</span>
                            </div>
                            <input 
                                type="range" min="5" max="100" value={brushSize} 
                                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                className="w-full accent-violet-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={handleUndo} disabled={history.length <= 1} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 text-[10px] font-black uppercase hover:bg-zinc-700 disabled:opacity-30 transition-colors border border-white/5">
                                    <Undo size={14} /> Undo
                                </button>
                                <button onClick={() => {
                                    const ctx = canvasRef.current?.getContext('2d');
                                    if (ctx && canvasRef.current) {
                                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                                        setHistory([ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)]);
                                    }
                                }} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 text-[10px] font-black uppercase hover:bg-zinc-700 transition-colors border border-white/5">
                                    <Trash2 size={14} /> Clear
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow hidden lg:block" />

                        <button 
                            onClick={handleSubmit}
                            disabled={!prompt.trim() || isProcessing}
                            className="w-full py-4 rounded-xl bg-violet-600 text-white font-black text-xs shadow-button-glow hover:bg-violet-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                        >
                            {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                            Apply Transformation
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RatioIcon = ({ ratio }: { ratio: string }) => {
    switch(ratio) {
        case '1:1': return <Instagram size={14} className="text-zinc-500" />;
        case '4:5': return <Smartphone size={14} className="text-zinc-500" />;
        case '9:16': return <Share2 size={14} className="text-zinc-500" />;
        default: return null;
    }
};

const CaptionCard = ({ platform, text, icon }: { platform: string, text: string, icon: React.ReactNode }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex flex-col gap-3 group h-full">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {icon}
                    {platform}
                </div>
                <button 
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed italic line-clamp-4 sm:line-clamp-none">"{text}"</p>
        </div>
    );
};

export default function SocialStudio({ onBack }: { onBack: () => void }) {
    const {
        socialSourceImage,
        setSocialSourceImage,
        socialInspirationImage,
        setSocialInspirationImage,
        activeSocialTemplate,
        setSocialTemplate,
        selectedSocialRatio,
        setSocialRatio,
        customSocialPrompt,
        setCustomSocialPrompt,
        socialTone,
        setSocialTone,
        isSocialGenerating,
        generateSocialPosts,
        generatedSocialPosts,
        socialCaptions,
        resetSocialStudio,
        isSocialEditing,
        setSocialEditing,
        applySocialGenerativeEdit,
        isSocialApplyingEdit,
        error
    } = useStudio();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) setSocialSourceImage(event.target.result as string);
            };
            reader.readAsDataURL(file);
        }
    }, [setSocialSourceImage]);

    const onInspirationDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) setSocialInspirationImage(event.target.result as string);
            };
            reader.readAsDataURL(file);
        }
    }, [setSocialInspirationImage]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
        multiple: false,
        disabled: !!socialSourceImage
    });

    const { getRootProps: getInspProps, getInputProps: getInspInputProps, isDragActive: isInspActive } = useDropzone({
        onDrop: onInspirationDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
        multiple: false
    });

    const handleDownload = (url: string, ratio: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `social-post-${ratio}-${Date.now()}.png`;
        link.click();
    };

    return (
        <div className="bg-zinc-950 text-zinc-200 min-h-screen w-full flex flex-col font-sans relative overflow-x-hidden">
            <header className="relative z-20 w-full flex justify-between items-center py-4 px-4 sm:px-6 border-b border-white/10 backdrop-blur-xl bg-zinc-950/50 flex-shrink-0">
                <button onClick={onBack} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800 shadow-inner-highlight">
                    <ArrowLeft size={16} /> <span className="hidden sm:inline">Back</span>
                </button>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-violet-600/10 border border-violet-600/20">
                        <Share2 size={16} className="text-violet-400" />
                    </div>
                    <h1 className="text-base sm:text-xl font-black tracking-tighter uppercase italic">Social Post Studio</h1>
                </div>
                <div className="w-10 sm:w-20"></div>
            </header>

            <main className="relative z-10 flex-grow w-full flex flex-col lg:flex-row lg:h-[calc(100vh-73px)] lg:overflow-hidden">
                {!socialSourceImage ? (
                    <div className="flex-grow flex items-center justify-center p-4 sm:p-8">
                        <div {...getRootProps()} className={cn(
                            "aspect-square sm:aspect-video w-full max-w-2xl flex flex-col items-center justify-center border-2 border-dashed rounded-3xl transition-all duration-500 cursor-pointer group",
                            isDragActive ? "border-violet-500 bg-violet-500/5 shadow-glow-lg" : "border-zinc-700 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/40"
                        )}>
                            <input {...getInputProps()} />
                            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/5 shadow-2xl">
                                <UploadCloud size={32} className="text-zinc-400 group-hover:text-violet-400 transition-colors" />
                            </div>
                            <span className="text-zinc-100 font-black text-xl sm:text-2xl tracking-tighter uppercase italic text-center px-6">Upload Product or Apparel</span>
                            <p className="text-zinc-500 text-[10px] sm:text-xs mt-3 font-medium uppercase tracking-[0.2em]">Ready for viral distribution</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Sidebar Controls */}
                        <aside className="w-full lg:w-96 bg-zinc-925 border-r border-white/10 p-4 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 sm:gap-8 flex-shrink-0 lg:h-full">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">1. Main Asset</label>
                                    <button onClick={resetSocialStudio} className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"><Trash2 size={12}/> Clear</button>
                                </div>
                                <div className="aspect-square w-full rounded-2xl border border-white/10 overflow-hidden bg-zinc-900 shadow-inner-soft">
                                    <img src={socialSourceImage} className="w-full h-full object-contain" alt="Source" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">2. Select Style</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                                    {Object.values(SOCIAL_TEMPLATES).map(tpl => (
                                        <button
                                            key={tpl.id}
                                            onClick={() => setSocialTemplate(tpl.id)}
                                            className={cn(
                                                "p-3 rounded-xl border text-left transition-all",
                                                activeSocialTemplate === tpl.id 
                                                    ? "bg-violet-600/10 border-violet-500 shadow-glow-sm" 
                                                    : "bg-zinc-900 border-white/5 hover:border-white/10"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                {tpl.id === 'custom' && <Type size={14} className="text-violet-400" />}
                                                {tpl.id === 'copy' && <ImagePlus size={14} className="text-violet-400" />}
                                                <h4 className="text-xs sm:text-sm font-bold text-zinc-100">{tpl.name}</h4>
                                            </div>
                                            <p className="text-[9px] sm:text-[10px] text-zinc-500 leading-relaxed line-clamp-1 sm:line-clamp-none">{tpl.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <AnimatePresence mode="sync">
                                {activeSocialTemplate === 'custom' && (
                                    <motion.div 
                                        key="custom-prompt-section"
                                        initial={{ opacity: 0, y: -10 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Custom Vision</label>
                                        <textarea
                                            value={customSocialPrompt}
                                            onChange={(e) => setCustomSocialPrompt(e.target.value)}
                                            placeholder="Describe the scene, lighting and mood..."
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-200 focus:ring-1 focus:ring-violet-500 min-h-[100px] shadow-inner-soft resize-none"
                                        />
                                    </motion.div>
                                )}

                                {activeSocialTemplate === 'copy' && (
                                    <motion.div 
                                        key="copy-post-section"
                                        initial={{ opacity: 0, y: -10 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Inspiration Image (To Copy)</label>
                                        {socialInspirationImage ? (
                                            <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-violet-500/50 group">
                                                <img src={socialInspirationImage} className="w-full h-full object-cover" alt="Inspiration" />
                                                <button 
                                                    onClick={() => setSocialInspirationImage(null)}
                                                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                                                >
                                                    <X size={14} />
                                                </button>
                                                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm py-1.5 text-center text-[10px] font-bold text-violet-300">
                                                    Style Source Active
                                                </div>
                                            </div>
                                        ) : (
                                            <div {...getInspProps()} className={cn(
                                                "aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-4 transition-all",
                                                isInspActive ? "border-violet-500 bg-violet-500/5" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                                            )}>
                                                <input {...getInspInputProps()} />
                                                <ImagePlus size={24} className="text-zinc-600 mb-2" />
                                                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Upload Reference</p>
                                                <p className="text-[9px] text-zinc-600 mt-1">Recreate this visual style</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">3. Aspect Ratio</label>
                                <div className="grid grid-cols-3 gap-1.5 bg-zinc-900 p-1.5 rounded-xl border border-white/5">
                                    {(['1:1', '4:5', '9:16'] as SocialRatio[]).map(ratio => (
                                        <button
                                            key={ratio}
                                            onClick={() => setSocialRatio(ratio)}
                                            className={cn(
                                                "flex flex-col items-center gap-1.5 py-2 sm:py-2.5 rounded-lg transition-all border",
                                                selectedSocialRatio === ratio 
                                                    ? "bg-zinc-800 border-white/10 text-white shadow-lg" 
                                                    : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            <RatioIcon ratio={ratio} />
                                            <span className="text-[10px] font-bold">{ratio}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">4. Tone of Voice</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['excited', 'professional', 'witty', 'minimal'].map(tone => (
                                        <button
                                            key={tone}
                                            onClick={() => setSocialTone(tone as any)}
                                            className={cn(
                                                "py-2 px-3 rounded-lg border text-[10px] font-bold capitalize transition-all",
                                                socialTone === tone ? "bg-zinc-100 text-zinc-950 border-white" : "bg-zinc-800 border-white/5 text-zinc-400 hover:text-zinc-200"
                                            )}
                                        >
                                            {tone}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={generateSocialPosts}
                                disabled={isSocialGenerating}
                                className="w-full py-4 mt-4 rounded-xl bg-violet-600 text-white font-black text-xs uppercase tracking-widest shadow-button-glow hover:bg-violet-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-wait"
                            >
                                {isSocialGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                Build Viral Post
                            </button>
                        </aside>

                        {/* Preview Area */}
                        <div className="flex-grow p-4 sm:p-8 bg-black/20 flex flex-col items-center lg:h-full lg:overflow-y-auto custom-scrollbar">
                            <AnimatePresence mode="wait">
                                {isSocialGenerating ? (
                                    <motion.div 
                                        key="loading"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="h-96 lg:h-full flex flex-col items-center justify-center gap-6"
                                    >
                                        <div className="spinner-orb border-violet-500"></div>
                                        <div className="text-center space-y-2">
                                            <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tighter">AI is composing your media...</h3>
                                            <p className="text-zinc-500 text-xs font-medium tracking-widest uppercase">Painting {selectedSocialRatio} Format + Captions</p>
                                        </div>
                                    </motion.div>
                                ) : generatedSocialPosts.length > 0 ? (
                                    <motion.div 
                                        key="results"
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                        className="w-full max-w-5xl flex flex-col gap-8 sm:gap-12 pb-12"
                                    >
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-start">
                                            {/* Visual Section */}
                                            <div className="space-y-4 sm:space-y-6">
                                                <div className="flex items-center justify-between text-zinc-100 font-black uppercase italic tracking-widest text-[10px] sm:text-xs px-1">
                                                    <div className="flex items-center gap-3">
                                                        <Layout size={18} className="text-violet-400" />
                                                        Final Visual ({generatedSocialPosts[0].ratio})
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => handleDownload(generatedSocialPosts[0].url, generatedSocialPosts[0].ratio)}
                                                            className="flex items-center gap-2 p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all bg-zinc-900 border border-white/5"
                                                        >
                                                            <Download size={14}/>
                                                            <span className="hidden sm:inline text-[9px]">Export</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "bg-zinc-925 rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative ring-1 ring-white/5 group",
                                                    generatedSocialPosts[0].ratio === '1:1' ? 'aspect-square' : generatedSocialPosts[0].ratio === '4:5' ? 'aspect-[4/5]' : 'aspect-[9/16] max-w-[320px] mx-auto'
                                                )}>
                                                    <img src={generatedSocialPosts[0].url} className="w-full h-full object-cover animate-reveal" alt="Social post" />
                                                    
                                                    {/* Edit Button Overlay - Top Left as requested */}
                                                    <button 
                                                        onClick={() => setSocialEditing(true)}
                                                        className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-violet-600 transition-all hover:scale-105 shadow-xl group-hover:opacity-100 sm:opacity-0"
                                                        title="Generative Edit"
                                                    >
                                                        <Edit3 size={16}/>
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Edit Visual</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Captions Section */}
                                            <div className="space-y-4 sm:space-y-6">
                                                <div className="flex items-center gap-3 text-zinc-100 font-black uppercase italic tracking-widest text-[10px] sm:text-xs px-1">
                                                    <MessageCircle size={18} className="text-violet-400" />
                                                    Viral Captions
                                                </div>
                                                {socialCaptions ? (
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <CaptionCard platform="Instagram" text={socialCaptions.instagram} icon={<Instagram size={14} />} />
                                                        <CaptionCard platform="TikTok" text={socialCaptions.tiktok} icon={<Smartphone size={14} />} />
                                                        <CaptionCard platform="Twitter / X" text={socialCaptions.twitter} icon={<Twitter size={14} />} />
                                                    </div>
                                                ) : (
                                                    <div className="p-12 rounded-3xl bg-zinc-900/50 border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center text-zinc-500">
                                                        <MessageCircle size={32} className="mb-4 opacity-20" />
                                                        <p className="text-[10px] font-bold uppercase tracking-widest">Captions generating...</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="h-96 lg:h-full flex flex-col items-center justify-center text-zinc-600 gap-4 opacity-50">
                                        <Share2 size={64} strokeWidth={1} />
                                        <p className="text-sm font-bold uppercase tracking-widest">Select a post style to begin</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </main>

            {/* Editing Modal */}
            <AnimatePresence>
                {isSocialEditing && generatedSocialPosts.length > 0 && (
                    <SocialImageEditor 
                        imageUrl={generatedSocialPosts[0].url}
                        onClose={() => setSocialEditing(false)}
                        isProcessing={isSocialApplyingEdit}
                        onApply={(mask, prompt) => applySocialGenerativeEdit(mask, prompt)}
                    />
                )}
            </AnimatePresence>

            {error && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 p-4 bg-red-950/20 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-4 z-50 animate-shake shadow-2xl max-w-[90vw] sm:max-w-md">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                    {error}
                </div>
            )}
        </div>
    );
}
