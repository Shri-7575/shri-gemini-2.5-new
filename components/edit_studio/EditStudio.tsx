
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UploadCloud, ImageIcon, Loader2, Wand2, Download, RotateCcw, X, Brush, Undo, Trash2, Sparkles, Plus, Image as ImageLucide } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { cn } from '../../lib/utils';

export default function EditStudio({ onBack }: { onBack: () => void }) {
    const { 
        editSourceImage, 
        setEditSourceImage, 
        editResultImage,
        editReferenceAssets,
        addEditReferenceAsset,
        removeEditReferenceAsset,
        applyEditStudioChange,
        isEditProcessing,
        resetEditStudio,
        error 
    } = useStudio();

    const [prompt, setPrompt] = useState('');
    const [brushSize, setBrushSize] = useState(40);
    const [brushColor, setBrushColor] = useState('#ffffff');
    const [isDrawing, setIsDrawing] = useState(false);
    const [history, setHistory] = useState<ImageData[]>([]);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        const container = containerRef.current;
        if (!canvas || !img || !container) return;

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
        if (editSourceImage) {
            const timer = setTimeout(initCanvas, 100);
            window.addEventListener('resize', initCanvas);
            return () => {
                window.removeEventListener('resize', initCanvas);
                clearTimeout(timer);
            };
        }
    }, [editSourceImage, initCanvas, editResultImage]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setEditSourceImage(event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    }, [setEditSourceImage]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
        multiple: false,
        disabled: !!editSourceImage
    });

    const onRefAssetDrop = useCallback((acceptedFiles: File[]) => {
        acceptedFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    addEditReferenceAsset(event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        });
    }, [addEditReferenceAsset]);

    const { getRootProps: getRefRootProps, getInputProps: getRefInputProps, isDragActive: isRefDragActive } = useDropzone({
        onDrop: onRefAssetDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
        multiple: true
    });

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
            ctx.strokeStyle = brushColor;
            ctx.globalAlpha = 0.6;
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

    const handleClearMask = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            setHistory([ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)]);
        }
    };

    const handleSubmit = async () => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (canvas && img && prompt.trim()) {
            const finalCanvas = document.createElement('canvas');
            // FIX: Set mask dimensions to natural size of base image for perfect alignment
            finalCanvas.width = img.naturalWidth;
            finalCanvas.height = img.naturalHeight;
            const fctx = finalCanvas.getContext('2d');
            if (fctx) {
                // Background must be solid black
                fctx.fillStyle = 'black';
                fctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
                
                // Draw display-size drawings scaled to natural size
                fctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, finalCanvas.width, finalCanvas.height);
                
                // Ensure all painted pixels are solid white
                const imgData = fctx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
                for (let i = 0; i < imgData.data.length; i += 4) {
                    const alpha = imgData.data[i + 3];
                    if (alpha > 10) { 
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

                const mask = finalCanvas.toDataURL('image/png');
                await applyEditStudioChange(mask, prompt);
                handleClearMask();
            }
        }
    };

    const handleDownload = () => {
        const url = editResultImage || editSourceImage;
        if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = `edited-image-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleStartOver = () => {
        resetEditStudio();
        setPrompt('');
    };

    const PRESET_COLORS = [
        '#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ec4899', '#000000',
    ];

    return (
        <div className="bg-zinc-950 text-zinc-200 h-screen w-full flex flex-col font-sans relative overflow-hidden">
            <header className="relative z-20 w-full flex justify-between items-center py-4 px-4 sm:px-6 border-b border-white/10 backdrop-blur-xl bg-zinc-950/50 flex-shrink-0">
                <button onClick={onBack} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800 shadow-inner-highlight">
                    <ArrowLeft size={16} /> <span className="hidden sm:inline">Back</span>
                </button>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-violet-600/10 border border-violet-600/20">
                        <Wand2 size={16} className="text-violet-400" />
                    </div>
                    <h1 className="text-base sm:text-xl font-black tracking-tighter uppercase italic">Edit Studio</h1>
                </div>
                <div className="w-10 sm:w-20"></div>
            </header>

            <main className="relative z-10 flex-grow w-full flex flex-col lg:flex-row overflow-hidden">
                {!editSourceImage ? (
                    <div className="flex-grow flex items-center justify-center p-4">
                        <div {...getRootProps()} className={cn(
                            "aspect-square sm:aspect-video w-full max-w-2xl flex flex-col items-center justify-center border-2 border-dashed rounded-3xl transition-all duration-500 cursor-pointer group",
                            isDragActive ? "border-violet-500 bg-violet-500/5 shadow-glow-lg" : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/40"
                        )}>
                            <input {...getInputProps()} />
                            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/5 shadow-2xl">
                                <UploadCloud size={28} className="text-zinc-400 group-hover:text-violet-400 transition-colors" />
                            </div>
                            <span className="text-zinc-100 font-black text-lg sm:text-2xl tracking-tighter uppercase italic text-center">Upload Base Image</span>
                            <p className="text-zinc-500 text-[11px] sm:text-sm mt-3 px-10 text-center leading-relaxed font-medium uppercase tracking-[0.1em]">JPEG, PNG or WebP supported</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div ref={containerRef} className="flex-grow relative flex items-center justify-center p-4 bg-black/40 min-h-0">
                            <div className="relative inline-block max-w-full max-h-full">
                                <img 
                                    ref={imageRef}
                                    src={editResultImage || editSourceImage} 
                                    alt="Target" 
                                    className="max-w-full max-h-[70vh] lg:max-h-[80vh] object-contain block select-none pointer-events-none rounded-lg shadow-2xl"
                                    onLoad={initCanvas}
                                />
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 z-10 cursor-crosshair touch-none"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                                <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-2">
                                    <span className="bg-black/60 backdrop-blur text-[10px] text-white px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest font-bold">1. Paint areas to modify</span>
                                </div>
                            </div>

                            {isEditProcessing && (
                                <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-fade-in">
                                    <div className="spinner-orb border-violet-500"></div>
                                    <p className="text-sm font-black uppercase tracking-widest text-violet-400 animate-pulse">Processing multiple assets...</p>
                                </div>
                            )}
                        </div>

                        <aside className="w-full lg:w-96 bg-zinc-900 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] block">2. Reference Assets</label>
                                        <div {...getRefRootProps()} className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 p-1.5 rounded-lg border border-white/10 transition-colors">
                                            <input {...getRefInputProps()} />
                                            <Plus size={14} className="text-violet-400" />
                                        </div>
                                    </div>
                                    
                                    {editReferenceAssets.length === 0 ? (
                                        <div {...getRefRootProps()} className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors ${isRefDragActive ? 'border-violet-500 bg-violet-500/5' : 'border-zinc-800 bg-zinc-925 hover:border-zinc-700'}`}>
                                            <input {...getRefInputProps()} />
                                            <ImageLucide size={24} className="text-zinc-600" />
                                            <p className="text-xs text-zinc-500 font-medium">Add images you want to place in the masked areas</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-2">
                                            {editReferenceAssets.map((asset, idx) => (
                                                <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-white/5 bg-zinc-925 shadow-inner">
                                                    <img src={asset} className="w-full h-full object-cover" alt={`Ref ${idx}`} />
                                                    <button 
                                                        onClick={() => removeEditReferenceAsset(idx)}
                                                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                    <div className="absolute bottom-1 left-1 bg-black/40 px-1.5 rounded text-[8px] font-bold text-zinc-400 border border-white/5">#{idx + 1}</div>
                                                </div>
                                            ))}
                                            <div {...getRefRootProps()} className="aspect-square rounded-lg border-2 border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 hover:border-zinc-700 hover:text-zinc-500 cursor-pointer transition-colors">
                                                <input {...getRefInputProps()} />
                                                <Plus size={20} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] block">3. Describe Mapping</label>
                                    <p className="text-[10px] text-zinc-500 -mt-2">Map assets (e.g., "Place asset #1 on the left side...")</p>
                                    <textarea 
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="e.g., Replace the masked portions with the corresponding reference assets. Ensure they blend naturally..."
                                        className="w-full bg-zinc-850 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-100 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all min-h-[120px] resize-none shadow-inner-soft"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Brush Size</label>
                                        <span className="text-[10px] font-mono text-violet-400">{brushSize}px</span>
                                    </div>
                                    <input 
                                        type="range" min="5" max="100" value={brushSize} 
                                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                        className="w-full accent-violet-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                    />

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Brush Color</label>
                                        <div className="flex flex-wrap gap-2">
                                            {PRESET_COLORS.map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setBrushColor(color)}
                                                    className={cn(
                                                        "w-6 h-6 rounded-full border-2 transition-all",
                                                        brushColor === color ? "border-white scale-110 shadow-glow-sm" : "border-zinc-700 hover:scale-105"
                                                    )}
                                                    style={{ backgroundColor: color }}
                                                    title={color}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <button onClick={handleUndo} disabled={history.length <= 1} className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-800 text-[11px] font-bold hover:bg-zinc-700 disabled:opacity-30 transition-colors border border-white/5">
                                            <Undo size={14} /> Undo
                                        </button>
                                        <button onClick={handleClearMask} className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-800 text-[11px] font-bold hover:bg-zinc-700 transition-colors border border-white/5">
                                            <Trash2 size={14} /> Clear
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/10 flex flex-col gap-4">
                                    <button 
                                        onClick={handleSubmit}
                                        disabled={!prompt.trim() || isEditProcessing}
                                        className="w-full py-4 rounded-xl bg-violet-600 text-white font-black text-xs uppercase tracking-widest shadow-button-glow hover:bg-violet-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {isEditProcessing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                        Run Multi-Edit
                                    </button>

                                    {editResultImage && (
                                        <button 
                                            onClick={handleDownload}
                                            className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-950 font-black text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            <Download size={18} />
                                            Download Result
                                        </button>
                                    )}

                                    <button 
                                        onClick={handleStartOver}
                                        className="w-full py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-xs uppercase tracking-widest hover:bg-zinc-750 transition-all flex items-center justify-center gap-3"
                                    >
                                        <RotateCcw size={16} />
                                        Start Over
                                    </button>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl text-red-400 text-[10px] font-bold flex items-center gap-3 animate-shake">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                                        {error}
                                    </div>
                                )}
                            </div>
                        </aside>
                    </>
                )}
            </main>
        </div>
    );
}
