import React from 'react';
import { Trash2, Loader2, Scissors } from 'lucide-react';
import { ProductItem } from '../../types';
import { useStudio } from '../../context/StudioContext';

export const ProductItemCard: React.FC<{ item: ProductItem }> = ({ item }) => {
    const { removeProduct, toggleProductCutout, updateProductName } = useStudio();

    const activeImage = item.useCutout && item.cutout ? item.cutout : item.base64;

    return (
        <div className="p-3 bg-zinc-850 rounded-lg flex flex-col gap-3 border border-white/5 hover:border-white/10 hover:bg-zinc-800 transition-all duration-200 shadow-inner-soft">
            <div className="flex items-start gap-4">
                <div className="relative group w-16 h-16 flex-shrink-0 bg-zinc-900 rounded-md border border-white/10 overflow-hidden">
                    <img src={activeImage} alt={item.name} className="w-full h-full object-contain" />
                    {item.isRemovingBackground && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <Loader2 className="animate-spin text-white w-6 h-6" />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex flex-col w-full pr-2">
                            <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateProductName(item.id, e.target.value)}
                                className="bg-transparent border-none p-0 text-sm font-semibold text-zinc-200 focus:ring-0 placeholder-zinc-500 w-full focus:border-b focus:border-violet-500 transition-colors"
                                placeholder="Product Name"
                            />
                            <div className="flex items-center gap-2 mt-2">
                                {item.cutout && (
                                    <button 
                                        onClick={() => toggleProductCutout(item.id)}
                                        className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1 transition-colors ${item.useCutout ? 'bg-violet-500/20 border-violet-500/50 text-violet-200 hover:bg-violet-500/30' : 'bg-zinc-700 border-zinc-600 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-300'}`}
                                        title={item.useCutout ? "Using Cutout" : "Using Original"}
                                    >
                                        <Scissors size={10} />
                                        {item.useCutout ? 'Cutout Active' : 'Use Original'}
                                    </button>
                                )}
                                {item.isNaming && <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> AI Analyzing...</span>}
                            </div>
                        </div>
                        <button 
                            onClick={() => removeProduct(item.id)} 
                            className="p-1 -m-1 text-zinc-500 hover:text-red-400 transition-colors"
                            title="Remove Product"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
