
// // import fetch from 'node-fetch'; // Only needed if running outside Next.js fetch

// // // ======================
// // // Types & Interfaces
// // // ======================

// // export interface NotificationContext {
// //   websiteId: string;
// //   websiteName?: string;
// //   websiteDomain?: string;
// //   industry?: string;
// //   goal?: 'promotion' | 'update' | 'reminder' | 'engagement' | 'announcement';
// //   tone?: 'professional' | 'casual' | 'urgent' | 'friendly';
// //   targetAudience?: string;
// //   previousCampaigns?: Array<{
// //     title: string;
// //     body: string;
// //     clickRate?: number;
// //     deliveredCount?: number;
// //     sent_at?: string;
// //     sent_count?: number;
// //   }>;
// // }

// // export interface AIGenerationRequest {
// //   prompt: string;
// //   context?: NotificationContext;
// //   maxLength?: number;
// //   includeEmojis?: boolean;
// //   goal?: NotificationContext['goal'];
// //   tone?: NotificationContext['tone'];
// //   websiteId?: string;
// // }

// // export interface AIGenerationResponse {
// //   success: boolean;
// //   suggestions: Array<{
// //     title: string;
// //     body: string;
// //     emoji?: string;
// //     reason?: string;
// //   }>;
// //   bestTime?: string;
// //   targetSegment?: string;
// //   error?: string;
// // }

// // interface AIProvider {
// //   name: string;
// //   generate(request: AIGenerationRequest, context?: NotificationContext): Promise<AIGenerationResponse>;
// // }

// // // ======================
// // // Template-based Provider (Fallback)
// // // ======================

// // class TemplateProvider implements AIProvider {
// //   name = 'Template';

// //   async generate(request: AIGenerationRequest, context?: NotificationContext): Promise<AIGenerationResponse> {
// //     const templates = this.getTemplates(request.goal || context?.goal || 'engagement');
// //     const suggestions = this.customizeTemplates(templates, request.prompt, request.includeEmojis);

// //     return {
// //       success: true,
// //       suggestions,
// //       bestTime: 'Weekdays 10-11 AM or 2-3 PM',
// //       targetSegment: 'Active subscribers (visited in last 7 days)',
// //     };
// //   }

// //   private getTemplates(goal: string) {
// //     const templates: Record<string, Array<{ title: string; body: string; emoji: string }>> = {
// //       promotion: [
// //         { title: ' Limited Time Offer!', body: 'Get [X]% off today only. Shop now!', emoji: '' },
// //         { title: '💰 Special Deal Inside', body: 'Exclusive discount just for you. Tap to claim!', emoji: '💰' },
// //         { title: '⚡ Flash Sale Alert', body: 'Hurry! [Product] is [X]% off for 2 hours.', emoji: '⚡' },
// //       ],
// //       update: [
// //         { title: '📢 New Update Available', body: 'We added [feature]. Check it out!', emoji: '📢' },
// //         { title: '✨ Fresh Content Added', body: 'Discover what is new in [category].', emoji: '✨' },
// //         { title: '🆕 Just Released', body: 'Be among the first to see this.', emoji: '🆕' },
// //       ],
// //       reminder: [
// //         { title: 'Don’t Forget!', body: 'You have [item/task] waiting. Complete it now.', emoji: '⏰' },
// //         { title: '👋 We Miss You', body: 'It has been a while! Come back and see.', emoji: '👋' },
// //         { title: ' Reminder', body: 'Your [item] is still in cart. Check out!', emoji: '' },
// //       ],
// //       engagement: [
// //         { title: '💬 Your Opinion Matters', body: 'Share feedback & help us improve.', emoji: '💬' },
// //         { title: '🎁 Special Gift Inside', body: 'We have something special for you.', emoji: '🎁' },
// //         { title: '🌟 You are Invited', body: 'Join [event/feature]. Limited spots.', emoji: '🌟' },
// //       ],
// //       announcement: [
// //         { title: '📣 Big News!', body: 'Something exciting is happening.', emoji: '📣' },
// //         { title: 'We are Growing', body: 'Thanks to you! See what’s next.', emoji: '' },
// //         { title: ' Important Update', body: 'Changes ahead. Learn more.', emoji: '' },
// //       ],
// //     };

// //     return templates[goal] || templates.engagement;
// //   }

// //   private customizeTemplates(
// //     templates: Array<{ title: string; body: string; emoji: string }>,
// //     prompt: string,
// //     includeEmojis?: boolean
// //   ) {
// //     return templates.slice(0, 3).map(template => {
// //       const title = includeEmojis ? template.title : template.title.replace(/[^\w\s]/g, '').trim();
// //       const body = this.insertPromptContext(template.body, prompt);
// //       return {
// //         title,
// //         body,
// //         emoji: includeEmojis ? template.emoji : undefined,
// //         reason: 'Based on previous campaigns',
// //       };
// //     });
// //   }

// //   private insertPromptContext(template: string, prompt: string): string {
// //     const words = prompt.toLowerCase().split(' ').filter(w => w.length > 4).slice(0, 2);
// //     let result = template;
// //     if (words.length > 0) {
// //       result = result.replace(/\[feature\]|\[category\]|\[product\]|\[item\]/gi, words[0]);
// //       result = result.replace(/\[X\]/g, '20');
// //     }
// //     return result;
// //   }
// // }

// // // ======================
// // // AI Notification Generator
// // // ======================

// // export class AINotificationGenerator {
// //   private provider: AIProvider;

// //   constructor(providerType: 'template' = 'template', config?: any) {
// //     switch (providerType) {
// //       default:
// //         this.provider = new TemplateProvider();
// //     }
// //   }

// //   async generateNotification(request: AIGenerationRequest, context?: NotificationContext): Promise<AIGenerationResponse> {
// //     console.log(`[AI Generator] Using provider: ${this.provider.name}`);
// //     return this.provider.generate(request, context);
// //   }

// //   async analyzeOptimalSendTime(previousCampaigns: NotificationContext['previousCampaigns'] = []): Promise<string> {
// //     const hourlyStats: Record<number, { sent: number; clicked: number }> = {};

// //     previousCampaigns?.forEach(c => {
// //       if (c.sent_at) {
// //         const hour = new Date(c.sent_at).getHours();
// //         hourlyStats[hour] = hourlyStats[hour] || { sent: 0, clicked: 0 };
// //         hourlyStats[hour].sent += c.sent_count || 0;
// //         hourlyStats[hour].clicked += c.clickRate ? c.clickRate * (c.deliveredCount || 0) : 0;
// //       }
// //     });

// //     let bestHour = 10;
// //     let bestCTR = 0;

// //     Object.entries(hourlyStats).forEach(([hour, stats]) => {
// //       const ctr = stats.sent ? stats.clicked / stats.sent : 0;
// //       if (ctr > bestCTR) {
// //         bestCTR = ctr;
// //         bestHour = parseInt(hour, 10);
// //       }
// //     });

// //     return `${bestHour}:00 (CTR: ${bestCTR > 0 ? (bestCTR * 100).toFixed(1) + '%' : 'industry avg'})`;
// //   }

// //   async suggestTargetSegment(context?: NotificationContext): Promise<string> {
// //     if (context?.previousCampaigns?.length) {
// //       const avgCTR = context.previousCampaigns.reduce((sum, c) => sum + (c.clickRate || 0), 0) / context.previousCampaigns.length;
// //       if (avgCTR > 0.05) return 'Active subscribers (high engagement)';
// //     }

// //     const goal = context?.goal || 'engagement';
// //     const segments: Record<string, string> = {
// //       promotion: 'All active subscribers',
// //       update: 'Active users (last 7 days)',
// //       reminder: 'Inactive users (7-30 days)',
// //       engagement: 'New subscribers (last 14 days)',
// //       announcement: 'All subscribers',
// //     };

// //     return segments[goal] || 'All active subscribers';
// //   }
// // }

// // // Singleton
// // let generatorInstance: AINotificationGenerator | null = null;
// // export function getAIGenerator(): AINotificationGenerator {
// //   if (!generatorInstance) generatorInstance = new AINotificationGenerator('template');
// //   return generatorInstance;
// // }


// // lib/ai/notification-generator.ts
// // AI notification generator using HuggingFace Inference API

// import { HfInference } from '@huggingface/inference';

// export interface NotificationSuggestion {
//   title: string;
//   body: string;
//   emoji?: string;
//   reason?: string;
// }

// export interface AIGenerationRequest {
//   prompt: string;
//   websiteId?: string;
//   goal?: 'promotion' | 'update' | 'reminder' | 'engagement' | 'announcement';
//   tone?: 'professional' | 'casual' | 'urgent' | 'friendly';
//   maxLength?: number;
//   includeEmojis?: boolean;
// }

// export interface PreviousCampaign {
//   title: string;
//   body: string;
//   clickRate: number;
//   deliveredCount: number;
//   sent_at?: string;
//   sent_count?: number;
// }

// export interface NotificationContext {
//   websiteId: string;
//   websiteName: string;
//   websiteDomain?: string;
//   goal?: string;
//   tone?: string;
//   previousCampaigns?: PreviousCampaign[];
// }

// export interface AIGenerationResult {
//   success: boolean;
//   suggestions: NotificationSuggestion[];
//   bestTime?: string;
//   targetSegment?: string;
//   error?: string;
// }

// class NotificationGenerator {
//   private hf: HfInference;
//   private model: string;

//   constructor(apiKey?: string) {
//     if (!apiKey) {
//       throw new Error('HuggingFace API key is required');
//     }
//     this.hf = new HfInference(apiKey);
//     // Using a good text generation model
//     this.model = 'mistralai/Mistral-7B-Instruct-v0.2';
//   }

//   /**
//    * Generate notification suggestions based on prompt and context
//    */
//   async generateNotification(
//     request: AIGenerationRequest,
//     context?: NotificationContext
//   ): Promise<AIGenerationResult> {
//     try {
//       const { prompt, goal = 'engagement', tone = 'friendly', maxLength = 120, includeEmojis = true } = request;

//       // Build the AI prompt with context
//       const systemPrompt = this.buildSystemPrompt(goal, tone, maxLength, includeEmojis, context);
//       const userPrompt = this.buildUserPrompt(prompt, context);

//       // Generate suggestions using HuggingFace
//       const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      
//       const response = await this.hf.textGeneration({
//         model: this.model,
//         inputs: fullPrompt,
//         parameters: {
//           max_new_tokens: 1000,
//           temperature: 0.8,
//           top_p: 0.9,
//           return_full_text: false,
//         },
//       });

//       // Parse the generated text into structured suggestions
//       const suggestions = this.parseGeneratedText(response.generated_text, includeEmojis);

//       if (suggestions.length === 0) {
//         return {
//           success: false,
//           suggestions: [],
//           error: 'Failed to generate valid suggestions',
//         };
//       }

//       // Analyze optimal send time if we have historical data
//       const bestTime = context?.previousCampaigns
//         ? await this.analyzeOptimalSendTime(context.previousCampaigns)
//         : this.getDefaultSendTime(goal);

//       // Suggest target segment
//       const targetSegment = context
//         ? await this.suggestTargetSegment(context)
//         : 'all_subscribers';

//       return {
//         success: true,
//         suggestions,
//         bestTime,
//         targetSegment,
//       };
//     } catch (error: any) {
//       console.error('[NotificationGenerator] Error:', error);
//       return {
//         success: false,
//         suggestions: [],
//         error: error.message || 'AI generation failed',
//       };
//     }
//   }

//   /**
//    * Build system prompt with context awareness
//    */
//   private buildSystemPrompt(
//     goal: string,
//     tone: string,
//     maxLength: number,
//     includeEmojis: boolean,
//     context?: NotificationContext
//   ): string {
//     let prompt = `You are an expert push notification copywriter. Your task is to generate highly effective, engaging push notifications.

// REQUIREMENTS:
// - Title: Maximum 50 characters, attention-grabbing
// - Body: Maximum ${maxLength} characters, clear and actionable
// - Goal: ${goal}
// - Tone: ${tone}
// - Emojis: ${includeEmojis ? 'Include relevant emojis' : 'No emojis'}

// OUTPUT FORMAT (JSON):
// Generate exactly 3 notification suggestions in this format:
// [
//   {
//     "title": "Notification title here",
//     "body": "Notification body here",
//     "emoji": "",
//     "reason": "Why this notification works"
//   }
// ]`;

//     // Add historical context if available
//     if (context?.previousCampaigns && context.previousCampaigns.length > 0) {
//       const topCampaign = context.previousCampaigns[0];
//       prompt += `\n\nHISTORICAL DATA:
// Best performing campaign for ${context.websiteName}:
// - Title: "${topCampaign.title}"
// - Body: "${topCampaign.body}"
// - Click Rate: ${(topCampaign.clickRate * 100).toFixed(2)}%
// - Delivered: ${topCampaign.deliveredCount}

// Use this as inspiration for tone and style that works for this audience.`;
//     }

//     if (context?.websiteDomain) {
//       prompt += `\n\nWebsite: ${context.websiteDomain}`;
//     }

//     return prompt;
//   }

//   /**
//    * Build user prompt
//    */
//   private buildUserPrompt(prompt: string, context?: NotificationContext): string {
//     return `Generate 3 push notification variations for: "${prompt}"

// Remember to follow the requirements above and output valid JSON format.`;
//   }

//   /**
//    * Parse generated text into structured suggestions
//    */
//   private parseGeneratedText(text: string, includeEmojis: boolean): NotificationSuggestion[] {
//     try {
//       // Try to extract JSON from the response
//       const jsonMatch = text.match(/\[[\s\S]*\]/);
//       if (jsonMatch) {
//         const parsed = JSON.parse(jsonMatch[0]);
//         if (Array.isArray(parsed)) {
//           return parsed.map(item => ({
//             title: this.truncate(item.title || '', 50),
//             body: this.truncate(item.body || '', 120),
//             emoji: includeEmojis ? item.emoji : undefined,
//             reason: item.reason,
//           }));
//         }
//       }

//       // Fallback: Try to parse line by line
//       return this.fallbackParse(text, includeEmojis);
//     } catch (error) {
//       console.error('[ParseError]:', error);
//       return this.fallbackParse(text, includeEmojis);
//     }
//   }

//   /**
//    * Fallback parsing method
//    */
//   private fallbackParse(text: string, includeEmojis: boolean): NotificationSuggestion[] {
//     const suggestions: NotificationSuggestion[] = [];
//     const lines = text.split('\n').filter(l => l.trim());

//     let currentSuggestion: Partial<NotificationSuggestion> = {};

//     for (const line of lines) {
//       if (line.toLowerCase().includes('title:')) {
//         if (currentSuggestion.title && currentSuggestion.body) {
//           suggestions.push(currentSuggestion as NotificationSuggestion);
//           currentSuggestion = {};
//         }
//         currentSuggestion.title = this.cleanText(line.split(':').slice(1).join(':'));
//       } else if (line.toLowerCase().includes('body:') || line.toLowerCase().includes('message:')) {
//         currentSuggestion.body = this.cleanText(line.split(':').slice(1).join(':'));
//       } else if (includeEmojis && line.toLowerCase().includes('emoji:')) {
//         currentSuggestion.emoji = this.cleanText(line.split(':').slice(1).join(':'));
//       }
//     }

//     if (currentSuggestion.title && currentSuggestion.body) {
//       suggestions.push(currentSuggestion as NotificationSuggestion);
//     }

//     // If parsing failed, generate fallback suggestions
//     if (suggestions.length === 0) {
//       return this.generateFallbackSuggestions(text);
//     }

//     return suggestions.slice(0, 3);
//   }

//   /**
//    * Generate fallback suggestions if AI parsing fails
//    */
//   private generateFallbackSuggestions(originalText: string): NotificationSuggestion[] {
//     return [
//       {
//         title: 'Don\'t Miss Out! 🎁',
//         body: 'Check out what\'s new and exciting. Click to explore!',
//         emoji: '🎁',
//         reason: 'Fallback suggestion - AI parsing encountered an issue',
//       },
//       {
//         title: 'Something Special Awaits ✨',
//         body: 'We have something amazing for you. Tap to discover more!',
//         emoji: '✨',
//         reason: 'Fallback suggestion - AI parsing encountered an issue',
//       },
//       {
//         title: 'You\'re Invited! ',
//         body: 'Join us for an exclusive experience. Don\'t wait!',
//         emoji: '',
//         reason: 'Fallback suggestion - AI parsing encountered an issue',
//       },
//     ];
//   }

//   /**
//    * Analyze optimal send time based on historical data
//    */
//   async analyzeOptimalSendTime(campaigns: PreviousCampaign[]): Promise<string> {
//     try {
//       // Group campaigns by hour and calculate average click rates
//       const hourlyPerformance: { [hour: number]: { clicks: number; count: number } } = {};

//       campaigns.forEach(campaign => {
//         if (campaign.sent_at) {
//           const hour = new Date(campaign.sent_at).getHours();
//           if (!hourlyPerformance[hour]) {
//             hourlyPerformance[hour] = { clicks: 0, count: 0 };
//           }
//           hourlyPerformance[hour].clicks += campaign.clickRate;
//           hourlyPerformance[hour].count += 1;
//         }
//       });

//       // Find the hour with best average performance
//       let bestHour = 10; // Default to 10 AM
//       let bestAvgClickRate = 0;

//       Object.entries(hourlyPerformance).forEach(([hour, data]) => {
//         const avgClickRate = data.clicks / data.count;
//         if (avgClickRate > bestAvgClickRate) {
//           bestAvgClickRate = avgClickRate;
//           bestHour = parseInt(hour);
//         }
//       });

//       return this.formatTimeRecommendation(bestHour);
//     } catch (error) {
//       return 'Morning (9-11 AM) - Based on general best practices';
//     }
//   }

//   /**
//    * Format time recommendation
//    */
//   private formatTimeRecommendation(hour: number): string {
//     const timeRanges = [
//       { start: 6, end: 9, label: 'Early Morning (6-9 AM)' },
//       { start: 9, end: 12, label: 'Morning (9 AM-12 PM)' },
//       { start: 12, end: 15, label: 'Early Afternoon (12-3 PM)' },
//       { start: 15, end: 18, label: 'Late Afternoon (3-6 PM)' },
//       { start: 18, end: 21, label: 'Evening (6-9 PM)' },
//       { start: 21, end: 24, label: 'Night (9 PM-12 AM)' },
//     ];

//     const range = timeRanges.find(r => hour >= r.start && hour < r.end);
//     return range ? `${range.label} - Your audience is most active during this time` : 'Morning (9-11 AM)';
//   }

//   /**
//    * Get default send time based on goal
//    */
//   private getDefaultSendTime(goal: string): string {
//     const defaults: { [key: string]: string } = {
//       promotion: 'Morning (9-11 AM) - Best for promotional content',
//       update: 'Afternoon (2-4 PM) - Good for updates',
//       reminder: 'Evening (6-8 PM) - Effective for reminders',
//       engagement: 'Late Morning (10 AM-12 PM) - Peak engagement time',
//       announcement: 'Morning (9-10 AM) - High visibility for announcements',
//     };
//     return defaults[goal] || 'Morning (9-11 AM) - Based on general best practices';
//   }

//   /**
//    * Suggest target segment based on context
//    */
//   async suggestTargetSegment(context: NotificationContext): Promise<string> {
//     const goal = context.goal || 'engagement';

//     // Analyze historical performance by segment if data is available
//     if (context.previousCampaigns && context.previousCampaigns.length > 0) {
//       const avgClickRate = context.previousCampaigns.reduce((sum, c) => sum + c.clickRate, 0) / context.previousCampaigns.length;

//       if (avgClickRate < 0.02) {
//         return 'active - Focus on engaged users for better results';
//       }
//     }

//     // Default recommendations based on goal
//     const recommendations: { [key: string]: string } = {
//       promotion: 'active - Target users who recently visited',
//       update: 'all_subscribers - Important for everyone to know',
//       reminder: 'inactive - Re-engage dormant users',
//       engagement: 'active - Focus on already engaged audience',
//       announcement: 'all_subscribers - Broadcast to all users',
//     };

//     return recommendations[goal] || 'all_subscribers - Reach your entire audience';
//   }

//   /**
//    * Utility: Clean text
//    */
//   private cleanText(text: string): string {
//     return text.trim().replace(/^["']|["']$/g, '').trim();
//   }

//   /**
//    * Utility: Truncate text
//    */
//   private truncate(text: string, maxLength: number): string {
//     if (text.length <= maxLength) return text;
//     return text.substring(0, maxLength - 3) + '...';
//   }
// }

// // Singleton instance
// let generatorInstance: NotificationGenerator | null = null;

// export function getAIGenerator(): NotificationGenerator {
//   if (!generatorInstance) {
//     const apiKey = process.env.HUGGINGFACE_API_KEY;
//     if (!apiKey) {
//       throw new Error('HUGGINGFACE_API_KEY environment variable is required');
//     }
//     generatorInstance = new NotificationGenerator(apiKey);
//   }
//   return generatorInstance;
// }

// export type { NotificationGenerator };



// lib/ai/notification-generator.ts
// AI notification generator using HuggingFace Inference API
// FIXED VERSION - Uses Chat Completion instead of Text Generation

import { HfInference } from '@huggingface/inference';

export interface NotificationSuggestion {
  title: string;
  body: string;
  emoji?: string;
  reason?: string;
}

export interface AIGenerationRequest {
  prompt: string;
  websiteId?: string;
  goal?: 'promotion' | 'update' | 'reminder' | 'engagement' | 'announcement';
  tone?: 'professional' | 'casual' | 'urgent' | 'friendly';
  maxLength?: number;
  includeEmojis?: boolean;
}

export interface PreviousCampaign {
  title: string;
  body: string;
  clickRate: number;
  deliveredCount: number;
  sent_at?: string;
  sent_count?: number;
}

export interface NotificationContext {
  websiteId: string;
  websiteName: string;
  websiteDomain?: string;
  goal?: string;
  tone?: string;
  previousCampaigns?: PreviousCampaign[];
}

export interface AIGenerationResult {
  success: boolean;
  suggestions: NotificationSuggestion[];
  bestTime?: string;
  targetSegment?: string;
  error?: string;
}

class NotificationGenerator {
  private hf: HfInference;
  private model: string;

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error('HuggingFace API key is required');
    }
    this.hf = new HfInference(apiKey);
    // Using Mistral model with chat completion endpoint
    this.model = 'mistralai/Mistral-7B-Instruct-v0.2';
  }

  /**
   * Generate notification suggestions based on prompt and context
   */
  async generateNotification(
    request: AIGenerationRequest,
    context?: NotificationContext
  ): Promise<AIGenerationResult> {
    try {
      const { prompt, goal = 'engagement', tone = 'friendly', maxLength = 120, includeEmojis = true } = request;

      // Build the AI prompt with context
      const systemPrompt = this.buildSystemPrompt(goal, tone, maxLength, includeEmojis, context);
      const userPrompt = this.buildUserPrompt(prompt, context);

      console.log(' [AI] Calling HuggingFace Chat Completion API...');

      // Use chatCompletion instead of textGeneration
      const response = await this.hf.chatCompletion({
        model: this.model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.8,
      });

      // Extract the generated content
      const generatedText = response.choices[0]?.message?.content || '';
      
      console.log(' [AI] Response received:', generatedText.substring(0, 100) + '...');

      // Parse the generated text into structured suggestions
      const suggestions = this.parseGeneratedText(generatedText, includeEmojis);

      if (suggestions.length === 0) {
        console.warn(' [AI] No valid suggestions generated, using fallback');
        return {
          success: true,
          suggestions: this.generateFallbackSuggestions(prompt),
          bestTime: this.getDefaultSendTime(goal),
          targetSegment: 'all_subscribers',
        };
      }

      // Analyze optimal send time if we have historical data
      const bestTime = context?.previousCampaigns
        ? await this.analyzeOptimalSendTime(context.previousCampaigns)
        : this.getDefaultSendTime(goal);

      // Suggest target segment
      const targetSegment = context
        ? await this.suggestTargetSegment(context)
        : 'all_subscribers';

      return {
        success: true,
        suggestions,
        bestTime,
        targetSegment,
      };
    } catch (error: any) {
      console.error('[NotificationGenerator] Error:', error);
      
      // Return fallback suggestions on error
      return {
        success: true,
        suggestions: this.generateFallbackSuggestions(request.prompt),
        bestTime: this.getDefaultSendTime(request.goal || 'engagement'),
        targetSegment: 'all_subscribers',
        error: error.message || 'AI generation failed, using fallback suggestions',
      };
    }
  }

  /**
   * Build system prompt with context awareness
   */
  private buildSystemPrompt(
    goal: string,
    tone: string,
    maxLength: number,
    includeEmojis: boolean,
    context?: NotificationContext
  ): string {
    let prompt = `You are an expert push notification copywriter. Your task is to generate highly effective, engaging push notifications.

REQUIREMENTS:
- Title: Maximum 50 characters, attention-grabbing
- Body: Maximum ${maxLength} characters, clear and actionable
- Goal: ${goal}
- Tone: ${tone}
- Emojis: ${includeEmojis ? 'Include relevant emojis' : 'No emojis'}

OUTPUT FORMAT (JSON):
Generate exactly 3 notification suggestions in this JSON format:
[
  {
    "title": "Notification title here",
    "body": "Notification body here",
    "emoji": "",
    "reason": "Why this notification works"
  },
  {
    "title": "Second notification title",
    "body": "Second notification body",
    "emoji": "✨",
    "reason": "Why this works"
  },
  {
    "title": "Third notification title",
    "body": "Third notification body",
    "emoji": "",
    "reason": "Why this works"
  }
]`;

    // Add historical context if available
    if (context?.previousCampaigns && context.previousCampaigns.length > 0) {
      const topCampaign = context.previousCampaigns[0];
      prompt += `\n\nHISTORICAL DATA:
Best performing campaign for ${context.websiteName}:
- Title: "${topCampaign.title}"
- Body: "${topCampaign.body}"
- Click Rate: ${(topCampaign.clickRate * 100).toFixed(2)}%

Use this as inspiration for tone and style that resonates with this audience.`;
    }

    if (context?.websiteDomain) {
      prompt += `\n\nWebsite: ${context.websiteDomain}`;
    }

    return prompt;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(prompt: string, context?: NotificationContext): string {
    return `Generate 3 push notification variations for: "${prompt}"

Return ONLY valid JSON array format as specified above. No additional text.`;
  }

  /**
   * Parse generated text into structured suggestions
   */
  private parseGeneratedText(text: string, includeEmojis: boolean): NotificationSuggestion[] {
    try {
      // Try to extract JSON array from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(item => ({
            title: this.truncate(item.title || '', 50),
            body: this.truncate(item.body || '', 120),
            emoji: includeEmojis ? item.emoji : undefined,
            reason: item.reason,
          })).filter(item => item.title && item.body);
        }
      }

      // Fallback: Try to parse line by line
      return this.fallbackParse(text, includeEmojis);
    } catch (error) {
      console.error('[ParseError]:', error);
      return this.fallbackParse(text, includeEmojis);
    }
  }

  /**
   * Fallback parsing method
   */
  private fallbackParse(text: string, includeEmojis: boolean): NotificationSuggestion[] {
    const suggestions: NotificationSuggestion[] = [];
    const lines = text.split('\n').filter(l => l.trim());

    let currentSuggestion: Partial<NotificationSuggestion> = {};

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('title:') || lowerLine.startsWith('title')) {
        if (currentSuggestion.title && currentSuggestion.body) {
          suggestions.push(currentSuggestion as NotificationSuggestion);
          currentSuggestion = {};
        }
        currentSuggestion.title = this.cleanText(line.split(':').slice(1).join(':'));
      } else if (lowerLine.includes('body:') || lowerLine.includes('message:')) {
        currentSuggestion.body = this.cleanText(line.split(':').slice(1).join(':'));
      } else if (includeEmojis && lowerLine.includes('emoji:')) {
        currentSuggestion.emoji = this.cleanText(line.split(':').slice(1).join(':'));
      } else if (lowerLine.includes('reason:')) {
        currentSuggestion.reason = this.cleanText(line.split(':').slice(1).join(':'));
      }
    }

    if (currentSuggestion.title && currentSuggestion.body) {
      suggestions.push(currentSuggestion as NotificationSuggestion);
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Generate fallback suggestions if AI parsing fails
   */
  private generateFallbackSuggestions(originalPrompt: string): NotificationSuggestion[] {
    // Extract keywords from prompt
    const keywords = originalPrompt
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 3 && !['this', 'that', 'with', 'from'].includes(word))
      .slice(0, 3);

    const keyword = keywords[0] || 'update';

    return [
      {
        title: `Don't Miss Out! 🎁`,
        body: `New ${keyword} available. Check it out now!`,
        emoji: '🎁',
        reason: 'Fallback suggestion - Creates urgency and curiosity',
      },
      {
        title: `Something Special Awaits ✨`,
        body: `We have exciting ${keyword} for you. Tap to explore!`,
        emoji: '✨',
        reason: 'Fallback suggestion - Personalized and inviting',
      },
      {
        title: `You're Invited! `,
        body: `Exclusive ${keyword} just for you. Don't wait!`,
        emoji: '',
        reason: 'Fallback suggestion - Exclusive and action-oriented',
      },
    ];
  }

  /**
   * Analyze optimal send time based on historical data
   */
  async analyzeOptimalSendTime(campaigns: PreviousCampaign[]): Promise<string> {
    try {
      const hourlyPerformance: { [hour: number]: { clicks: number; count: number } } = {};

      campaigns.forEach(campaign => {
        if (campaign.sent_at) {
          const hour = new Date(campaign.sent_at).getHours();
          if (!hourlyPerformance[hour]) {
            hourlyPerformance[hour] = { clicks: 0, count: 0 };
          }
          hourlyPerformance[hour].clicks += campaign.clickRate;
          hourlyPerformance[hour].count += 1;
        }
      });

      let bestHour = 10;
      let bestAvgClickRate = 0;

      Object.entries(hourlyPerformance).forEach(([hour, data]) => {
        const avgClickRate = data.clicks / data.count;
        if (avgClickRate > bestAvgClickRate) {
          bestAvgClickRate = avgClickRate;
          bestHour = parseInt(hour);
        }
      });

      return this.formatTimeRecommendation(bestHour);
    } catch (error) {
      return 'Morning (9-11 AM) - Based on general best practices';
    }
  }

  /**
   * Format time recommendation
   */
  private formatTimeRecommendation(hour: number): string {
    const timeRanges = [
      { start: 6, end: 9, label: 'Early Morning (6-9 AM)' },
      { start: 9, end: 12, label: 'Morning (9 AM-12 PM)' },
      { start: 12, end: 15, label: 'Early Afternoon (12-3 PM)' },
      { start: 15, end: 18, label: 'Late Afternoon (3-6 PM)' },
      { start: 18, end: 21, label: 'Evening (6-9 PM)' },
      { start: 21, end: 24, label: 'Night (9 PM-12 AM)' },
    ];

    const range = timeRanges.find(r => hour >= r.start && hour < r.end);
    return range ? `${range.label} - Your audience is most active during this time` : 'Morning (9-11 AM)';
  }

  /**
   * Get default send time based on goal
   */
  private getDefaultSendTime(goal: string): string {
    const defaults: { [key: string]: string } = {
      promotion: 'Morning (9-11 AM) - Best for promotional content',
      update: 'Afternoon (2-4 PM) - Good for updates',
      reminder: 'Evening (6-8 PM) - Effective for reminders',
      engagement: 'Late Morning (10 AM-12 PM) - Peak engagement time',
      announcement: 'Morning (9-10 AM) - High visibility for announcements',
    };
    return defaults[goal] || 'Morning (9-11 AM) - Based on general best practices';
  }

  /**
   * Suggest target segment based on context
   */
  async suggestTargetSegment(context: NotificationContext): Promise<string> {
    const goal = context.goal || 'engagement';

    if (context.previousCampaigns && context.previousCampaigns.length > 0) {
      const avgClickRate = context.previousCampaigns.reduce((sum, c) => sum + c.clickRate, 0) / context.previousCampaigns.length;

      if (avgClickRate < 0.02) {
        return 'active - Focus on engaged users for better results';
      }
    }

    const recommendations: { [key: string]: string } = {
      promotion: 'active - Target users who recently visited',
      update: 'all_subscribers - Important for everyone to know',
      reminder: 'inactive - Re-engage dormant users',
      engagement: 'active - Focus on already engaged audience',
      announcement: 'all_subscribers - Broadcast to all users',
    };

    return recommendations[goal] || 'all_subscribers - Reach your entire audience';
  }

  /**
   * Utility: Clean text
   */
  private cleanText(text: string): string {
    return text.trim().replace(/^["']|["']$/g, '').trim();
  }

  /**
   * Utility: Truncate text
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

// Singleton instance
let generatorInstance: NotificationGenerator | null = null;

export function getAIGenerator(): NotificationGenerator {
  if (!generatorInstance) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error('HUGGINGFACE_API_KEY environment variable is required');
    }
    generatorInstance = new NotificationGenerator(apiKey);
  }
  return generatorInstance;
}

export type { NotificationGenerator };