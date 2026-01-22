
import fetch from 'node-fetch'; // Only needed if running outside Next.js fetch

// ======================
// Types & Interfaces
// ======================

export interface NotificationContext {
  websiteId: string;
  websiteName?: string;
  websiteDomain?: string;
  industry?: string;
  goal?: 'promotion' | 'update' | 'reminder' | 'engagement' | 'announcement';
  tone?: 'professional' | 'casual' | 'urgent' | 'friendly';
  targetAudience?: string;
  previousCampaigns?: Array<{
    title: string;
    body: string;
    clickRate?: number;
    deliveredCount?: number;
    sent_at?: string;
    sent_count?: number;
  }>;
}

export interface AIGenerationRequest {
  prompt: string;
  context?: NotificationContext;
  maxLength?: number;
  includeEmojis?: boolean;
  goal?: NotificationContext['goal'];
  tone?: NotificationContext['tone'];
  websiteId?: string;
}

export interface AIGenerationResponse {
  success: boolean;
  suggestions: Array<{
    title: string;
    body: string;
    emoji?: string;
    reason?: string;
  }>;
  bestTime?: string;
  targetSegment?: string;
  error?: string;
}

interface AIProvider {
  name: string;
  generate(request: AIGenerationRequest, context?: NotificationContext): Promise<AIGenerationResponse>;
}

// ======================
// Template-based Provider (Fallback)
// ======================

class TemplateProvider implements AIProvider {
  name = 'Template';

  async generate(request: AIGenerationRequest, context?: NotificationContext): Promise<AIGenerationResponse> {
    const templates = this.getTemplates(request.goal || context?.goal || 'engagement');
    const suggestions = this.customizeTemplates(templates, request.prompt, request.includeEmojis);

    return {
      success: true,
      suggestions,
      bestTime: 'Weekdays 10-11 AM or 2-3 PM',
      targetSegment: 'Active subscribers (visited in last 7 days)',
    };
  }

  private getTemplates(goal: string) {
    const templates: Record<string, Array<{ title: string; body: string; emoji: string }>> = {
      promotion: [
        { title: '🎉 Limited Time Offer!', body: 'Get [X]% off today only. Shop now!', emoji: '🎉' },
        { title: '💰 Special Deal Inside', body: 'Exclusive discount just for you. Tap to claim!', emoji: '💰' },
        { title: '⚡ Flash Sale Alert', body: 'Hurry! [Product] is [X]% off for 2 hours.', emoji: '⚡' },
      ],
      update: [
        { title: '📢 New Update Available', body: 'We added [feature]. Check it out!', emoji: '📢' },
        { title: '✨ Fresh Content Added', body: 'Discover what is new in [category].', emoji: '✨' },
        { title: '🆕 Just Released', body: 'Be among the first to see this.', emoji: '🆕' },
      ],
      reminder: [
        { title: '⏰ Don’t Forget!', body: 'You have [item/task] waiting. Complete it now.', emoji: '⏰' },
        { title: '👋 We Miss You', body: 'It has been a while! Come back and see.', emoji: '👋' },
        { title: '🔔 Reminder', body: 'Your [item] is still in cart. Check out!', emoji: '🔔' },
      ],
      engagement: [
        { title: '💬 Your Opinion Matters', body: 'Share feedback & help us improve.', emoji: '💬' },
        { title: '🎁 Special Gift Inside', body: 'We have something special for you.', emoji: '🎁' },
        { title: '🌟 You are Invited', body: 'Join [event/feature]. Limited spots.', emoji: '🌟' },
      ],
      announcement: [
        { title: '📣 Big News!', body: 'Something exciting is happening.', emoji: '📣' },
        { title: '🚀 We are Growing', body: 'Thanks to you! See what’s next.', emoji: '🚀' },
        { title: '💡 Important Update', body: 'Changes ahead. Learn more.', emoji: '💡' },
      ],
    };

    return templates[goal] || templates.engagement;
  }

  private customizeTemplates(
    templates: Array<{ title: string; body: string; emoji: string }>,
    prompt: string,
    includeEmojis?: boolean
  ) {
    return templates.slice(0, 3).map(template => {
      const title = includeEmojis ? template.title : template.title.replace(/[^\w\s]/g, '').trim();
      const body = this.insertPromptContext(template.body, prompt);
      return {
        title,
        body,
        emoji: includeEmojis ? template.emoji : undefined,
        reason: 'Based on previous campaigns',
      };
    });
  }

  private insertPromptContext(template: string, prompt: string): string {
    const words = prompt.toLowerCase().split(' ').filter(w => w.length > 4).slice(0, 2);
    let result = template;
    if (words.length > 0) {
      result = result.replace(/\[feature\]|\[category\]|\[product\]|\[item\]/gi, words[0]);
      result = result.replace(/\[X\]/g, '20');
    }
    return result;
  }
}

// ======================
// AI Notification Generator
// ======================

export class AINotificationGenerator {
  private provider: AIProvider;

  constructor(providerType: 'template' = 'template', config?: any) {
    switch (providerType) {
      default:
        this.provider = new TemplateProvider();
    }
  }

  async generateNotification(request: AIGenerationRequest, context?: NotificationContext): Promise<AIGenerationResponse> {
    console.log(`[AI Generator] Using provider: ${this.provider.name}`);
    return this.provider.generate(request, context);
  }

  async analyzeOptimalSendTime(previousCampaigns: NotificationContext['previousCampaigns'] = []): Promise<string> {
    const hourlyStats: Record<number, { sent: number; clicked: number }> = {};

    previousCampaigns?.forEach(c => {
      if (c.sent_at) {
        const hour = new Date(c.sent_at).getHours();
        hourlyStats[hour] = hourlyStats[hour] || { sent: 0, clicked: 0 };
        hourlyStats[hour].sent += c.sent_count || 0;
        hourlyStats[hour].clicked += c.clickRate ? c.clickRate * (c.deliveredCount || 0) : 0;
      }
    });

    let bestHour = 10;
    let bestCTR = 0;

    Object.entries(hourlyStats).forEach(([hour, stats]) => {
      const ctr = stats.sent ? stats.clicked / stats.sent : 0;
      if (ctr > bestCTR) {
        bestCTR = ctr;
        bestHour = parseInt(hour, 10);
      }
    });

    return `${bestHour}:00 (CTR: ${bestCTR > 0 ? (bestCTR * 100).toFixed(1) + '%' : 'industry avg'})`;
  }

  async suggestTargetSegment(context?: NotificationContext): Promise<string> {
    if (context?.previousCampaigns?.length) {
      const avgCTR = context.previousCampaigns.reduce((sum, c) => sum + (c.clickRate || 0), 0) / context.previousCampaigns.length;
      if (avgCTR > 0.05) return 'Active subscribers (high engagement)';
    }

    const goal = context?.goal || 'engagement';
    const segments: Record<string, string> = {
      promotion: 'All active subscribers',
      update: 'Active users (last 7 days)',
      reminder: 'Inactive users (7-30 days)',
      engagement: 'New subscribers (last 14 days)',
      announcement: 'All subscribers',
    };

    return segments[goal] || 'All active subscribers';
  }
}

// Singleton
let generatorInstance: AINotificationGenerator | null = null;
export function getAIGenerator(): AINotificationGenerator {
  if (!generatorInstance) generatorInstance = new AINotificationGenerator('template');
  return generatorInstance;
}
