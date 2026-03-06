
import type { PhotoshootConcept } from '../types';
import { geminiService } from '../services/geminiService';
import type { StudioStoreSlice } from './StudioContext';
import { withRetry } from '../utils/colorUtils';

export interface LiteStudioState {
  liteSourceImage: string | null;
  liteConcepts: PhotoshootConcept[];
  isLiteAnalyzing: boolean;
  isLiteGenerating: boolean;
  liteGeneratedImage: string | null;
  isLiteApplyingEdit: boolean;
}

export interface LiteStudioActions {
  setLiteSourceImage: (base64: string | null) => void;
  generateLiteConcepts: () => Promise<void>;
  generateLiteImage: (concept: PhotoshootConcept) => Promise<void>;
  liteApplyGenerativeEdit: (maskB64: string, prompt: string) => Promise<void>;
  resetLiteStudio: () => void;
}

export type LiteStudioSlice = LiteStudioState & LiteStudioActions;

export const createLiteStudioSlice: StudioStoreSlice<LiteStudioSlice> = (set, get) => ({
  liteSourceImage: null,
  liteConcepts: [],
  isLiteAnalyzing: false,
  isLiteGenerating: false,
  liteGeneratedImage: null,
  isLiteApplyingEdit: false,

  setLiteSourceImage: (base64) => set({ 
    liteSourceImage: base64, 
    liteConcepts: [], 
    liteGeneratedImage: null,
    uploadedModelImage: null,
    selectedModels: [],
    apparel: [],
    products: [],
    mockupImage: null,
    designImage: null,
  }),

  generateLiteConcepts: async () => {
    const { liteSourceImage } = get();
    if (!liteSourceImage) return;
    set({ isLiteAnalyzing: true, error: null, liteConcepts: [] });
    try {
      const concepts = await withRetry(() => geminiService.generateGenericConcepts(liteSourceImage));
      set({ liteConcepts: concepts });
    } catch (e: any) {
      set({ error: e.message || "Failed to analyze image." });
    } finally {
      set({ isLiteAnalyzing: false });
    }
  },

  generateLiteImage: async (concept) => {
    const { liteSourceImage } = get();
    if (!liteSourceImage) return;
    set({ isLiteGenerating: true, error: null, liteGeneratedImage: null });
    try {
      const result = await withRetry(() => geminiService.generateStyledImage(concept.prompt, [liteSourceImage]));
      set({ liteGeneratedImage: result });
    } catch (e: any) {
      set({ error: e.message || "Failed to generate image." });
    } finally {
      set({ isLiteGenerating: false });
    }
  },

  liteApplyGenerativeEdit: async (maskB64, prompt) => {
    const { liteGeneratedImage } = get();
    if (!liteGeneratedImage) return;

    set({ isLiteApplyingEdit: true, error: null });
    try {
      const result = await withRetry(() => geminiService.generativeEdit({
        originalImageB64: liteGeneratedImage,
        maskImageB64: maskB64,
        prompt: prompt,
      }));
      set({ liteGeneratedImage: result });
    } catch (e: any) {
      set({ error: e.message || "Editing failed." });
    } finally {
      set({ isLiteApplyingEdit: false });
    }
  },

  resetLiteStudio: () => set({ liteSourceImage: null, liteConcepts: [], liteGeneratedImage: null, error: null, isLiteApplyingEdit: false }),
});
