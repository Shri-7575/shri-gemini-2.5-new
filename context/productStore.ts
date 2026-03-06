import type { ProductCreativeControls, ProductEcommercePack, ProductSceneTemplate, StagedAsset, SceneSuggestion, ProductItem } from '../types';
import { APERTURES_LIBRARY, CAMERA_ANGLES_LIBRARY_PRODUCT, COLOR_GRADING_PRESETS, FOCAL_LENGTHS_LIBRARY, LIGHTING_DIRECTIONS_LIBRARY, LIGHT_QUALITIES_LIBRARY, CATCHLIGHT_STYLES_LIBRARY, SURFACE_LIBRARY, PRODUCT_MATERIAL_LIBRARY, THEMED_SCENE_TEMPLATES, SHOT_TYPES_LIBRARY, EXPRESSIONS, PRODUCT_INTERACTION_LIBRARY } from '../constants';
import { geminiService } from '../services/geminiService';
import type { StudioStoreSlice } from './StudioContext';
import { getDominantColor } from '../utils/colorExtractor';
import { getComplementaryColor, withRetry } from '../utils/colorUtils';

export interface ProductState {
  products: ProductItem[];
  productControls: ProductCreativeControls;
  isSuggestingScenes: boolean;
  sceneSuggestions: SceneSuggestion[];
  stagedAssets: StagedAsset[];
  suggestedBackgroundColor: string | null;
  sceneTemplates: ProductSceneTemplate[];
  productEcommercePack: ProductEcommercePack;
}

export interface ProductActions {
  addProduct: (base64: string) => Promise<void>;
  removeProduct: (id: string) => void;
  reorderProducts: (dragIndex: number, hoverIndex: number) => void;
  updateProductName: (id: string, name: string) => void;
  toggleProductCutout: (id: string) => void;
  updateProductControl: <K extends keyof ProductCreativeControls>(key: K, value: ProductCreativeControls[K]) => void;
  fetchSceneSuggestions: () => Promise<void>;
  addCompanionAsset: (base64: string) => void;
  removeCompanionAsset: (id: string) => void;
  updateStagedAsset: (id: string, partialAsset: Partial<StagedAsset>) => void;
  saveSceneTemplate: (name: string) => void;
  applySceneTemplate: (id: string) => void;
  deleteSceneTemplate: (id: string) => void;
  setProductEcommercePack: (pack: ProductEcommercePack) => void;
}

export type ProductSlice = ProductState & ProductActions;

const baseControls = {
    aperture: APERTURES_LIBRARY[0],
    focalLength: FOCAL_LENGTHS_LIBRARY[1],
    lightingDirection: LIGHTING_DIRECTIONS_LIBRARY[0],
    lightQuality: LIGHT_QUALITIES_LIBRARY[0],
    catchlightStyle: CATCHLIGHT_STYLES_LIBRARY[0],
    colorGrade: COLOR_GRADING_PRESETS[0],
    negativePrompt: 'deformed, disfigured, poor quality, bad anatomy, extra limbs, blurry, text, watermark, logo',
    isHyperRealismEnabled: true,
    cinematicLook: false,
    styleStrength: 75,
    customPrompt: '',
};

const initialProductState: ProductState = {
  products: [],
  productControls: {
    ...baseControls,
    cameraAngle: CAMERA_ANGLES_LIBRARY_PRODUCT[0],
    productShadow: 'Soft',
    customProps: '',
    surface: SURFACE_LIBRARY[0],
    productMaterial: PRODUCT_MATERIAL_LIBRARY[0],
    // On-model controls
    shotType: SHOT_TYPES_LIBRARY[0],
    expression: EXPRESSIONS[0],
    modelInteractionType: PRODUCT_INTERACTION_LIBRARY[0],
    customModelInteraction: '',
  },
  isSuggestingScenes: false,
  sceneSuggestions: [],
  stagedAssets: [],
  suggestedBackgroundColor: null,
  sceneTemplates: [],
  productEcommercePack: 'none',
};

export const createProductSlice: StudioStoreSlice<ProductSlice> = (set, get) => ({
  ...initialProductState,

  addProduct: async (base64) => {
    const newId = `prod_${Date.now()}`;
    const newProduct: ProductItem = {
        id: newId,
        base64,
        cutout: null,
        name: '',
        isRemovingBackground: true,
        isNaming: true,
        useCutout: true,
    };

    set(state => ({
        products: [...state.products, newProduct],
        // Reset scene suggestions when products change
        sceneSuggestions: [],
        suggestedBackgroundColor: null,
        error: null,
    }));

    // Clear other mode inputs
    const isProductMode = get().studioMode === 'product';
    set({
        ...(isProductMode ? {} : { 
            uploadedModelImage: null,
            selectedModels: [],
            promptedModelDescription: '',
        }),
        apparel: [],
        artDirectorSuggestions: null,
        mockupImage: null,
        designImage: null,
    });

    // 1. Suggest background color based on first product or updated logic
    try {
        const dominantColor = await getDominantColor(base64);
        const complementary = getComplementaryColor(dominantColor);
        set({ suggestedBackgroundColor: complementary });
    } catch(e) {
        console.error("Could not suggest background color:", e);
    }

    // 2. Perform Background Removal
    try {
        const cutoutB64 = await withRetry(() => geminiService.removeBackground(base64));
        
        set(state => {
            const updatedProducts = state.products.map(p => p.id === newId ? { ...p, cutout: cutoutB64, isRemovingBackground: false } : p);
            
            // Add to stagedAssets once we have the cutout (or fallback)
            const initialAsset: StagedAsset = { 
                id: newId, 
                base64: cutoutB64, 
                x: 50, 
                y: 50, 
                z: state.stagedAssets.length + 1, 
                scale: 50 
            };
            
            return { 
                products: updatedProducts,
                stagedAssets: [...state.stagedAssets, initialAsset]
            };
        });
    } catch (e) {
        console.error("Failed to remove background:", e);
        set(state => {
            // Fallback to original
            const updatedProducts = state.products.map(p => p.id === newId ? { ...p, isRemovingBackground: false, useCutout: false } : p);
            const initialAsset: StagedAsset = { 
                id: newId, 
                base64: base64, 
                x: 50, 
                y: 50, 
                z: state.stagedAssets.length + 1, 
                scale: 50 
            };
            return {
                products: updatedProducts,
                stagedAssets: [...state.stagedAssets, initialAsset]
            }
        });
    }

    // 3. Name the product
    try {
        const name = await withRetry(() => geminiService.nameProduct(base64));
        set(state => ({
            products: state.products.map(p => p.id === newId ? { ...p, name: name, isNaming: false } : p)
        }));
    } catch (e) {
        console.error("Could not name product:", e);
        set(state => ({
            products: state.products.map(p => p.id === newId ? { ...p, isNaming: false } : p)
        }));
    }
  },

  removeProduct: (id) => {
      set(state => ({
          products: state.products.filter(p => p.id !== id),
          stagedAssets: state.stagedAssets.filter(a => a.id !== id) // Remove from canvas too
      }));
  },

  reorderProducts: (dragIndex, hoverIndex) => {
    set(state => {
      const newProducts = [...state.products];
      const draggedItem = newProducts[dragIndex];
      newProducts.splice(dragIndex, 1);
      newProducts.splice(hoverIndex, 0, draggedItem);
      return { products: newProducts };
    });
  },

  updateProductName: (id, name) => {
      set(state => ({
          products: state.products.map(p => p.id === id ? { ...p, name } : p)
      }));
  },

  toggleProductCutout: (id) => {
      set(state => {
          const product = state.products.find(p => p.id === id);
          if (!product) return {};

          const newUseCutout = !product.useCutout;
          const imageToUse = newUseCutout && product.cutout ? product.cutout : product.base64;

          const updatedProducts = state.products.map(p => p.id === id ? { ...p, useCutout: newUseCutout } : p);
          const updatedStagedAssets = state.stagedAssets.map(a => a.id === id ? { ...a, base64: imageToUse } : a);

          return { products: updatedProducts, stagedAssets: updatedStagedAssets };
      });
  },

  updateProductControl: (key, value) => {
      set(state => ({ productControls: { ...state.productControls, [key]: value } }));
  },

  fetchSceneSuggestions: async () => {
      const { products } = get();
      // Use the first product for suggestion analysis
      const mainProduct = products[0];

      if (!mainProduct) {
          set({ error: "Upload a product image to get suggestions." });
          return;
      }

      const imageToAnalyze = mainProduct.useCutout && mainProduct.cutout ? mainProduct.cutout : mainProduct.base64;

      set({ isSuggestingScenes: true, error: null, sceneSuggestions: [] });
      try {
          const suggestions = await withRetry(() => geminiService.getSceneSuggestions(imageToAnalyze, mainProduct.name || "the product"));
          set({ sceneSuggestions: suggestions.map(s => ({ ...s, previewImageB64: null })) });

          suggestions.forEach(async (suggestion, index) => {
              try {
                  const preview = await withRetry(() => geminiService.generateImage(suggestion.previewPrompt, '1:1'));
                  set(state => {
                      const newSuggestions = [...state.sceneSuggestions];
                      if (newSuggestions[index]) {
                          newSuggestions[index].previewImageB64 = preview;
                      }
                      return { sceneSuggestions: newSuggestions };
                  });
              } catch (e) {
                  console.error(`Failed to generate preview for suggestion ${index}:`, e);
              }
          });

      } catch (e) {
          console.error("Failed to fetch scene suggestions:", e);
          set({ error: "Could not get AI scene suggestions." });
      } finally {
          set({ isSuggestingScenes: false });
      }
  },
  
  addCompanionAsset: (base64) => {
    const newId = `companion_${Date.now()}`;
    const newAsset: StagedAsset = { id: newId, base64, x: 25, y: 25, z: get().stagedAssets.length + 1, scale: 30 };
    set(state => ({ stagedAssets: [...state.stagedAssets, newAsset] }));
  },
  
  removeCompanionAsset: (id) => set(state => ({ stagedAssets: state.stagedAssets.filter(asset => asset.id !== id) })),
  
  updateStagedAsset: (id, partialAsset) => {
    set(state => ({
        stagedAssets: state.stagedAssets.map(asset => 
            asset.id === id ? { ...asset, ...partialAsset } : asset
        )
    }));
  },

  saveSceneTemplate: (name) => {
    if (!name.trim()) return;
    const { scene, productControls, stagedAssets } = get();
    const newTemplate: ProductSceneTemplate = {
      id: `template_${Date.now()}`,
      name: name.trim(),
      description: 'A custom saved scene template',
      scene: { ...scene },
      controls: { ...productControls },
      stagedAssets: [...stagedAssets],
    };
    set(state => ({
      sceneTemplates: [...state.sceneTemplates, newTemplate]
    }));
  },

  applySceneTemplate: (id) => {
    const template = get().sceneTemplates.find(t => t.id === id) || THEMED_SCENE_TEMPLATES.find(t => t.id === id);
    if (template) {
      get().updateScene(template.scene);
      set(state => ({
        productControls: { ...state.productControls, ...template.controls },
        stagedAssets: template.stagedAssets || state.stagedAssets,
      }));
    }
  },

  deleteSceneTemplate: (id) => {
    set(state => ({
      sceneTemplates: state.sceneTemplates.filter(t => t.id !== id)
    }));
  },

  setProductEcommercePack: (pack) => set({ productEcommercePack: pack }),
});