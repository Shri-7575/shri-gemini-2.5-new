import React from 'react';
import { Wand2, Zap, ExternalLink } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';

export const EmptyState: React.FC = () => {
    const { studioMode, setStudioMode } = useStudio();
    
    const message = studioMode === 'apparel'
  ? <>Your generated images will appear here. Begin by adding a model and apparel in the left panel. This app is managed by Sahil Sangani. To create your own personalised app like this, email me at <a href="mailto:sahil@gptwala.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">Sahil@gptwala.com</a>.</>
  : studioMode === 'product'
  ? <>Your generated product photos will appear here. Begin by uploading a product in the left panel. This app is managed by Sahil Sangani. To create your own personalised app like this, email me at <a href="mailto:sahil@gptwala.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">Sahil@gptwala.com</a>.</>
  : <>Your generated mockups will appear here. Begin by uploading a mockup and a design in the left panel. This app is managed by Sahil Sangani. To create your own personalised app like this, email me at <a href="mailto:sahil@gptwala.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">Sahil@gptwala.com</a>.</>;

    const title = studioMode === 'apparel' 
        ? "Virtual Studio Canvas" 
        : studioMode === 'product'
        ? "Product Stage Canvas"
        : "Design Canvas";

    return (
        <div className="flex flex-col items-center justify-center text-center text-zinc-500 p-8 animate-fade-in max-w-xl mx-auto">
            {/* Masterclass Section */}
            <div className="mb-8 flex flex-col items-center gap-4 p-5 rounded-2xl bg-violet-600/5 border border-violet-500/20 shadow-glow-sm">
                <div className="space-y-1">
                    <p className="text-sm font-bold text-zinc-100">Want to do your dream photoshoot?</p>
                    <p className="text-xs text-zinc-400">I am teaching in the below masterclass.</p>
                </div>
                <a 
                    href="https://learn.gptwala.com/aiphotoshoots" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-black uppercase tracking-[0.1em] transition-all shadow-button-glow hover:scale-105 active:scale-95 group"
                >
                    <Zap size={14} className="text-yellow-400 fill-yellow-400 group-hover:animate-pulse" />
                    Register now
                    <ExternalLink size={12} className="opacity-50" />
                </a>
            </div>

            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-zinc-900/80 border border-white/10 mb-6 animate-float shadow-2xl shadow-black">
                <div className="absolute inset-0 rounded-full bg-aurora opacity-60 animate-pulse-slow"></div>
                <Wand2 size={32} className="text-violet-300" style={{ filter: 'drop-shadow(0 0 8px rgba(167, 139, 250, 0.5))' }} />
            </div>
            
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">{title}</h3>
            <p className="text-sm mt-3 max-w-sm text-zinc-400 leading-relaxed">{message}</p>
            
            {studioMode === 'apparel' && (
                <button 
                    onClick={() => setStudioMode('lite-studio')}
                    className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 font-bold text-[10px] uppercase tracking-[0.15em] transition-all shadow-lg hover:scale-105 active:scale-95 group"
                >
                    <Zap size={14} className="text-yellow-400 fill-yellow-400" />
                    Basic Version
                </button>
            )}
        </div>
    );
};