import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Not, Repository } from 'typeorm';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherEntity } from './entities/voucher.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { UserEntity } from '../users/entities/user.entity';

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Why a voucher can't be applied (for a friendly storefront message). */
export type VoucherReason =
  | 'not_found'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'used_up'
  | 'min_spend'
  | 'login_required'
  | 'new_customer';

/** Public-safe promo shape for the storefront offers list. */
export interface PublicVoucher {
  id: string;
  code: string | null;
  nameEn: string;
  nameKm: string;
  discountType: 'percent' | 'fixed';
  appliesTo: 'order' | 'delivery';
  discountValue: number;
  minSpend: number;
  maxDiscount: number | null;
  endAt: string | null;
  firstOrderOnly: boolean;
  newAccountDays: number | null;
}

export interface VoucherValidation {
  valid: boolean;
  reason?: VoucherReason;
  /** Discount amount when valid. */
  discount?: number;
  /** Where the discount applies (order subtotal or delivery fee). */
  appliesTo?: 'order' | 'delivery';
  /** For a min_spend failure, how much is required. */
  minSpend?: number;
  code?: string | null;
  nameEn?: string;
  nameKm?: string;
}

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(VoucherEntity)
    private readonly repo: Repository<VoucherEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * Customer-eligibility gate for restricted promos (new customers). Returns a
   * reason when the user can't use it, else null. Unrestricted promos → null.
   */
  private async eligibilityReason(
    v: VoucherEntity,
    userId?: string | null,
  ): Promise<VoucherReason | null> {
    const restricted = v.firstOrderOnly || v.newAccountDays != null;
    if (!restricted) return null;
    if (!userId) return 'login_required';

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return 'login_required';

    if (v.firstOrderOnly) {
      const priorOrders = await this.orderRepo.count({
        where: { customerId: userId, status: Not('cancelled') },
      });
      if (priorOrders > 0) return 'new_customer';
    }
    if (v.newAccountDays != null) {
      const ageDays =
        (Date.now() - new Date(user.createdAt).getTime()) / 86_400_000;
      if (ageDays > v.newAccountDays) return 'new_customer';
    }
    return null;
  }

  private today(): string {
    // Shop-local date (Asia/Phnom_Penh, UTC+7) for date-only windows, so a
    // promo dated "today" is valid regardless of the server's timezone.
    const local = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return local.toISOString().slice(0, 10);
  }

  private normalizeCode(code?: string | null): string | null {
    const c = (code ?? '').trim().toUpperCase();
    return c || null;
  }

  /**
   * The discount amount this voucher yields. Order promos apply to the
   * subtotal; delivery promos apply to the shipping fee (so 100% = free
   * delivery). Never exceeds the amount it applies to.
   */
  private computeDiscount(
    v: VoucherEntity,
    subtotal: number,
    shippingFee = 0,
  ): number {
    const base = v.appliesTo === 'delivery' ? shippingFee : subtotal;
    let raw =
      v.discountType === 'percent'
        ? base * (v.discountValue / 100)
        : v.discountValue;
    // A cap only counts when it's a positive amount. (The numeric transformer
    // reads a null column back as 0, so treat 0 as "no cap".)
    if (v.discountType === 'percent' && v.maxDiscount && v.maxDiscount > 0) {
      raw = Math.min(raw, v.maxDiscount);
    }
    return round2(Math.min(raw, base));
  }

  /** Returns a reason string if the voucher is not applicable, else null. */
  private checkApplicable(
    v: VoucherEntity,
    subtotal: number,
  ): VoucherReason | null {
    const today = this.today();
    if (!v.active) return 'inactive';
    if (v.startAt && v.startAt > today) return 'not_started';
    if (v.endAt && v.endAt < today) return 'expired';
    if (v.usageLimit != null && v.usedCount >= v.usageLimit) return 'used_up';
    if (subtotal < v.minSpend) return 'min_spend';
    return null;
  }

  private summary(
    v: VoucherEntity,
    subtotal: number,
    shippingFee = 0,
  ): VoucherValidation {
    return {
      valid: true,
      discount: this.computeDiscount(v, subtotal, shippingFee),
      appliesTo: v.appliesTo,
      code: v.code,
      nameEn: v.nameEn,
      nameKm: v.nameKm,
    };
  }

  /** Safe fields for the storefront (no internal usage counters). */
  private toPublic(v: VoucherEntity): PublicVoucher {
    return {
      id: v.id,
      code: v.code,
      nameEn: v.nameEn,
      nameKm: v.nameKm,
      discountType: v.discountType,
      appliesTo: v.appliesTo,
      discountValue: v.discountValue,
      minSpend: v.minSpend,
      maxDiscount: v.maxDiscount && v.maxDiscount > 0 ? v.maxDiscount : null,
      endAt: v.endAt,
      firstOrderOnly: v.firstOrderOnly,
      newAccountDays: v.newAccountDays,
    };
  }

  private isRestricted(v: VoucherEntity): boolean {
    return v.firstOrderOnly || v.newAccountDays != null;
  }

  /**
   * Active, in-window promos for the public offers list. Customer-restricted
   * promos (new customers) are excluded here — they surface per-user in
   * "My Coupons" instead.
   */
  async findActivePublic(): Promise<PublicVoucher[]> {
    const list = await this.repo.find({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });
    return list
      .filter(
        (v) =>
          !this.isRestricted(v) &&
          !this.checkApplicable(v, Number.MAX_SAFE_INTEGER),
      )
      .map((v) => this.toPublic(v));
  }

  /** Active promos a specific logged-in customer is eligible for. */
  async findEligible(userId: string): Promise<PublicVoucher[]> {
    const list = await this.repo.find({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });
    const out: PublicVoucher[] = [];
    for (const v of list) {
      if (this.checkApplicable(v, Number.MAX_SAFE_INTEGER)) continue;
      if (await this.eligibilityReason(v, userId)) continue;
      out.push(this.toPublic(v));
    }
    return out;
  }

  // ---- Admin CRUD ----

  findAll(): Promise<VoucherEntity[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<VoucherEntity> {
    const v = await this.repo.findOne({ where: { id } });
    if (!v) throw new NotFoundException(`Voucher ${id} not found`);
    return v;
  }

  async create(dto: CreateVoucherDto): Promise<VoucherEntity> {
    const code = this.normalizeCode(dto.code);
    if (code) {
      const existing = await this.repo.findOne({ where: { code } });
      if (existing) throw new BadRequestException('Code already in use');
    }
    const v = this.repo.create({
      code,
      nameEn: dto.nameEn,
      nameKm: dto.nameKm ?? '',
      discountType: dto.discountType,
      appliesTo: dto.appliesTo ?? 'order',
      discountValue: dto.discountValue,
      minSpend: dto.minSpend ?? 0,
      maxDiscount: dto.maxDiscount ?? null,
      startAt: dto.startAt ?? null,
      endAt: dto.endAt ?? null,
      usageLimit: dto.usageLimit ?? null,
      firstOrderOnly: dto.firstOrderOnly ?? false,
      newAccountDays: dto.newAccountDays ?? null,
      active: dto.active ?? true,
    });
    return this.repo.save(v);
  }

  async update(id: string, dto: UpdateVoucherDto): Promise<VoucherEntity> {
    const v = await this.findOne(id);
    if (dto.code !== undefined) {
      const code = this.normalizeCode(dto.code);
      if (code && code !== v.code) {
        const existing = await this.repo.findOne({ where: { code } });
        if (existing) throw new BadRequestException('Code already in use');
      }
      v.code = code;
    }
    if (dto.nameEn !== undefined) v.nameEn = dto.nameEn;
    if (dto.nameKm !== undefined) v.nameKm = dto.nameKm;
    if (dto.discountType !== undefined) v.discountType = dto.discountType;
    if (dto.appliesTo !== undefined) v.appliesTo = dto.appliesTo;
    if (dto.discountValue !== undefined) v.discountValue = dto.discountValue;
    if (dto.minSpend !== undefined) v.minSpend = dto.minSpend;
    if (dto.maxDiscount !== undefined) v.maxDiscount = dto.maxDiscount;
    if (dto.startAt !== undefined) v.startAt = dto.startAt;
    if (dto.endAt !== undefined) v.endAt = dto.endAt;
    if (dto.usageLimit !== undefined) v.usageLimit = dto.usageLimit;
    if (dto.firstOrderOnly !== undefined) v.firstOrderOnly = dto.firstOrderOnly;
    if (dto.newAccountDays !== undefined) v.newAccountDays = dto.newAccountDays;
    if (dto.active !== undefined) v.active = dto.active;
    return this.repo.save(v);
  }

  async remove(id: string): Promise<void> {
    const v = await this.findOne(id);
    await this.repo.remove(v);
  }

  // ---- Public validation (storefront) ----

  /**
   * Validate a typed code, or (when no code) return the best automatic promo
   * for the given subtotal. Never throws — returns a friendly result.
   */
  async validate(
    subtotal: number,
    code?: string,
    shippingFee = 0,
    userId?: string | null,
  ): Promise<VoucherValidation> {
    const normalized = this.normalizeCode(code);
    if (normalized) {
      const v = await this.repo.findOne({ where: { code: normalized } });
      if (!v) return { valid: false, reason: 'not_found' };
      const reason = this.checkApplicable(v, subtotal);
      if (reason) {
        return { valid: false, reason, minSpend: v.minSpend, code: v.code };
      }
      const eligibility = await this.eligibilityReason(v, userId);
      if (eligibility) {
        return { valid: false, reason: eligibility, code: v.code };
      }
      return this.summary(v, subtotal, shippingFee);
    }
    const best = await this.bestAutomatic(subtotal, shippingFee, userId);
    return best ?? { valid: false, reason: 'not_found' };
  }

  /** Highest-value automatic (code-less) promo applicable to the subtotal. */
  async bestAutomatic(
    subtotal: number,
    shippingFee = 0,
    userId?: string | null,
  ): Promise<VoucherValidation | null> {
    const list = await this.repo.find({
      where: { code: IsNull(), active: true },
    });
    let best: VoucherEntity | null = null;
    let bestDiscount = 0;
    for (const v of list) {
      if (this.checkApplicable(v, subtotal)) continue;
      if (await this.eligibilityReason(v, userId)) continue;
      const d = this.computeDiscount(v, subtotal, shippingFee);
      if (d > bestDiscount) {
        bestDiscount = d;
        best = v;
      }
    }
    return best ? this.summary(best, subtotal, shippingFee) : null;
  }

  // ---- Order integration (transactional) ----

  /**
   * Resolve the discount to apply to an order. If `code` is given it must be
   * valid (throws otherwise). If absent, the best automatic promo applies.
   * Returns the server-computed discount and the voucher used (if any).
   */
  async resolveDiscount(
    manager: EntityManager,
    subtotal: number,
    shippingFee: number,
    code?: string,
    userId?: string | null,
  ): Promise<{ discountTotal: number; voucher: VoucherEntity | null }> {
    const repo = manager.getRepository(VoucherEntity);
    const normalized = this.normalizeCode(code);
    let voucher: VoucherEntity | null = null;

    if (normalized) {
      voucher = await repo.findOne({ where: { code: normalized } });
      if (!voucher) throw new BadRequestException('Invalid voucher code');
      const reason =
        this.checkApplicable(voucher, subtotal) ??
        (await this.eligibilityReason(voucher, userId));
      if (reason) throw new BadRequestException(this.reasonMessage(reason, voucher));
    } else {
      const list = await repo.find({ where: { code: IsNull(), active: true } });
      let bestDiscount = 0;
      for (const v of list) {
        if (this.checkApplicable(v, subtotal)) continue;
        if (await this.eligibilityReason(v, userId)) continue;
        const d = this.computeDiscount(v, subtotal, shippingFee);
        if (d > bestDiscount) {
          bestDiscount = d;
          voucher = v;
        }
      }
    }

    if (!voucher) return { discountTotal: 0, voucher: null };
    return {
      discountTotal: this.computeDiscount(voucher, subtotal, shippingFee),
      voucher,
    };
  }

  async markUsedTx(manager: EntityManager, id: string): Promise<void> {
    await manager.increment(VoucherEntity, { id }, 'usedCount', 1);
  }

  private reasonMessage(reason: VoucherReason, v: VoucherEntity): string {
    switch (reason) {
      case 'not_started':
        return 'This promotion has not started yet';
      case 'expired':
        return 'This promotion has expired';
      case 'used_up':
        return 'This promotion has reached its usage limit';
      case 'min_spend':
        return `Spend at least ${v.minSpend} to use this promotion`;
      case 'login_required':
        return 'Sign in to use this promotion';
      case 'new_customer':
        return 'This promotion is for new customers only';
      case 'inactive':
      default:
        return 'This promotion is not available';
    }
  }
}
