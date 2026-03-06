
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Zap, UploadCloud, ImageIcon, Loader2, Sparkles, Wand2, Download, RotateCcw, Edit2, X, Brush, Undo, Trash2 } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { cn } from '../../lib/utils';

/**
 * Simplified Inline Editor for Lite Studio
 */
const LiteImageEditor: React.FC<{ 
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
        if (canvas && prompt.trim()) {
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = canvas.width;
            finalCanvas.height = canvas.height;
            const fctx = finalCanvas.getContext('2d');
            if (fctx) {
                fctx.fillStyle = 'black';
                fctx.fillRect(0, 0, canvas.width, canvas.height);
                fctx.drawImage(canvas, 0, 0);
                onApply(finalCanvas.toDataURL('image/png'), prompt);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4">
            <div className="w-full max-w-4xl flex flex-col h-full max-h-[95vh] sm:max-h-[90vh]">
                <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-t-2xl border-x border-t border-white/10">
                    <h3 className="font-bold flex items-center gap-2"><Edit2 size={18} /> Edit Result</h3>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-grow flex flex-col md:flex-row bg-zinc-950 border-x border-white/10 overflow-hidden min-h-0">
                    {/* Drawing Area */}
                    <div ref={containerRef} className="flex-grow relative flex items-center justify-center p-4 bg-black/40 min-h-[300px]">
                        <img 
                            ref={imageRef}
                            src={imageUrl} 
                            alt="Edit target" 
                            className="max-w-full max-h-full object-contain pointer-events-none"
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
                         <div className="absolute top-4 left-4 z-20 pointer-events-none">
                            <span className="bg-black/60 backdrop-blur text-[10px] text-white px-2 py-1 rounded-full border border-white/10">Paint area to modify</span>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="w-full md:w-72 p-4 sm:p-6 bg-zinc-900 border-t md:border-t-0 md:border-l border-white/10 flex flex-col gap-5 sm:gap-6 overflow-y-auto">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">1. Change Description</label>
                            <textarea 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., add red sunglasses, remove the background person..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-violet-500 transition-all min-h-[80px] sm:min-h-[100px] resize-none"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">2. Brush Size</label>
                                <span className="text-[10px] font-mono text-zinc-500">{brushSize}px</span>
                            </div>
                            <input 
                                type="range" min="5" max="100" value={brushSize} 
                                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                className="w-full accent-violet-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={handleUndo} disabled={history.length <= 1} className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-800 text-[11px] font-bold hover:bg-zinc-700 disabled:opacity-30 transition-colors border border-white/5">
                                <Undo size={14} /> Undo
                            </button>
                            <button onClick={() => {
                                const ctx = canvasRef.current?.getContext('2d');
                                if (ctx && canvasRef.current) {
                                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                                    setHistory([ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)]);
                                }
                            }} className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-800 text-[11px] font-bold hover:bg-zinc-700 transition-colors border border-white/5">
                                <Trash2 size={14} /> Clear
                            </button>
                        </div>

                        <div className="flex-grow md:block hidden" />

                        <button 
                            onClick={handleSubmit}
                            disabled={!prompt.trim() || isProcessing}
                            className="w-full py-4 rounded-xl bg-violet-600 text-white font-bold text-xs shadow-glow-md hover:bg-violet-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                        >
                            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                            Generate Edit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ConceptCard: React.FC<{
    name: string;
    description: string;
    onClick: () => void;
    disabled?: boolean;
}> = ({ name, description, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "group relative h-full flex flex-col p-4 bg-zinc-900 border border-white/10 rounded-xl text-left transition-all duration-300 hover:border-violet-500/50 hover:shadow-glow-md",
            disabled ? "opacity-50 cursor-not-allowed" : "hover:-translate-y-1 active:translate-y-0 active:scale-[0.98]"
        )}
    >
        <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
                <Sparkles size={16} className="text-violet-400" />
            </div>
            <h4 className="font-bold text-zinc-100 truncate text-sm">{name}</h4>
        </div>
        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{description}</p>
        <div className="mt-auto pt-3 flex items-center gap-1.5 text-[10px] font-bold text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
            Generate Now
        </div>
    </button>
);

export default function LiteStudio({ onBack }: { onBack: () => void }) {
    const { 
        liteSourceImage, 
        setLiteSourceImage, 
        liteConcepts, 
        generateLiteConcepts, 
        isLiteAnalyzing, 
        isLiteGenerating, 
        liteGeneratedImage, 
        generateLiteImage, 
        liteApplyGenerativeEdit,
        isLiteApplyingEdit,
        resetLiteStudio,
        error 
    } = useStudio();

    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setLiteSourceImage(event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    }, [setLiteSourceImage]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
        multiple: false
    });

    const handleDownload = () => {
        if (liteGeneratedImage) {
            const link = document.createElement('a');
            link.href = liteGeneratedImage;
            link.download = `studio-asset-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="bg-zinc-950 text-zinc-200 h-screen w-full flex flex-col font-sans relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/5 blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-blue-600/5 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            <header className="relative z-10 w-full flex justify-between items-center py-4 px-4 sm:px-6 border-b border-white/10 backdrop-blur-xl bg-zinc-950/50 flex-shrink-0">
                <button onClick={onBack} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800 shadow-inner-highlight">
                    <ArrowLeft size={16} /> <span className="hidden sm:inline">Back</span>
                </button>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                        <Zap size={16} className="text-yellow-400" />
                    </div>
                    <h1 className="text-base sm:text-xl font-black tracking-tighter uppercase italic">Lite Studio</h1>
                </div>
                <div className="w-10 sm:w-20"></div>
            </header>

            {/* MAIN CONTAINER: ONLY ONE SCROLLBAR HERE */}
            <main className="relative z-10 flex-grow w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className="max-w-6xl mx-auto p-4 sm:p-8 flex flex-col items-center">
                    <div className="text-center mb-8 sm:mb-12 animate-fade-in px-4">
                        <h2 className="text-2xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-zinc-600 mb-3 tracking-tighter">
                            Instant Creative Magic
                        </h2>
                        <p className="text-sm sm:text-lg text-zinc-400 max-w-lg mx-auto leading-relaxed">Transform your product with AI concepts in seconds.</p>
                    </div>

                    <div className="w-full">
                        <AnimatePresence mode="wait">
                            {!liteSourceImage ? (
                                <motion.div 
                                    key="uploader"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="w-full max-w-xl mx-auto"
                                >
                                    <div {...getRootProps()} className={cn(
                                        "aspect-square sm:aspect-[1.5/1] w-full flex flex-col items-center justify-center border-2 border-dashed rounded-3xl transition-all duration-500 cursor-pointer group",
                                        isDragActive ? "border-violet-500 bg-violet-500/5 shadow-glow-lg" : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/40"
                                    )}>
                                        <input {...getInputProps()} />
                                        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/5 shadow-2xl">
                                            <UploadCloud size={28} className="text-zinc-400 group-hover:text-violet-400 transition-colors" />
                                        </div>
                                        <span className="text-zinc-100 font-black text-lg sm:text-2xl tracking-tighter uppercase italic">Upload Product</span>
                                        <p className="text-zinc-500 text-[11px] sm:text-sm mt-3 px-10 text-center leading-relaxed font-medium uppercase tracking-[0.1em]">PNG, JPG or WebP supported</p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="editor-view"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="grid grid-cols-1 gap-10 items-start"
                                >
                                    {/* 1. Source */}
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Source Asset</p>
                                        <div className="aspect-[4/5] sm:aspect-square lg:aspect-[4/3] bg-zinc-925 rounded-2xl border border-white/5 overflow-hidden shadow-2xl ring-1 ring-white/5 max-w-sm mx-auto lg:max-w-xl">
                                            <img src={liteSourceImage} alt="Original" className="w-full h-full object-contain" />
                                        </div>
                                    </div>

                                    {/* 2. Style Director - Horizontal List */}
                                    <div className="flex flex-col space-y-6">
                                        <div className="space-y-1">
                                            <h3 className="text-xl sm:text-3xl font-black text-zinc-100 flex items-center gap-4 tracking-tighter">
                                                <Wand2 size={24} className="text-violet-400" /> Style Director
                                            </h3>
                                            <p className="text-xs sm:text-sm text-zinc-500 font-medium">Select a creative direction for your shoot.</p>
                                        </div>

                                        {liteConcepts.length === 0 && !isLiteAnalyzing ? (
                                            <div className="w-full flex flex-col items-center justify-center p-10 rounded-3xl bg-zinc-900/30 border border-white/5 shadow-inner">
                                                <div className="w-20 h-20 rounded-2xl bg-violet-600/10 flex items-center justify-center mb-8 ring-1 ring-violet-500/20">
                                                    <ImageIcon size={40} className="text-violet-500/50" />
                                                </div>
                                                <p className="text-zinc-400 text-center mb-8 text-sm leading-relaxed font-semibold max-w-xs mx-auto">AI needs to analyze your product to build unique concepts.</p>
                                                <button 
                                                    onClick={generateLiteConcepts}
                                                    className="w-full max-w-xs py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-button-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                >
                                                    Analyze Asset
                                                </button>
                                            </div>
                                        ) : isLiteAnalyzing ? (
                                            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} className="flex-shrink-0 w-64 h-32 bg-zinc-900/50 border border-white/5 rounded-2xl shimmer-bg"></div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex overflow-x-auto pb-6 -mx-4 px-4 gap-4 sm:gap-6 animate-fade-in custom-scrollbar">
                                                {liteConcepts.map(concept => (
                                                    <div key={concept.id} className="flex-shrink-0 w-[260px] sm:w-[320px]">
                                                        <ConceptCard
                                                            name={concept.name}
                                                            description={concept.description}
                                                            onClick={() => generateLiteImage(concept)}
                                                            disabled={isLiteGenerating || isLiteApplyingEdit}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {error && (
                                            <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-4 animate-shake max-w-lg">
                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                                                {error}
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Generated Image */}
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-violet-400 uppercase tracking-[0.3em]">Generated Shot</p>
                                        <div className="aspect-[4/5] sm:aspect-square lg:aspect-[4/3] bg-zinc-925 rounded-2xl border border-white/5 overflow-hidden shadow-2xl relative flex items-center justify-center ring-1 ring-violet-500/10 group/result max-w-sm mx-auto lg:max-w-xl">
                                            {(isLiteGenerating || isLiteApplyingEdit) ? (
                                                <div className="flex flex-col items-center gap-5">
                                                    <div className="spinner-orb border-violet-500"></div>
                                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] animate-pulse text-center px-4">
                                                        {isLiteApplyingEdit ? 'Refining image...' : 'Painting your scene...'}
                                                    </p>
                                                </div>
                                            ) : liteGeneratedImage ? (
                                                <>
                                                    <img src={liteGeneratedImage} alt="Result" className="w-full h-full object-cover animate-reveal" />
                                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/result:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-5 scale-95 group-hover/result:scale-100">
                                                        <div className="flex gap-4">
                                                            <button 
                                                                onClick={handleDownload} 
                                                                className="p-4 bg-zinc-100 text-zinc-950 rounded-2xl hover:bg-white transition-all hover:scale-110 active:scale-95 shadow-2xl"
                                                                title="Download High-Res"
                                                            >
                                                                <Download size={24} />
                                                            </button>
                                                            <button 
                                                                onClick={() => setIsEditorOpen(true)} 
                                                                className="p-4 bg-violet-600 text-white rounded-2xl hover:bg-violet-500 transition-all hover:scale-110 active:scale-95 shadow-2xl"
                                                                title="Generative Edit"
                                                            >
                                                                <Edit2 size={24} />
                                                            </button>
                                                        </div>
                                                        <span className="text-[10px] font-black text-zinc-200 uppercase tracking-[0.2em]">Asset Ready</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-4 text-zinc-700 px-8 text-center">
                                                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center mb-1 border border-white/5">
                                                        <ImageIcon size={28} strokeWidth={1} />
                                                    </div>
                                                    <p className="text-[11px] font-bold uppercase tracking-widest leading-relaxed">Select a concept style above</p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex justify-center mt-6">
                                            <button onClick={resetLiteStudio} className="flex items-center gap-3 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-200 bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 transition-all shadow-lg">
                                                <RotateCcw size={14} /> Start Over
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>

            {/* Editing Modal */}
            <AnimatePresence>
                {isEditorOpen && liteGeneratedImage && (
                    <LiteImageEditor 
                        imageUrl={liteGeneratedImage} 
                        onClose={() => setIsEditorOpen(false)}
                        isProcessing={isLiteApplyingEdit}
                        onApply={async (mask, prompt) => {
                            await liteApplyGenerativeEdit(mask, prompt);
                            setIsEditorOpen(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
