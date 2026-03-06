
import { geminiService } from '../services/geminiService';
import type { StudioStoreSlice } from './StudioContext';
import { withRetry } from '../utils/colorUtils';

export interface EditStudioState {
  editSourceImage: string | null;
  editResultImage: string | null;
  editReferenceAssets: string[];
  isEditProcessing: boolean;
}

export interface EditStudioActions {
  setEditSourceImage: (base64: string | null) => void;
  addEditReferenceAsset: (base64: string) => void;
  removeEditReferenceAsset: (index: number) => void;
  applyEditStudioChange: (maskB64: string, prompt: string) => Promise<void>;
  resetEditStudio: () => void;
}

export type EditStudioSlice = EditStudioState & EditStudioActions;

export const createEditStudioSlice: StudioStoreSlice<EditStudioSlice> = (set, get) => ({
  editSourceImage: null,
  editResultImage: null,
  editReferenceAssets: [],
  isEditProcessing: false,

  setEditSourceImage: (base64) => set({ 
    editSourceImage: base64, 
    editResultImage: null,
    editReferenceAssets: [],
    error: null 
  }),

  addEditReferenceAsset: (base64) => set(state => ({
    editReferenceAssets: [...state.editReferenceAssets, base64]
  })),

  removeEditReferenceAsset: (index) => set(state => ({
    editReferenceAssets: state.editReferenceAssets.filter((_, i) => i !== index)
  })),

  applyEditStudioChange: async (maskB64, prompt) => {
    const { editSourceImage, editResultImage, editReferenceAssets } = get();
    const activeImage = editResultImage || editSourceImage;
    if (!activeImage) return;

    set({ isEditProcessing: true, error: null });
    try {
      const result = await withRetry(() => geminiService.generativeEdit({
        originalImageB64: activeImage,
        maskImageB64: maskB64,
        prompt: prompt,
        referenceImages: editReferenceAssets
      }));
      set({ editResultImage: result });
    } catch (e: any) {
      set({ error: e.message || "Editing failed." });
    } finally {
      set({ isEditProcessing: false });
    }
  },

  resetEditStudio: () => set({ 
    editSourceImage: null, 
    editResultImage: null, 
    editReferenceAssets: [],
    error: null, 
    isEditProcessing: false 
  }),
});
