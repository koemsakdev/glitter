import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { AiChatService, type ChatResult } from './ai-chat.service';
import { ChatDto } from './dto/chat.dto';

/**
 * Public storefront assistant endpoint. Anyone (guest or customer) can chat.
 * Auth is OPTIONAL: if a valid Bearer token is present we resolve the user so
 * the assistant can look up *their* orders — otherwise it answers as a guest.
 * A small in-memory per-IP rate limit keeps this public route from being
 * hammered.
 */
@ApiTags('AI')
@Controller('ai')
export class AiChatController {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private static readonly WINDOW_MS = 60_000;
  private static readonly MAX_PER_WINDOW = 20;

  constructor(
    private readonly chat: AiChatService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat with the storefront shopping assistant' })
  async ask(@Body() dto: ChatDto, @Req() req: Request): Promise<ChatResult> {
    this.rateLimit(this.ipOf(req));
    const userId = await this.resolveUser(req);
    return this.chat.chat(dto.messages, dto.language ?? 'en', userId);
  }

  /** Resolve the signed-in user from an optional Bearer token (never throws). */
  private async resolveUser(req: Request): Promise<string | undefined> {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return undefined;
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(
        header.slice(7),
      );
      return payload.sub;
    } catch {
      return undefined;
    }
  }

  private ipOf(req: Request): string {
    const fwd = req.headers['x-forwarded-for'];
    const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0];
    return first?.trim() || req.ip || 'unknown';
  }

  private rateLimit(ip: string): void {
    const now = Date.now();

    // Opportunistic cleanup so the map can't grow forever.
    if (this.hits.size > 1000) {
      for (const [key, rec] of this.hits) {
        if (now > rec.resetAt) this.hits.delete(key);
      }
    }

    const rec = this.hits.get(ip);
    if (!rec || now > rec.resetAt) {
      this.hits.set(ip, {
        count: 1,
        resetAt: now + AiChatController.WINDOW_MS,
      });
      return;
    }
    rec.count += 1;
    if (rec.count > AiChatController.MAX_PER_WINDOW) {
      throw new HttpException(
        'Too many messages. Please slow down and try again in a minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
