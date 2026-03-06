import { GoogleGenAI, Part } from "@google/genai";
import type { ChatMessage, ChatSession } from '../types';
import type { StudioStoreSlice } from './StudioContext';
import { geminiService } from '../services/geminiService';
import { withRetry } from '../utils/colorUtils';

export interface ChatState {
  chats: Record<string, ChatSession>;
  activeChatId: string | null;
  chatAssets: string[];
  isChatting: boolean;
  reverseEngineerImage: string | null;
  generatedPrompt: string | null;
  isGeneratingPrompt: boolean;
}

export interface ChatActions {
  setReverseEngineerImage: (base64: string | null) => void;
  generateReverseEngineeredPrompt: () => Promise<void>;
  sendMessage: (message: string, imageBase64?: string | null) => Promise<void>;
  startNewChat: () => void;
  setActiveChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  clearReverseEngineer: () => void;
}

export type ChatSlice = ChatState & ChatActions;

const initialChatState: ChatState = {
  chats: {},
  activeChatId: null,
  chatAssets: [],
  isChatting: false,
  reverseEngineerImage: null,
  generatedPrompt: null,
  isGeneratingPrompt: false,
};

export const createChatSlice: StudioStoreSlice<ChatSlice> = (set, get) => ({
  ...initialChatState,

  setReverseEngineerImage: (base64) => {
    set({ reverseEngineerImage: base64, generatedPrompt: null, error: null });
  },
  
  clearReverseEngineer: () => {
      set({ reverseEngineerImage: null, generatedPrompt: null, error: null });
  },

  generateReverseEngineeredPrompt: async () => {
    const { reverseEngineerImage } = get();
    if (!reverseEngineerImage) return;

    set({ isGeneratingPrompt: true, error: null, generatedPrompt: '' });
    try {
      const prompt = await withRetry(() => geminiService.reverseEngineerPrompt(reverseEngineerImage));
      set({ generatedPrompt: prompt });
    } catch (e: any) {
      console.error("Failed to generate prompt:", e);
      set({ error: e.message || "Could not generate a prompt from this image." });
    } finally {
      set({ isGeneratingPrompt: false });
    }
  },
  
  startNewChat: () => {
    const newChatId = `chat_${Date.now()}`;
    const newChat: ChatSession = {
      id: newChatId,
      title: 'New Chat',
      history: [],
      createdAt: Date.now(),
    };
    set(state => ({
      chats: { ...state.chats, [newChatId]: newChat },
      activeChatId: newChatId,
    }));
  },

  setActiveChat: (chatId) => {
    if (get().chats[chatId]) {
      set({ activeChatId: chatId });
    }
  },

  deleteChat: (chatId) => {
    set(state => {
      const newChats = { ...state.chats };
      delete newChats[chatId];
      const newActiveChatId = state.activeChatId === chatId ? null : state.activeChatId;
      return { chats: newChats, activeChatId: newActiveChatId };
    });
  },

  sendMessage: async (message, imageBase64) => {
    if (!message.trim() && !imageBase64) return;

    let currentChatId = get().activeChatId;
    if (!currentChatId) {
        get().startNewChat();
        currentChatId = get().activeChatId;
    }
    if (!currentChatId) return;

    const parts: Part[] = [];
    if (imageBase64) {
      try {
        const { mimeType, data } = geminiService.parseDataUrl(imageBase64);
        parts.push({ inlineData: { mimeType, data } });
        set(state => ({
            chatAssets: state.chatAssets.includes(imageBase64) ? state.chatAssets : [imageBase64, ...state.chatAssets]
        }));
      } catch(e) {
          set({ error: "Invalid image format." });
          return;
      }
    }
    if (message.trim()) {
      parts.push({ text: message });
    }

    const userMessage: ChatMessage = { role: "user", parts };
    
    set(state => {
      const activeChat = state.chats[currentChatId!];
      const newHistory = [...activeChat.history, userMessage];
      const newTitle = activeChat.history.length === 0 ? message.trim().substring(0, 30) + '...' : activeChat.title;
      return {
        isChatting: true,
        error: null,
        chats: {
          ...state.chats,
          [currentChatId!]: { ...activeChat, history: newHistory, title: newTitle },
        },
      };
    });

    try {
      const currentChat = get().chats[currentChatId!];
      
      // Find the most recent image in history to allow context-aware editing
      const lastImagePart = [...currentChat.history].reverse()
        .flatMap(m => m.parts)
        .find(p => 'inlineData' in p) as any;
      
      const lastImageB64 = lastImagePart?.inlineData 
        ? `data:${lastImagePart.inlineData.mimeType};base64,${lastImagePart.inlineData.data}` 
        : null;

      // Heuristics to determine if we should generate an image or respond with text
      const isConceptRequest = /concept|idea|brainstorm|suggestions|creative direction/i.test(message);
      const isImageModRequest = /change|make|add|remove|replace|reimagine|style|look like|wearing|model|british/i.test(message);
      
      // If current message has no image, but history does and user is asking for a change, use history image
      const imageToUse = imageBase64 || (isImageModRequest ? lastImageB64 : null);
      const shouldGenerateImage = !!imageToUse && message.trim().length > 0 && !isConceptRequest;

      if (shouldGenerateImage) {
        // Image generation flow using the specified model for image editing tasks
        const resultUrl = await withRetry(() => geminiService.generateStyledImage(message, [imageToUse!]));
        const { mimeType, data } = geminiService.parseDataUrl(resultUrl);
        
        const modelMessage: ChatMessage = { 
          role: "model", 
          parts: [
            { text: "Here is your generated image based on the prompt:" },
            { inlineData: { mimeType, data } }
          ] 
        };

        set(state => {
          const chat = state.chats[currentChatId!];
          return {
            chatAssets: state.chatAssets.includes(resultUrl) ? state.chatAssets : [resultUrl, ...state.chatAssets],
            chats: {
              ...state.chats,
              [currentChatId!]: { ...chat, history: [...chat.history, modelMessage] }
            }
          };
        });
      } else {
        // Standard text chat flow
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const activeChat = get().chats[currentChatId!];
        
        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: activeChat.history,
          config: {
            systemInstruction: 'You are a friendly and helpful creative director for a fashion and product brand. Your goal is to help users brainstorm ideas, refine concepts, and overcome creative blocks. Keep your responses concise, inspiring, and use markdown for formatting when appropriate.',
          },
        });

        const responseText = result.text;
        const modelMessage: ChatMessage = { role: "model", parts: [{ text: responseText }] };
        set(state => {
          const chat = state.chats[currentChatId!];
          return {
            chats: {
              ...state.chats,
              [currentChatId!]: { ...chat, history: [...chat.history, modelMessage] }
            }
          };
        });
      }

    } catch (e: any) {
      console.error("Chat error:", e);
      const errorMessageText = e.message || "An unknown error occurred.";
      const errorMessage: ChatMessage = { role: "model", parts: [{ text: `Sorry, an error occurred: ${errorMessageText}` }]};
      set(state => {
         const chat = state.chats[currentChatId!];
         return {
          chats: {
            ...state.chats,
            [currentChatId!]: { ...chat, history: [...chat.history, errorMessage] }
          }
        };
      });
    } finally {
      set({ isChatting: false });
    }
  },
});