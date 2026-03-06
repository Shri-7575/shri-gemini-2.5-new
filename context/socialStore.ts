import { geminiService } from '../services/geminiService';
import type { StudioStoreSlice } from './StudioContext';
import type { SocialStudioState, SocialTemplateId, GeneratedSocialPost, SocialRatio } from '../types';
import { withRetry } from '../utils/colorUtils';
import { GoogleGenAI } from "@google/genai";

export const SOCIAL_TEMPLATES = {
    launch: {
        id: 'launch',
        name: 'Product Launch',
        description: 'Premium, high-end catalog feel for new releases.',
        visualPrompt: 'HYPER-REALISTIC COMMERCIAL PHOTOGRAPHY: A high-end luxury product launch shot. The subject is perfectly centered. Use complex studio lighting with soft-box rim lights and sharp key lights. Razor-sharp focus, 85mm prime lens aesthetic. Include subtle global illumination and realistic contact shadows on a clean minimalist surface. The atmosphere is pristine, sophisticated, and high-fidelity.',
        captionPrompt: 'Write a viral Instagram, TikTok, and Twitter caption for a new premium product launch. Focus on excitement, exclusivity, and quality.'
    },
    lifestyle: {
        id: 'lifestyle',
        name: 'Lifestyle',
        description: 'Natural, real-world setting for authentic engagement.',
        visualPrompt: 'URBAN LIFESTYLE PHOTOGRAPHY: A candid, high-end "in-the-wild" shot. The subject is seamlessly integrated into a trendy, sun-drenched modern environment (like a high-end cafe or city plaza). Use natural bokeh (f/1.8), warm natural light spills, and authentic color grading. Ensure the subject reflects the surrounding light colors. No artificial studio feel; purely organic and realistic.',
        captionPrompt: 'Write relatable, authentic lifestyle captions for Instagram, TikTok, and Twitter. Focus on how the product fits into daily life.'
    },
    promo: {
        id: 'promo',
        name: 'Flash Sale',
        description: 'Vibrant, bold colors designed to stop the scroll.',
        visualPrompt: 'DYNAMIC ADVERTISING STILL: A bold, vibrant promotional shot. Use high-contrast "pop" colors and energetic composition. Professional high-key lighting with saturated accents. Sharp focus across the entire frame. Visual elements must feel solid and real, not flat. Professional color science applied.',
        captionPrompt: 'Write high-energy, urgent promotional captions. Use scarcity and excitement to drive sales for a limited time offer.'
    },
    minimal: {
        id: 'minimal',
        name: 'Minimalist',
        description: 'Soft, clean, and modern "Pinterest" aesthetic.',
        visualPrompt: 'AESTHETIC MINIMALIST STILL: Soft, diffused morning light. High-key, airy atmosphere with significant negative space. Neutral tones and soft organic shadows. Shot with a 50mm lens for a natural perspective. The subject feels integrated into a zen-like, clean environment. Extremely high-quality texture rendering.',
        captionPrompt: 'Write short, poetic, and minimalist captions. Focus on peace, simplicity, and aesthetic pleasure.'
    },
    editorial: {
        id: 'editorial',
        name: 'Editorial Story',
        description: 'Cinematic, high-fashion storytelling.',
        visualPrompt: 'CINEMATIC FASHION EDITORIAL: A narrative-driven cinematic shot. Use moody, creative lighting (chiaroscuro) with colored rim lights or dappled shadows. High-fashion camera angles, subtle film grain, and sophisticated storytelling. The subject is the hero of a high-end campaign. Perfect skin/material textures and deep dynamic range.',
        captionPrompt: 'Write evocative, storytelling captions. Use high-fashion vocabulary and focus on the mood and narrative of the image.'
    },
    custom: {
        id: 'custom',
        name: 'Custom concept',
        description: 'Write your own specific vision for the post.',
        visualPrompt: '',
        captionPrompt: 'Write viral social media captions for a product post based on this context:'
    },
    copy: {
        id: 'copy',
        name: 'Copy Post',
        description: 'Upload an inspiration image to copy its style.',
        visualPrompt: 'PHOTOREALISTIC CONTEXT TRANSFER: You are a world-class digital compositor. Take the subject from Image 1 and integrate it into the EXACT environment of Image 2. CRITICAL: Analyze and match the light color temperature, intensity, and direction from Image 2. Apply realistic shadows, ambient occlusion, and reflections so the subject appears physically present in the scene. If Image 2 features a person, realistically drape the apparel from Image 1 onto their body with correct physics, folds, and perspective. DISCARD all lighting and background data from Image 1. Result must be indistinguishable from a real photograph.',
        captionPrompt: 'Write viral social media captions that perfectly match the high-end aesthetic and mood of this specific post.'
    }
} as const;

export interface SocialActions {
    setSocialSourceImage: (base64: string | null) => void;
    setSocialInspirationImage: (base64: string | null) => void;
    setSocialTemplate: (id: SocialTemplateId) => void;
    setSocialRatio: (ratio: SocialRatio) => void;
    setCustomSocialPrompt: (prompt: string) => void;
    setSocialTone: (tone: SocialStudioState['socialTone']) => void;
    generateSocialPosts: () => Promise<void>;
    resetSocialStudio: () => void;
    setSocialEditing: (isEditing: boolean) => void;
    applySocialGenerativeEdit: (maskB64: string, prompt: string) => Promise<void>;
}

export type SocialSlice = SocialStudioState & SocialActions;

export const createSocialSlice: StudioStoreSlice<SocialSlice> = (set, get) => ({
    socialSourceImage: null,
    socialInspirationImage: null,
    activeSocialTemplate: 'launch',
    selectedSocialRatio: '1:1',
    customSocialPrompt: '',
    socialTone: 'excited',
    isSocialGenerating: false,
    isSocialEditing: false,
    isSocialApplyingEdit: false,
    generatedSocialPosts: [],
    socialCaptions: null,

    setSocialSourceImage: (base64) => set({ 
        socialSourceImage: base64, 
        generatedSocialPosts: [], 
        socialCaptions: null,
        error: null 
    }),

    setSocialInspirationImage: (base64) => set({
        socialInspirationImage: base64,
        error: null
    }),

    setSocialTemplate: (id) => set({ activeSocialTemplate: id }),
    
    setSocialRatio: (ratio) => set({ selectedSocialRatio: ratio }),

    setCustomSocialPrompt: (prompt) => set({ customSocialPrompt: prompt }),

    setSocialTone: (tone) => set({ socialTone: tone }),

    setSocialEditing: (isEditing) => set({ isSocialEditing: isEditing }),

    applySocialGenerativeEdit: async (maskB64, prompt) => {
        const { generatedSocialPosts } = get();
        if (generatedSocialPosts.length === 0) return;

        set({ isSocialApplyingEdit: true, error: null });
        try {
            const originalUrl = generatedSocialPosts[0].url;
            const resultUrl = await withRetry(() => geminiService.generativeEdit({
                originalImageB64: originalUrl,
                maskImageB64: maskB64,
                prompt: `Refine this image with photographic realism: ${prompt}. Ensure perfect lighting integration and high-fidelity textures.`,
            }));

            set(state => ({
                generatedSocialPosts: [{ ...state.generatedSocialPosts[0], url: resultUrl }],
                isSocialEditing: false
            }));
        } catch (e: any) {
            console.error("Social edit failed:", e);
            set({ error: e.message || "Failed to apply edit." });
        } finally {
            set({ isSocialApplyingEdit: false });
        }
    },

    generateSocialPosts: async () => {
        const { 
            socialSourceImage, 
            socialInspirationImage,
            activeSocialTemplate, 
            customSocialPrompt,
            selectedSocialRatio,
            socialTone 
        } = get();

        if (!socialSourceImage) return;
        if (activeSocialTemplate === 'copy' && !socialInspirationImage) {
            set({ error: "Please upload an inspiration image to copy the post style." });
            return;
        }

        set({ isSocialGenerating: true, error: null, generatedSocialPosts: [], socialCaptions: null });

        const template = SOCIAL_TEMPLATES[activeSocialTemplate];
        
        try {
            const inputImages = [socialSourceImage];
            if (activeSocialTemplate === 'copy' && socialInspirationImage) {
                inputImages.push(socialInspirationImage);
            }

            const finalVisualPrompt = activeSocialTemplate === 'custom' ? customSocialPrompt : template.visualPrompt;
            const modelRatio = selectedSocialRatio === '4:5' ? '3:4' : selectedSocialRatio;
            
            const resultUrl = await withRetry(() => geminiService.generateStyledImage(
                finalVisualPrompt, 
                inputImages, 
                modelRatio as any
            ));

            const captionPromise = (async () => {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                const { mimeType, data } = geminiService.parseDataUrl(resultUrl);
                
                const promptParts: any[] = [
                    { inlineData: { mimeType, data } },
                    { text: `Analyze this social media asset. It uses a ${activeSocialTemplate} style. Create viral captions. The tone should be ${socialTone}. Return JSON with instagram, tiktok, twitter keys.` }
                ];

                const result = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    // FIX: Changed contents from array to object structure
                    contents: { parts: promptParts },
                    config: { responseMimeType: "application/json" }
                });
                return JSON.parse(result.text || "{}");
            })();

            const captions = await captionPromise;
            
            set({ 
                generatedSocialPosts: [{ id: Math.random().toString(), ratio: selectedSocialRatio, url: resultUrl }], 
                socialCaptions: captions 
            });

        } catch (e: any) {
            console.error("Social generation failed:", e);
            set({ error: e.message || "Failed to generate social media assets." });
        } finally {
            set({ isSocialGenerating: false });
        }
    },

    resetSocialStudio: () => set({ 
        socialSourceImage: null, 
        socialInspirationImage: null,
        generatedSocialPosts: [], 
        socialCaptions: null, 
        activeSocialTemplate: 'launch',
        customSocialPrompt: '',
        isSocialEditing: false,
        isSocialApplyingEdit: false,
        error: null 
    }),
});
