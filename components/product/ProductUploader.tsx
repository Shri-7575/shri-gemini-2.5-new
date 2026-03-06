import React, { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Package } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { ProductItemCard } from './ProductItemCard';

export const ProductUploader: React.FC = () => {
    const { 
        addProduct,
        products,
        reorderProducts,
    } = useStudio();

    const dragIndex = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        acceptedFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event: ProgressEvent<FileReader>) => {
                if (event.target?.result) {
                    addProduct(event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        });
    }, [addProduct]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
    });

    const handleDragStart = (index: number) => {
        dragIndex.current = index;
    };
    
    const handleDragEnter = (index: number) => {
        setDragOverIndex(index);
    };

    const handleDragEnd = () => {
        if (dragIndex.current !== null && dragOverIndex !== null && dragIndex.current !== dragOverIndex) {
            reorderProducts(dragIndex.current, dragOverIndex);
        }
        dragIndex.current = null;
        setDragOverIndex(null);
    };

    return (
        <div className="h-full flex flex-col">
            <div {...getRootProps()} className={`flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all duration-200 mb-4 ${isDragActive ? 'border-violet-500 bg-violet-500/10 shadow-glow-md' : 'border-zinc-700 hover:border-zinc-600'}`}>
                <input {...getInputProps()} />
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragActive ? 'bg-violet-500/20' : 'bg-zinc-800'}`}>
                    <Package className={`transition-colors ${isDragActive ? 'text-violet-300' : 'text-zinc-400'}`} size={32} />
                </div>
                <p className="text-zinc-100 font-semibold text-center">
                    {isDragActive ? "Drop product images here" : "Upload Products"}
                </p>
                <p className="text-sm text-zinc-400 mt-1">Drag 'n' drop one or more items</p>
            </div>

            <div 
                className="flex-grow overflow-y-auto space-y-3 pr-1"
                onDragLeave={() => setDragOverIndex(null)}
            >
               {products.map((item, index) => (
                   <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        className={`transition-opacity ${dragIndex.current === index ? 'opacity-50' : ''}`}
                   >
                       <ProductItemCard item={item} />
                   </div>
               ))}
               {products.length === 0 && (
                   <div className="text-center text-zinc-500 text-sm py-4">
                       No products uploaded yet.
                   </div>
               )}
            </div>
        </div>
    );
};