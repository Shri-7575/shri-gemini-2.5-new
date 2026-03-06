
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, UploadCloud, Image as ImageIcon, Wand2, Loader2, Download, Trash2, Scaling, MousePointer2, Plus, Eye, EyeOff, X } from 'lucide-react';
import { motion } from 'framer-motion';
import JSZip from 'jszip';

interface LogoAsset {
    id: string;
    base64: string;
    name: string;
    placement: PlacementData;
}

interface PlacementData {
    x: number;
    y: number;
    scale: number;
    opacity: number;
    isVisible: boolean;
}

interface LogoStudioProps {
    onBack: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

const DEFAULT_PLACEMENT: PlacementData = {
    x: 10,
    y: 10,
    scale: 20,
    opacity: 80,
    isVisible: true
};

const LogoStudio: React.FC<LogoStudioProps> = ({ onBack }) => {
    const [availableLogos, setAvailableLogos] = useState<LogoAsset[]>([]);
    const [activeLogoId, setActiveLogoId] = useState<string | null>(null);
    const [targetImages, setTargetImages] = useState<{ id: string, base64: string, name: string }[]>([]);
    const [activeTargetImageId, setActiveTargetImageId] = useState<string | null>(null);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [isInteracting, setIsInteracting] = useState(false);

    const previewContainerRef = useRef<HTMLDivElement>(null);
    const logoRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const interaction = useRef({
        type: null as 'drag' | 'resize' | null,
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0,
        startWidth: 0,
        startHeight: 0,
        logoId: null as string | null,
    });

    const activeLogoAsset = availableLogos.find(l => l.id === activeLogoId);

    const onLogoDrop = useCallback(async (acceptedFiles: File[]) => {
        const newLogos = await Promise.all(
            acceptedFiles.map(async (file) => ({
                id: `logo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                base64: await fileToBase64(file),
                name: file.name,
                placement: { ...DEFAULT_PLACEMENT }
            }))
        );

        setAvailableLogos((prev) => [...prev, ...newLogos]);
        if (newLogos.length > 0) setActiveLogoId(newLogos[0].id);
    }, []);

    const onTargetImagesDrop = useCallback(async (acceptedFiles: File[]) => {
        const newImages = await Promise.all(
            acceptedFiles.map(async (file) => ({
                id: `target-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                base64: await fileToBase64(file),
                name: file.name,
            }))
        );

        setTargetImages((prev) => {
            const updated = [...prev, ...newImages];
            if (!activeTargetImageId && updated.length > 0) {
                setActiveTargetImageId(updated[0].id);
            }
            return updated;
        });
    }, [activeTargetImageId]);
    
    const { getRootProps: getLogoRootProps, getInputProps: getLogoInputProps, isDragActive: isLogoDragActive } = useDropzone({ onDrop: onLogoDrop, accept: { 'image/*': [] }, multiple: true });
    const { getRootProps: getTargetRootProps, getInputProps: getTargetInputProps, isDragActive: isTargetDragActive } = useDropzone({ onDrop: onTargetImagesDrop, accept: { 'image/*': [] }, multiple: true });

    const removeTargetImage = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setTargetImages(prev => {
            const filtered = prev.filter(img => img.id !== id);
            if (activeTargetImageId === id) {
                setActiveTargetImageId(filtered.length > 0 ? filtered[0].id : null);
            }
            return filtered;
        });
    };

    const removeLogo = (id: string) => {
        setAvailableLogos(prev => prev.filter(l => l.id !== id));
        if (activeLogoId === id) setActiveLogoId(null);
    };

    const updatePlacement = useCallback((logoId: string, updates: Partial<PlacementData>) => {
        setAvailableLogos(prev => prev.map(l => 
            l.id === logoId 
                ? { ...l, placement: { ...l.placement, ...updates } } 
                : l
        ));
    }, []);

    const toggleLogoVisibility = (logoId: string) => {
        const logo = availableLogos.find(l => l.id === logoId);
        if (logo) {
            updatePlacement(logoId, { isVisible: !logo.placement.isVisible });
        }
    };

    const handleInteractionStart = (e: React.MouseEvent<HTMLDivElement>, type: 'drag' | 'resize', logoId: string) => {
        e.preventDefault();
        e.stopPropagation();

        setActiveLogoId(logoId);
        const targetLogoRef = logoRefs.current[logoId];
        if (!targetLogoRef || !previewContainerRef.current) return;

        const logoRect = targetLogoRef.getBoundingClientRect();
        
        interaction.current = {
            type,
            startX: e.clientX,
            startY: e.clientY,
            startLeft: logoRect.left,
            startTop: logoRect.top,
            startWidth: logoRect.width,
            startHeight: logoRect.height,
            logoId,
        };

        setIsInteracting(true);
    };

    const handleInteractionMove = useCallback((e: MouseEvent) => {
        if (!interaction.current.type || !previewContainerRef.current || !interaction.current.logoId) return;
        
        const logoId = interaction.current.logoId;
        const targetLogoRef = logoRefs.current[logoId];
        if (!targetLogoRef) return;

        const dx = e.clientX - interaction.current.startX;
        const dy = e.clientY - interaction.current.startY;
        const previewRect = previewContainerRef.current.getBoundingClientRect();

        if (interaction.current.type === 'drag') {
            const newLeft = interaction.current.startLeft + dx;
            const newTop = interaction.current.startTop + dy;

            const xPercent = ((newLeft - previewRect.left) / previewRect.width) * 100;
            const yPercent = ((newTop - previewRect.top) / previewRect.height) * 100;
            
            updatePlacement(logoId, {
                x: Math.max(0, Math.min(100 - (targetLogoRef.offsetWidth / previewRect.width * 100), xPercent)),
                y: Math.max(0, Math.min(100 - (targetLogoRef.offsetHeight / previewRect.height * 100), yPercent))
            });

        } else if (interaction.current.type === 'resize') {
            const newWidth = Math.max(20, interaction.current.startWidth + dx);
            const newScale = (newWidth / previewRect.width) * 100;
            updatePlacement(logoId, { scale: Math.round(newScale) });
        }
    }, [updatePlacement]);

    const handleInteractionEnd = useCallback(() => {
        interaction.current.type = null;
        interaction.current.logoId = null;
        setIsInteracting(false);
    }, []);

    useEffect(() => {
        if (isInteracting) {
            window.addEventListener('mousemove', handleInteractionMove);
            window.addEventListener('mouseup', handleInteractionEnd);
        } else {
            window.removeEventListener('mousemove', handleInteractionMove);
            window.removeEventListener('mouseup', handleInteractionEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleInteractionMove);
            window.removeEventListener('mouseup', handleInteractionEnd);
        };
    }, [isInteracting, handleInteractionMove, handleInteractionEnd]);

    const processAndDownload = async () => {
        if (targetImages.length === 0 || availableLogos.length === 0) return;

        setIsProcessing(true);
        setProcessingProgress(0);

        const zip = new JSZip();

        for (let i = 0; i < targetImages.length; i++) {
            const target = targetImages[i];
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            const targetImg = new Image();
            targetImg.src = target.base64;
            await new Promise(resolve => targetImg.onload = resolve);
            
            canvas.width = targetImg.width;
            canvas.height = targetImg.height;
            ctx.drawImage(targetImg, 0, 0);

            for (const logoAsset of availableLogos) {
                const p = logoAsset.placement;
                if (!p.isVisible) continue;

                const logoImg = new Image();
                logoImg.src = logoAsset.base64;
                await new Promise(resolve => logoImg.onload = resolve);

                const logoAspectRatio = logoImg.width / logoImg.height;
                const logoWidth = canvas.width * (p.scale / 100);
                const logoHeight = logoWidth / logoAspectRatio;
                
                const logoX = canvas.width * (p.x / 100);
                const logoY = canvas.height * (p.y / 100);

                ctx.globalAlpha = p.opacity / 100;
                ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
            }
            
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
                zip.file(target.name, blob);
            }
            setProcessingProgress(((i + 1) / targetImages.length) * 100);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = 'watermarked-images.zip';
        link.click();
        URL.revokeObjectURL(link.href);

        setIsProcessing(false);
    };

    const previewImage = targetImages.find(img => img.id === activeTargetImageId)?.base64;

    return (
        <main className="bg-zinc-950 text-zinc-200 min-h-screen w-full flex flex-col items-center p-4 relative noise-overlay font-sans">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-7xl mx-auto flex flex-col z-10 flex-grow">
                <header className="w-full flex justify-between items-center py-4 mb-6">
                    <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800">
                        <ArrowLeft size={16} /> Back to Tools
                    </button>
                </header>
                <div className="text-center mb-10">
                    <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400 mb-2 flex items-center justify-center gap-4 tracking-tight">
                        Logo Studio
                    </h2>
                    <p className="text-lg text-zinc-400 mt-2">Adjust settings once; apply to all images instantly.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
                    {/* Controls Panel */}
                    <div className="lg:col-span-1 flex flex-col gap-6 h-full min-h-0">
                        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-lg text-zinc-100">1. Your Logos</h3>
                                <div {...getLogoRootProps()} className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg transition-colors border border-white/10">
                                    <input {...getLogoInputProps()} />
                                    <Plus size={18} className="text-violet-400" />
                                </div>
                            </div>

                            {availableLogos.length === 0 ? (
                                <div {...getLogoRootProps()} className={`cursor-pointer aspect-video w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors ${isLogoDragActive ? "border-violet-500 bg-violet-500/10" : "border-zinc-700 hover:border-zinc-600"}`}>
                                    <input {...getLogoInputProps()} />
                                    <UploadCloud className="h-8 w-8 text-zinc-500 mb-2" />
                                    <span className="text-zinc-400 font-semibold text-center text-sm">Upload Logo(s)</span>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {availableLogos.map(l => (
                                        <div 
                                            key={l.id} 
                                            onClick={() => setActiveLogoId(l.id)}
                                            className={`p-2 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${activeLogoId === l.id ? 'bg-violet-600/20 border-violet-500' : 'bg-zinc-850/50 border-white/5 hover:border-white/20'}`}
                                        >
                                            <img src={l.base64} className="w-10 h-10 object-contain bg-black/40 rounded p-1" />
                                            <span className="flex-grow text-xs truncate font-medium">{l.name}</span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); toggleLogoVisibility(l.id); }} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400">
                                                    {l.placement.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); removeLogo(l.id); }} className="p-1.5 hover:bg-red-900/40 rounded text-zinc-400 hover:text-red-400">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {activeLogoAsset && (
                            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 flex flex-col gap-6 animate-fade-in">
                                <h3 className="font-bold text-lg text-zinc-100 flex items-center gap-2">
                                    <MousePointer2 size={18} className="text-violet-400" />
                                    Global Settings: {activeLogoAsset.name}
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label htmlFor="scale" className="text-sm font-medium text-zinc-300">Scale</label>
                                            <span className="text-sm font-mono text-violet-400">{activeLogoAsset.placement.scale}%</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="1" max="100" 
                                            value={activeLogoAsset.placement.scale} 
                                            onChange={(e) => updatePlacement(activeLogoAsset.id, { scale: Number(e.target.value) })} 
                                            className="w-full accent-violet-500" 
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label htmlFor="opacity" className="text-sm font-medium text-zinc-300">Opacity</label>
                                            <span className="text-sm font-mono text-violet-400">{activeLogoAsset.placement.opacity}%</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" max="100" 
                                            value={activeLogoAsset.placement.opacity} 
                                            onChange={(e) => updatePlacement(activeLogoAsset.id, { opacity: Number(e.target.value) })} 
                                            className="w-full accent-violet-500" 
                                        />
                                    </div>
                                    <div className="p-3 bg-violet-900/20 border border-violet-500/20 rounded-lg text-xs text-zinc-400">
                                        <p className="font-semibold text-violet-300 mb-1 flex items-center gap-1"><Wand2 size={12}/> Global Application</p>
                                        These settings will apply to every image you have uploaded for this specific logo.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Main Area */}
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
                             <h3 className="font-bold text-lg text-zinc-100 mb-3">2. Target Images</h3>
                             <div {...getTargetRootProps()} className={`cursor-pointer p-8 flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors mb-4 ${isTargetDragActive ? "border-violet-500 bg-violet-500/10" : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"}`}>
                                <input {...getTargetInputProps()} />
                                <UploadCloud className="h-8 w-8 text-zinc-500 mb-2" />
                                <span className="text-zinc-400 font-semibold">Drop images here or click to upload</span>
                            </div>
                            {targetImages.length > 0 && (
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-48 overflow-y-auto pr-2">
                                    {targetImages.map(img => (
                                        <div 
                                            key={img.id} 
                                            onClick={() => setActiveTargetImageId(img.id)}
                                            className={`relative group aspect-square cursor-pointer transition-all ${activeTargetImageId === img.id ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-950 rounded-md scale-95' : 'hover:scale-105'}`}
                                        >
                                            <img src={img.base64} alt="Target" className="w-full h-full object-cover rounded-md" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                                                <button onClick={(e) => removeTargetImage(e, img.id)} className="p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 flex-grow flex flex-col min-h-[400px]">
                             <h3 className="font-bold text-lg text-zinc-100 mb-3 flex items-center justify-between">
                                 Preview & Placement
                                 {previewImage && <span className="text-xs font-normal text-zinc-500">Previewing: {targetImages.find(img => img.id === activeTargetImageId)?.name}</span>}
                             </h3>
                             <div className="flex-grow bg-black rounded-lg relative flex items-center justify-center overflow-hidden border border-white/5 shadow-inner">
                                {previewImage ? (
                                    <div ref={previewContainerRef} className="relative inline-block" style={{lineHeight: 0}}>
                                        <img src={previewImage} alt="Preview" className="max-w-full max-h-[60vh] object-contain block select-none pointer-events-none" />
                                        {availableLogos.map(l => {
                                            const p = l.placement;
                                            if (!p.isVisible) return null;
                                            return (
                                                <div
                                                    key={l.id}
                                                    /* FIX: Ref callback should return void. Wrapping in braces. */
                                                    ref={(el) => { logoRefs.current[l.id] = el; }}
                                                    className={`absolute cursor-move group select-none ${activeLogoId === l.id ? 'ring-2 ring-violet-500 z-20 shadow-xl scale-105' : 'hover:ring-1 hover:ring-white/50 z-10'}`}
                                                    style={{
                                                        top: `${p.y}%`,
                                                        left: `${p.x}%`,
                                                        width: `${p.scale}%`,
                                                        opacity: p.opacity / 100,
                                                        transition: isInteracting ? 'none' : 'all 0.1s ease-out'
                                                    }}
                                                    onMouseDown={(e) => handleInteractionStart(e, 'drag', l.id)}
                                                >
                                                    <img src={l.base64} alt="Logo" className="w-full h-full object-contain pointer-events-none" />
                                                    {activeLogoId === l.id && (
                                                        <div 
                                                            className="absolute -right-2 -bottom-2 w-5 h-5 bg-violet-500 rounded-full border-2 border-zinc-900 cursor-nwse-resize flex items-center justify-center shadow-lg z-30"
                                                            onMouseDown={(e) => handleInteractionStart(e, 'resize', l.id)}
                                                        >
                                                            <Scaling size={12} className="text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-zinc-500 flex flex-col items-center animate-pulse">
                                        <ImageIcon size={48} className="opacity-20 mb-2" />
                                        <p className="mt-2 text-sm">Upload a target image to visualize placements</p>
                                    </div>
                                )}
                             </div>
                        </div>
                        
                        <div className="mt-auto pt-6">
                            <button
                                onClick={processAndDownload}
                                disabled={isProcessing || availableLogos.length === 0 || targetImages.length === 0}
                                className="w-full flex items-center justify-center gap-2 text-white font-semibold text-base py-4 px-6 rounded-lg bg-brand-primary hover:bg-brand-primary-hover disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.01] shadow-button-glow"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" /> : <Download size={18} />}
                                {isProcessing ? `Processing... (${Math.round(processingProgress)}%)` : `Export all ${targetImages.length} Images`}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </main>
    );
};

export default LogoStudio;
