import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { ProductEntity } from '../products/entities/product.entity';
import { CategoryEntity } from '../category/entities/category.entity';
import { BrandEntity } from '../brands/entities/brand.entity';
import { UserEntity } from '../users/entities/user.entity';
import { BranchEntity } from '../branch/entities/branch.entity';
import { VoucherEntity } from '../vouchers/entities/voucher.entity';
import { ColorEntity } from '../colors/entities/color.entity';
import { BadgeEntity } from '../badges/entities/badge.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { BannerEntity } from '../banners/entities/banner.entity';
import { AdvertisementEntity } from '../advertisements/entities/advertisement.entity';
import { PageEntity } from '../pages/entities/page.entity';
import { MenuItemEntity } from '../menu/entities/menu-item.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { ProductVariantEntity } from '../product-variants/entities/product-variant.entity';
import { AuditAction, AuditLogEntity } from './entities/audit-log.entity';

/** Where to find a readable name for each kind of record. */
const LABELS: Record<
  string,
  { target: EntityTarget<ObjectLiteral>; field: string }
> = {
  products: { target: ProductEntity, field: 'nameEn' },
  categories: { target: CategoryEntity, field: 'nameEn' },
  brands: { target: BrandEntity, field: 'name' },
  users: { target: UserEntity, field: 'fullName' },
  branches: { target: BranchEntity, field: 'branchNameEn' },
  vouchers: { target: VoucherEntity, field: 'nameEn' },
  colors: { target: ColorEntity, field: 'nameEn' },
  badges: { target: BadgeEntity, field: 'nameEn' },
  orders: { target: OrderEntity, field: 'orderNumber' },
  banners: { target: BannerEntity, field: 'titleEn' },
  advertisements: { target: AdvertisementEntity, field: 'titleEn' },
  pages: { target: PageEntity, field: 'titleEn' },
  menu: { target: MenuItemEntity, field: 'labelEn' },
  reviews: { target: ReviewEntity, field: 'titleEn' },
  'product-variants': { target: ProductVariantEntity, field: 'variantSku' },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AuditActor {
  id: string | null;
  fullName: string;
  username?: string | null;
  role: string;
  branchId?: string | null;
}

export interface AuditQuery {
  page?: number;
  limit?: number;
  actorId?: string;
  entity?: string;
  action?: string;
  entityId?: string;
  from?: string;
  to?: string;
  search?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repo: Repository<AuditLogEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** Save one entry. Never throws — auditing must not break the action. */
  async record(entry: {
    actor: AuditActor;
    action: AuditAction;
    entity: string;
    entityId?: string | null;
    label?: string | null;
    details?: Record<string, unknown> | null;
    method: string;
    path: string;
    ip?: string | null;
  }): Promise<void> {
    try {
      await this.repo.insert({
        actorId: entry.actor.id,
        actorName: entry.actor.fullName.slice(0, 255),
        actorUsername: entry.actor.username ?? null,
        actorRole: entry.actor.role,
        actorBranchId: entry.actor.branchId ?? null,
        action: entry.action,
        entity: entry.entity.slice(0, 50),
        entityId: entry.entityId?.slice(0, 64) ?? null,
        label: entry.label?.slice(0, 255) ?? null,
        details: (entry.details ?? null) as never,
        method: entry.method,
        path: entry.path.slice(0, 255),
        ip: entry.ip?.slice(0, 64) ?? null,
      });
    } catch (err) {
      this.logger.warn(`Could not write audit log: ${String(err)}`);
    }
  }

  /** Readable name of a record (e.g. product name), if we know how. */
  async lookupLabel(entity: string, id: string | null | undefined) {
    const cfg = LABELS[entity];
    if (!cfg || !id || !UUID.test(id)) return null;
    try {
      const row = (await this.dataSource
        .getRepository(cfg.target)
        .findOne({ where: { id } as never })) as Record<string, unknown> | null;
      const v = row?.[cfg.field];
      return typeof v === 'string' ? v : null;
    } catch {
      return null;
    }
  }

  async findAll(q: AuditQuery) {
    const page = Math.max(1, q.page ?? 1);
    const limit = Math.min(100, Math.max(1, q.limit ?? 20));
    const qb = this.repo.createQueryBuilder('a').orderBy('a.createdAt', 'DESC');
    if (q.actorId) qb.andWhere('a.actorId = :actorId', { actorId: q.actorId });
    if (q.entity) qb.andWhere('a.entity = :entity', { entity: q.entity });
    if (q.entityId)
      qb.andWhere('a.entityId = :entityId', { entityId: q.entityId });
    if (q.action) qb.andWhere('a.action = :action', { action: q.action });
    if (q.from)
      qb.andWhere('a.createdAt >= :from', {
        from: new Date(`${q.from}T00:00:00`),
      });
    if (q.to)
      qb.andWhere('a.createdAt <= :to', {
        to: new Date(`${q.to}T23:59:59.999`),
      });
    const term = q.search?.trim();
    if (term) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('a.label ILIKE :s', { s: `%${term}%` })
            .orWhere('a.actorName ILIKE :s')
            .orWhere('a.actorUsername ILIKE :s'),
        ),
      );
    }
    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit };
  }
}
