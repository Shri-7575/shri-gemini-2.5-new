import { GoogleGenAI, Type, Modality } from "@google/genai";
import { BACKGROUNDS_LIBRARY, LIGHTING_PRESETS, SHOT_TYPES_LIBRARY, EXPRESSIONS, APERTURES_LIBRARY, FOCAL_LENGTHS_LIBRARY, CAMERA_ANGLES_LIBRARY, COLOR_GRADING_PRESETS } from "../constants";
import type { AspectRatio, ArtDirectorSuggestion, ApparelCategory, AIModel, SceneSuggestion, PhotoshootConcept } from "../types";

const parseDataUrl = (dataUrl: string) => {
    const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (!match) {
        throw new Error("Invalid data URL");
    }
    return {
        mimeType: match[1],
        data: match[2],
    };
};

// Helper to clean JSON response from model
const cleanJsonResponse = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const geminiService = {
  parseDataUrl,

  generateImage: async (prompt: string, aspectRatio: AspectRatio['value']): Promise<string> => {
      // Create a fresh instance right before the call to ensure the latest API key is used
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      // Fallback for missing API key in dev environments
      if (!process.env.API_KEY) {
          console.warn("--- MOCK API CALL: generateImage ---");
          await new Promise(resolve => setTimeout(resolve, 2000));
          // Return a valid placeholder transparent pixel or static base64 to avoid parseDataUrl crashes
          return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      }

      try {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ text: prompt }] },
              config: {
                  imageConfig: {
                      aspectRatio: aspectRatio as any
                  }
              },
          });

          if (response.candidates && response.candidates.length > 0) {
              for (const part of response.candidates[0].content.parts) {
                  if (part.inlineData) {
                      const base64ImageBytes: string = part.inlineData.data;
                      const mimeType = part.inlineData.mimeType;
                      return `data:${mimeType};base64,${base64ImageBytes}`;
                  }
              }
          }
          throw new Error("Gemini 2.5 Flash image generation failed to return an image.");
      } catch (error) {
          console.error("Error generating with Gemini 2.5 Flash:", error);
          throw error;
      }
  },

  generateStyledImage: async (prompt: string, images: string[], aspectRatio: AspectRatio['value'] = '1:1'): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    if (!process.env.API_KEY) { 
        console.warn("--- MOCK API CALL: generateStyledImage ---");
        await new Promise(resolve => setTimeout(resolve, 1500));
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    }

    try {
        const parts: any[] = [{ text: prompt }];
        for (const imageB64 of images) {
            const { mimeType, data } = parseDataUrl(imageB64);
            parts.push({ inlineData: { mimeType, data } });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio as any
                }
            },
        });

        if (response.candidates && response.candidates.length > 0) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType;
                    return `data:${mimeType};base64,${base64ImageBytes}`;
                }
            }
        }
        throw new Error("Styled image generation failed to return an image.");

    } catch (error) {
        console.error("Error generating styled image with Gemini:", error);
        throw error;
    }
  },
  
  analyzeApparel: async (imageB64: string): Promise<{ description: string; category: ApparelCategory }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    if (!process.env.API_KEY) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { description: "Casual Clothing", category: "Uncategorized" };
    }
    try {
        const { mimeType, data } = parseDataUrl(imageB64);
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType, data } },
                    { text: "Analyze this piece of apparel. Provide a short description and its category (Top, Bottom, Full Body, Outerwear, Accessory, Footwear)." }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        category: { type: Type.STRING }
                    },
                    required: ["description", "category"]
                }
            }
        });
        const cleaned = cleanJsonResponse(response.text || "{}");
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to analyze apparel:", e);
        return { description: "", category: "Uncategorized" };
    }
  },

  describeModel: async (imageB64: string): Promise<Pick<AIModel, 'name' | 'description' | 'gender'>> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    if (!process.env.API_KEY) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { name: "Model", description: "A professional model", gender: "Female" };
    }
    const { mimeType, data } = parseDataUrl(imageB64);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType, data } },
                { text: "Provide a creative name, gender, and detailed physical description for the model in this image." }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    gender: { type: Type.STRING, enum: ["Male", "Female"] }
                },
                required: ["name", "description", "gender"]
            }
        }
    });
    const cleaned = cleanJsonResponse(response.text || "{}");
    return JSON.parse(cleaned);
  },

  getArtDirectorSuggestions: async (imageB64: string): Promise<ArtDirectorSuggestion[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    if (!process.env.API_KEY) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return [];
    }
    const { mimeType, data } = parseDataUrl(imageB64);
    
    // Inject library context to ensure valid IDs
    const shotIds = SHOT_TYPES_LIBRARY.map(s => s.id).join(', ');
    const lightingIds = LIGHTING_PRESETS.map(l => l.id).join(', ');
    const bgIds = BACKGROUNDS_LIBRARY.map(b => b.id).join(', ');
    const expIds = EXPRESSIONS.map(e => e.id).join(', ');
    const cgIds = COLOR_GRADING_PRESETS.map(c => c.id).join(', ');
    const apIds = APERTURES_LIBRARY.map(a => a.id).join(', ');
    const flIds = FOCAL_LENGTHS_LIBRARY.map(f => f.id).join(', ');
    const caIds = CAMERA_ANGLES_LIBRARY.map(c => c.id).join(', ');

    const prompt = `As an AI Art Director, analyze this garment and suggest 3 creative photoshoot concepts. 
    You MUST choose IDs from the following strictly controlled lists:
    
    Valid ShotType IDs: ${shotIds}
    Valid Lighting IDs: ${lightingIds}
    Valid Background IDs: ${bgIds}
    Valid Expression IDs: ${expIds}
    Valid ColorGrade IDs: ${cgIds}
    Valid Aperture IDs: ${apIds}
    Valid FocalLength IDs: ${flIds}
    Valid CameraAngle IDs: ${caIds}
    
    Return the response in JSON format.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType, data } },
                { text: prompt }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        conceptName: { type: Type.STRING },
                        shotTypeId: { type: Type.STRING },
                        lightingId: { type: Type.STRING },
                        backgroundId: { type: Type.STRING },
                        expressionId: { type: Type.STRING },
                        apertureId: { type: Type.STRING },
                        focalLengthId: { type: Type.STRING },
                        cameraAngleId: { type: Type.STRING },
                        colorGradeId: { type: Type.STRING },
                        reasoning: { type: Type.STRING },
                        prompt: { type: Type.STRING }
                    },
                    required: ["id", "conceptName", "shotTypeId", "lightingId", "backgroundId", "prompt"]
                }
            }
        }
    });
    
    const cleaned = cleanJsonResponse(response.text || "[]");
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to parse Art Director JSON:", e, response.text);
        return [];
    }
  },

  suggestLayering: async (items: { id: string; description: string; category: string }[]): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    if (!process.env.API_KEY) return items.map(i => i.id);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Given these items: ${JSON.stringify(items)}, what is the correct layering order from innermost to outermost? Return only the ordered array of IDs.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });
    const cleaned = cleanJsonResponse(response.text || "[]");
    return JSON.parse(cleaned);
  },

  removeBackground: async (imageB64: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    if (!process.env.API_KEY) return imageB64;
    const { mimeType, data } = parseDataUrl(imageB64);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType, data } },
                { text: "Remove the background from this product image and return only the product on a transparent background." }
            ]
        }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part?.inlineData ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : imageB64;
  },

  getSceneSuggestions: async (imageB64: string, productName: string): Promise<SceneSuggestion[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    if (!process.env.API_KEY) return [];
    const { mimeType, data } = parseDataUrl(imageB64);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType, data } },
                { text: `Suggest 5 professional, visually distinct scene concepts for staging this ${productName}. Return an array of objects.` }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        conceptName: { type: Type.STRING },
                        sceneDescription: { type: Type.STRING },
                        previewPrompt: { type: Type.STRING }
                    },
                    required: ["conceptName", "sceneDescription", "previewPrompt"]
                }
            }
        }
    });
    const cleaned = cleanJsonResponse(response.text || "[]");
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to parse scene suggestions JSON:", e, response.text);
        return [];
    }
  },

  generateConceptSuggestions: async (imageB64: string): Promise<PhotoshootConcept[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    if (!process.env.API_KEY) return [];
    const { mimeType, data } = parseDataUrl(imageB64);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType, data } },
                { text: "Generate 4 creative photoshoot concept IDs and prompts based on this model image." }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        prompt: { type: Type.STRING }
                    },
                    required: ["id", "name", "description", "prompt"]
                }
            }
        }
    });
    const cleaned = cleanJsonResponse(response.text || "[]");
    return JSON.parse(cleaned);
  },

  generateGenericConcepts: async (imageB64: string): Promise<PhotoshootConcept[]> => {
    return geminiService.generateConceptSuggestions(imageB64);
  },

  isolateGarment: async (imageB64: string): Promise<string> => {
      return geminiService.removeBackground(imageB64);
  },

  nameProduct: async (imageB64: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    if (!process.env.API_KEY) return "Product";
    const { mimeType, data } = parseDataUrl(imageB64);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType, data } },
                { text: "Give this product a professional, commercial name." }
            ]
        }
    });
    return response.text || "Unnamed Product";
  },

  describeImageStyle: async (imageB64: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    if (!process.env.API_KEY) return "Normal studio lighting";
    const { mimeType, data } = parseDataUrl(imageB64);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType, data } },
                { text: "Describe the lighting and photographic style of this image in one detailed sentence." }
            ]
        }
    });
    return response.text || "";
  },

  reverseEngineerPrompt: async (imageB64: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    if (!process.env.API_KEY) return "";
    const { mimeType, data } = parseDataUrl(imageB64);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType, data } },
                { text: "Generate a detailed stable diffusion style prompt that would recreate this exact image." }
            ]
        }
    });
    return response.text || "";
  },

  generatePhotoshootImage: async (baseParts: any[], aspectRatio: AspectRatio['value'], numberOfImages: number, negativePrompt: string | undefined, onImageGenerated: (imageB64: string, index: number) => void): Promise<void> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    if (!process.env.API_KEY) {
        for (let i = 0; i < numberOfImages; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            onImageGenerated("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", i);
        }
        return;
    }
    const promises = Array.from({ length: numberOfImages }).map(async (_, i) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: baseParts },
            config: {
                imageConfig: { aspectRatio: aspectRatio as any }
            }
        });
        const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (part?.inlineData) {
            onImageGenerated(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, i);
        }
    });
    await Promise.all(promises);
  },

  generatePhotoshootVideo: async (prompt: string, aspectRatio: AspectRatio['value'], imageB64: string): Promise<any> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    if (!process.env.API_KEY) return { id: 'mock-op', done: true };
    const { mimeType, data } = parseDataUrl(imageB64);
    return await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: { imageBytes: data, mimeType },
        config: {
            numberOfVideos: 1,
            aspectRatio: aspectRatio === '16:9' ? '16:9' : '9:16',
            resolution: '720p'
        }
    });
  },

  getVideoOperationStatus: async (operation: any): Promise<any> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    if (!process.env.API_KEY) return { ...operation, done: true };
    return await ai.operations.getVideosOperation({ operation });
  },

  fetchVideoAsBlobUrl: async (downloadLink: string): Promise<string> => {
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },

  generativeEdit: async (params: { originalImageB64: string, maskImageB64: string, prompt: string, referenceImages?: string[] }): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    if (!process.env.API_KEY) {
        console.warn("--- MOCK API CALL: generativeEdit ---");
        await new Promise(resolve => setTimeout(resolve, 2000));
        return params.originalImageB64;
    }
    const { mimeType: oMime, data: oData } = parseDataUrl(params.originalImageB64);
    const { mimeType: mMime, data: mData } = parseDataUrl(params.maskImageB64);
    
    const parts: any[] = [
        { inlineData: { mimeType: oMime, data: oData } },
        { inlineData: { mimeType: mMime, data: mData } }
    ];

    if (params.referenceImages && params.referenceImages.length > 0) {
        params.referenceImages.forEach((refB64, index) => {
            const { mimeType, data } = parseDataUrl(refB64);
            parts.push({ text: `REFERENCE ASSET #${index + 1}:` });
            parts.push({ inlineData: { mimeType, data } });
        });
        
        parts.push({ text: `**GENERATIVE EDIT WITH MULTIPLE REFERENCES:**
You are given a BASE IMAGE, a BINARY MASK (where the white area indicates what should be changed), and several REFERENCE ASSETS.
Your task is to photorealistically modify the masked area of the BASE IMAGE according to the user's prompt. 
Crucially, use the visual content from the REFERENCE ASSETS labeled above as the primary source for any objects, garments, or styles being added.
USER INSTRUCTION: "${params.prompt}"` });
    } else {
        parts.push({ text: `**GENERATIVE EDIT TASK:**
You are given a BASE IMAGE and a BINARY MASK (white area is editable). 
Modify only the area defined by the mask according to this instruction: "${params.prompt}"` });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part?.inlineData ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : params.originalImageB64;
  }
};
