export type SocialTemplateId = 'launch' | 'lifestyle' | 'promo' | 'minimal' | 'editorial' | 'custom' | 'copy';

export interface SocialTemplate {
    id: SocialTemplateId;
    name: string;
    description: string;
    visualPrompt: string;
    captionPrompt: string;
}

export type SocialRatio = '1:1' | '4:5' | '9:16';

export interface GeneratedSocialPost {
    id: string;
    ratio: SocialRatio;
    url: string;
}

export interface SocialStudioState {
    socialSourceImage: string | null;
    socialInspirationImage: string | null;
    activeSocialTemplate: SocialTemplateId;
    selectedSocialRatio: SocialRatio;
    customSocialPrompt: string;
    socialTone: 'excited' | 'professional' | 'witty' | 'minimal';
    isSocialGenerating: boolean;
    isSocialEditing: boolean;
    isSocialApplyingEdit: boolean;
    generatedSocialPosts: GeneratedSocialPost[];
    socialCaptions: {
        instagram: string;
        tiktok: string;
        twitter: string;
    } | null;
}