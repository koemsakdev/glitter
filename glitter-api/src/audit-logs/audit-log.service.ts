import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  In,
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
import { InventoryBranchEntity } from '../inventory-branch/entities/inventory-branch.entity';
import { ProductImageEntity } from '../product-images/entities/product-image.entity';
import { ShipmentEntity } from '../shipments/entities/shipment.entity';
import { AppSettingEntity } from '../app-settings/entities/app-setting.entity';
import { AuditAction, AuditLogEntity } from './entities/audit-log.entity';

/** Where to find a readable name for each kind of record. */
export const LABELS: Record<
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
  inventory: { target: InventoryBranchEntity, field: 'id' },
  'product-images': { target: ProductImageEntity, field: 'imageUrl' },
  shipments: { target: ShipmentEntity, field: 'trackingNumber' },
  'app-settings': { target: AppSettingEntity, field: 'settingKey' },
};

/** Fields never worth showing in a change diff. */
const NOISE = new Set([
  'updatedAt',
  'createdAt',
  'tokenVersion',
  'passwordHash',
  'emailOtpHash',
  'emailOtpExpiresAt',
  'emailOtpAttempts',
  'emailOtpSentAt',
]);

/** Flatten an entity row to plain scalar fields (no relations). */
export function plain(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (NOISE.has(k)) continue;
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) {
      out[k] = v;
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    }
  }
  return out;
}

/** Name of a list item for summaries (banner, social link, theme…). */
function itemName(v: unknown): string {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of [
      'nameEn',
      'name',
      'titleEn',
      'labelEn',
      'label',
      'platform',
      'id',
    ]) {
      if (typeof o[k] === 'string' && o[k]) return o[k];
    }
  }
  return typeof v === 'string' || typeof v === 'number' ? String(v) : 'item';
}

/**
 * The store settings live in ONE row as a JSON document. For the audit trail,
 * turn it into readable fields: top-level values as-is, nested objects as
 * "parent.child", and lists as their item names (+ "(edited)" via a content
 * fingerprint, so a change inside an item still shows up).
 */
export function settingsSnapshot(
  row: Record<string, unknown>,
): Record<string, unknown> {
  let doc: unknown = row.settingValue;
  try {
    doc = JSON.parse(String(row.settingValue));
  } catch {
    return { value: row.settingValue };
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc))
    return { value: doc };
  const out: Record<string, unknown> = {};
  const put = (key: string, v: unknown, depth: number) => {
    if (Array.isArray(v)) {
      const names = v.map(itemName);
      out[key] = names.length ? names.join(', ') : '';
      // fingerprint so edits inside an item are detected (hidden in the UI)
      out[`${key}.__hash`] =
        JSON.stringify(v).length + ':' + JSON.stringify(v).slice(0, 2000);
    } else if (v && typeof v === 'object' && depth < 2) {
      for (const [k, x] of Object.entries(v as Record<string, unknown>))
        put(`${key}.${k}`, x, depth + 1);
    } else if (v && typeof v === 'object') {
      out[key] = JSON.stringify(v);
    } else {
      out[key] = v ?? null;
    }
  };
  for (const [k, v] of Object.entries(doc as Record<string, unknown>))
    put(k, v, 1);
  return out;
}

/** Only the fields that differ: { old_value, new_value }. */
export function diff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): {
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
} | null {
  if (!before && !after) return null;
  if (!before) return { old_value: null, new_value: after };
  if (!after) return { old_value: before, new_value: null };
  const o: Record<string, unknown> = {};
  const n: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    // numeric columns come back as strings from Postgres — compare loosely
    if (
      JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null) &&
      String((before[k] as string | number | boolean | null) ?? '') !==
        String((after[k] as string | number | boolean | null) ?? '')
    ) {
      o[k] = before[k] ?? null;
      n[k] = after[k] ?? null;
    }
  }
  return Object.keys(n).length ? { old_value: o, new_value: n } : null;
}

/** Which part of the system a record type belongs to. */
export function moduleOf(entity: string): string {
  const m: Record<string, string> = {
    products: 'catalog',
    categories: 'catalog',
    brands: 'catalog',
    colors: 'catalog',
    badges: 'catalog',
    'product-variants': 'catalog',
    reviews: 'catalog',
    orders: 'sales',
    shipments: 'sales',
    vouchers: 'sales',
    inventory: 'inventory',
    users: 'users',
    branches: 'settings',
    'app-settings': 'settings',
    banners: 'storefront',
    advertisements: 'storefront',
    pages: 'storefront',
    menu: 'storefront',
    'payment-config': 'settings',
    auth: 'authentication',
    security: 'security',
  };
  return m[entity] ?? 'other';
}

/** Fields that point at another record → which record type they point at. */
const REF_FIELDS: Record<string, string> = {
  branchId: 'branches',
  fromBranchId: 'branches',
  toBranchId: 'branches',
  categoryId: 'categories',
  parentCategoryId: 'categories',
  parentId: 'categories',
  brandId: 'brands',
  productId: 'products',
  relatedProductId: 'products',
  productVariantId: 'product-variants',
  variantId: 'product-variants',
  userId: 'users',
  customerId: 'users',
  cashierId: 'users',
  colorId: 'colors',
  badgeId: 'badges',
  voucherId: 'vouchers',
  orderId: 'orders',
};

/** One row of a record's audit trail (a log, or a gap filled from the record). */
type TrailEntryOut = Omit<
  AuditLogEntity,
  'createdAt' | 'actorName' | 'actorRole' | 'method' | 'path'
> & {
  method: string | null;
  path: string | null;
  createdAt: Date;
  actorName: string | null;
  actorRole: string | null;
  synthetic: boolean;
  location: Record<string, unknown> | null;
  device: Record<string, unknown> | null;
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
  status?: string;
  suspicious?: string;
  module?: string;
  sortBy?: string;
  sortOrder?: string;
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
    module?: string;
    status?: 'success' | 'failed' | 'blocked';
    responseStatus?: number | null;
    changes?: {
      old_value: Record<string, unknown> | null;
      new_value: Record<string, unknown> | null;
    } | null;
    isSuspicious?: boolean;
    suspiciousReason?: string | null;
    threatType?: string | null;
    payload?: string | null;
  }): Promise<string | null> {
    try {
      const res = await this.repo.insert({
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
        module: entry.module ?? moduleOf(entry.entity),
        status: entry.status ?? 'success',
        responseStatus: entry.responseStatus ?? null,
        changes: (entry.changes ?? null) as never,
        isSuspicious: entry.isSuspicious ?? false,
        suspiciousReason: entry.suspiciousReason ?? null,
        threatType: entry.threatType ?? null,
        payload: entry.payload?.slice(0, 2000) ?? null,
      });
      return (res.identifiers[0]?.id as string | undefined) ?? null;
    } catch (err) {
      this.logger.warn(`Could not write audit log: ${String(err)}`);
      return null;
    }
  }

  /** A variant's stock row at a branch (stock changes are keyed that way). */
  async inventorySnapshot(
    variantId: unknown,
    branchId: unknown,
  ): Promise<{
    id: string;
    values: Record<string, unknown>;
    sku: string | null;
  } | null> {
    if (typeof variantId !== 'string' || typeof branchId !== 'string')
      return null;
    if (!UUID.test(variantId) || !UUID.test(branchId)) return null;
    try {
      const row = await this.dataSource
        .getRepository(InventoryBranchEntity)
        .findOne({
          where: { productVariantId: variantId, branchId },
        });
      const variant = await this.dataSource
        .getRepository(ProductVariantEntity)
        .findOne({ where: { id: variantId } });
      return row
        ? {
            id: row.id,
            values: plain(row as unknown as Record<string, unknown>),
            sku: variant?.variantSku ?? null,
          }
        : { id: '', values: {}, sku: variant?.variantSku ?? null };
    } catch {
      return null;
    }
  }

  /** Current DB values of a record (for old/new comparison), if known. */
  /** Number of audit entries (0 right after a data reset). */
  count(): Promise<number> {
    return this.repo.count();
  }

  /**
   * Give every existing catalog record a "created" entry in the audit trail,
   * attributed to `actor` and dated when the record was created. Used after a
   * data reset, so records kept from before show who owns them. Records that
   * already have a "create" entry are skipped, so this is safe to re-run.
   */
  async backfillCreates(actor: AuditActor): Promise<number> {
    const types = [
      'branches',
      'categories',
      'brands',
      'colors',
      'badges',
      'products',
      'product-variants',
      'inventory',
    ];
    let added = 0;
    for (const entity of types) {
      const cfg = LABELS[entity];
      if (!cfg) continue;
      const logged = new Set(
        (
          await this.repo.find({
            select: { entityId: true },
            where: { entity, action: 'create' },
          })
        ).map((l) => l.entityId),
      );
      const rows = (await this.dataSource
        .getRepository(cfg.target)
        .find()) as Record<string, unknown>[];
      const missing = rows.filter((r) => !logged.has(String(r.id)));
      if (!missing.length) continue;
      await this.repo.insert(
        missing.map((r) => ({
          actorId: actor.id,
          actorName: actor.fullName.slice(0, 255),
          actorUsername: actor.username ?? null,
          actorRole: actor.role,
          actorBranchId: actor.branchId ?? null,
          action: 'create' as AuditAction,
          entity,
          entityId: String(r.id),
          label:
            entity === 'inventory'
              ? null
              : ((r[cfg.field] as string | null)?.slice(0, 255) ?? null),
          details: { source: 'seed' } as never,
          method: 'SEED',
          path: 'seed',
          ip: null,
          module: moduleOf(entity),
          status: 'success' as const,
          responseStatus: null,
          changes: { old_value: null, new_value: plain(r) } as never,
          createdAt: (r.createdAt as Date | undefined) ?? new Date(),
        })),
      );
      added += missing.length;
    }
    return added;
  }

  async snapshot(
    entity: string,
    id: string | null | undefined,
  ): Promise<Record<string, unknown> | null> {
    const cfg = LABELS[entity];
    if (!cfg || !id || !UUID.test(id)) return null;
    try {
      const row = (await this.dataSource
        .getRepository(cfg.target)
        .findOne({ where: { id } as never, withDeleted: true })) as Record<
        string,
        unknown
      > | null;
      if (!row) return null;
      return entity === 'app-settings' ? settingsSnapshot(row) : plain(row);
    } catch {
      return null;
    }
  }

  /** Readable name of a record (e.g. product name), if we know how. */
  async lookupLabel(entity: string, id: string | null | undefined) {
    const cfg = LABELS[entity];
    if (!cfg || !id || !UUID.test(id)) return null;
    try {
      const row = (await this.dataSource
        .getRepository(cfg.target)
        .findOne({ where: { id } as never, withDeleted: true })) as Record<
        string,
        unknown
      > | null;
      const v = row?.[cfg.field];
      return typeof v === 'string' ? v : null;
    } catch {
      return null;
    }
  }

  /**
   * Everything that happened to one record, oldest first, each entry with
   * who / when / IP plus the place and device of that person's sign-in from
   * the same IP. Also a summary: created, last modified, deleted.
   */
  async recordTrail(entity: string, id: string) {
    // A product's stock lives on its variants' inventory rows — include those
    // stock changes in the product's trail too.
    const targets: { entity: string; entityId: string }[] = [
      { entity, entityId: id },
    ];
    if (entity === 'products' && UUID.test(id)) {
      const inv = await this.dataSource.query<{ id: string }[]>(
        `SELECT ib.id FROM inventory_branch ib
           JOIN product_variants pv ON pv.id = ib.product_variant_id
          WHERE pv.product_id = $1`,
        [id],
      );
      for (const r of inv)
        targets.push({ entity: 'inventory', entityId: r.id });
    }
    const logs = await this.repo.find({
      where: targets,
      order: { createdAt: 'ASC' },
      take: 500,
    });

    // Where & which device: the actor's sign-ins from that IP.
    const ips = [...new Set(logs.map((l) => l.ip).filter(Boolean))] as string[];
    const geo = new Map<string, Record<string, unknown>>();
    const device = new Map<string, Record<string, unknown>>();
    if (ips.length) {
      const g = await this.dataSource.query<Record<string, unknown>[]>(
        `SELECT DISTINCT ON (ip) ip, country, country_code, region, city, isp,
                is_vpn_or_proxy
           FROM login_attempts
          WHERE ip = ANY($1) AND country IS NOT NULL
          ORDER BY ip, created_at DESC`,
        [ips],
      );
      for (const r of g) geo.set(String(r.ip), r);
      const d = await this.dataSource.query<Record<string, unknown>[]>(
        `SELECT DISTINCT ON (user_id, ip) user_id, ip, browser, os, device_type
           FROM login_attempts
          WHERE ip = ANY($1) AND success AND user_id IS NOT NULL
          ORDER BY user_id, ip, created_at DESC`,
        [ips],
      );
      for (const r of d) device.set(`${String(r.user_id)}|${String(r.ip)}`, r);
    }

    const entries: TrailEntryOut[] = logs.map((l) => {
      const place = l.ip ? geo.get(l.ip) : undefined;
      const dev =
        l.ip && l.actorId ? device.get(`${l.actorId}|${l.ip}`) : undefined;
      return {
        ...l,
        synthetic: false,
        location: place
          ? {
              country: place.country ?? null,
              countryCode: place.country_code ?? null,
              region: place.region ?? null,
              city: place.city ?? null,
              isp: place.isp ?? null,
              isVpnOrProxy: place.is_vpn_or_proxy ?? null,
            }
          : null,
        device: dev
          ? {
              browser: dev.browser ?? null,
              os: dev.os ?? null,
              deviceType: dev.device_type ?? null,
            }
          : null,
      };
    });

    // The record itself (even if soft-deleted).
    let record: Record<string, unknown> | null = null;
    const cfg = LABELS[entity];
    if (cfg && UUID.test(id)) {
      record = (await this.dataSource
        .getRepository(cfg.target)
        .findOne({ where: { id } as never, withDeleted: true })) as Record<
        string,
        unknown
      > | null;
    }
    // Records older than audit tracking have no log rows. Fill the gaps from
    // the record's own timestamps so the trail is never blank or wrong
    // (e.g. "never modified" for something edited before tracking began).
    const createdAt = record?.createdAt as Date | undefined;
    const updatedAt = record?.updatedAt as Date | undefined;
    const deletedAt = record?.deletedAt as Date | null | undefined;
    const hasLog = (actions: string[]) =>
      logs.some((l) => actions.includes(l.action) && l.status === 'success');
    const MODIFY = ['update', 'status', 'stock', 'password', 'restore'];
    const untracked = (
      action: AuditAction,
      at: Date,
      note: string,
    ): TrailEntryOut => ({
      id: `untracked-${action}`,
      createdAt: at,
      action,
      entity,
      entityId: id,
      label: null,
      details: { note },
      changes: null,
      status: 'success',
      responseStatus: null,
      isSuspicious: false,
      suspiciousReason: null,
      actorId: null,
      actorName: null,
      actorUsername: null,
      actorRole: null,
      ip: null,
      method: null,
      path: null,
      actorBranchId: null,
      module: moduleOf(entity),
      threatType: null,
      payload: null,
      synthetic: true,
      location: null,
      device: null,
    });
    const firstLogAt = logs[0]?.createdAt;
    if (createdAt && !hasLog(['create'])) {
      entries.unshift(untracked('create', createdAt, 'created'));
    }
    // Edited before tracking: updatedAt is clearly after creation and before
    // the first logged action (or there are no logs at all).
    const editedUntracked =
      createdAt &&
      updatedAt &&
      +updatedAt - +createdAt > 5_000 &&
      (!firstLogAt || +updatedAt < +firstLogAt - 5_000) &&
      !(deletedAt && Math.abs(+updatedAt - +deletedAt) < 5_000);
    if (editedUntracked) {
      entries.splice(
        entries.findIndex((e) => +new Date(e.createdAt) > +updatedAt) === -1
          ? entries.length
          : entries.findIndex((e) => +new Date(e.createdAt) > +updatedAt),
        0,
        untracked('update', updatedAt, 'modified'),
      );
    }
    if (deletedAt && !hasLog(['delete'])) {
      entries.push(untracked('delete', deletedAt, 'deleted'));
    }

    const who = (l?: AuditLogEntity) =>
      l
        ? {
            name: l.actorName,
            username: l.actorUsername,
            role: l.actorRole,
            at: l.createdAt,
          }
        : null;
    const lastOf = (actions: string[]) =>
      [...logs]
        .reverse()
        .find((l) => actions.includes(l.action) && l.status === 'success');

    // Turn IDs inside the changes into names ("Glitter Shop Santhor Mok"),
    // so people never have to read a UUID.
    const refs: Record<string, string> = {};
    const wanted = new Map<string, Set<string>>();
    const collect = (obj: Record<string, unknown> | null | undefined) => {
      for (const [k, v] of Object.entries(obj ?? {})) {
        const target = REF_FIELDS[k];
        const ids = Array.isArray(v) ? v : [v];
        for (const one of ids) {
          if (target && typeof one === 'string' && UUID.test(one)) {
            if (!wanted.has(target)) wanted.set(target, new Set());
            wanted.get(target)!.add(one);
          }
        }
      }
    };
    for (const l of logs) {
      collect(l.changes?.old_value);
      collect(l.changes?.new_value);
      collect(l.details);
    }
    await Promise.all(
      [...wanted].map(async ([target, ids]) => {
        const c = LABELS[target];
        if (!c) return;
        const rows = (await this.dataSource.getRepository(c.target).find({
          where: { id: In([...ids]) } as never,
          withDeleted: true,
        })) as Record<string, unknown>[];
        for (const r of rows) {
          const name =
            target === 'product-variants'
              ? [r.variantSku, r.size, r.color].filter(Boolean).join(' · ')
              : (r[c.field] as string | null);
          if (name) refs[String(r.id)] = String(name);
        }
      }),
    );

    return {
      entity,
      id,
      refs,
      label:
        (cfg && record ? (record[cfg.field] as string | null) : null) ??
        // Untitled reviews: "★4 by Dara"
        (entity === 'reviews' && record
          ? `★${String(record.rating)} · ${String(record.reviewerName)}`
          : null) ??
        [...logs].reverse().find((l) => l.label)?.label ??
        null,
      status: record?.deletedAt
        ? 'deleted'
        : record
          ? 'active'
          : logs.length
            ? 'unknown'
            : 'not_found',
      summary: {
        created:
          who(
            logs.find((l) => l.action === 'create' && l.status === 'success'),
          ) ??
          (record?.createdAt
            ? { name: null, username: null, role: null, at: record.createdAt }
            : null),
        lastModified:
          who(lastOf(MODIFY)) ??
          (editedUntracked
            ? { name: null, username: null, role: null, at: updatedAt }
            : null),
        deleted: record?.deletedAt
          ? (who(lastOf(['delete'])) ?? {
              name: null,
              username: null,
              role: null,
              at: record.deletedAt,
            })
          : null,
        updatedAt: record?.updatedAt ?? null,
        totalActions: logs.length,
        untrackedBefore: !hasLog(['create']) && Boolean(createdAt),
      },
      entries,
    };
  }

  /** Latest actor of `action` for each (entity, id) pair. */
  async lastActors(
    pairs: { entity: string; id: string }[],
    action: string,
  ): Promise<Map<string, { name: string; username: string | null; at: Date }>> {
    const out = new Map<
      string,
      { name: string; username: string | null; at: Date }
    >();
    if (!pairs.length) return out;
    const rows = await this.repo
      .createQueryBuilder('a')
      .where('a.action = :action', { action })
      .andWhere('a.entityId IN (:...ids)', { ids: pairs.map((p) => p.id) })
      .orderBy('a.createdAt', 'DESC')
      .getMany();
    for (const r of rows) {
      const key = `${r.entity}:${r.entityId}`;
      if (!out.has(key))
        out.set(key, {
          name: r.actorName,
          username: r.actorUsername,
          at: r.createdAt,
        });
    }
    return out;
  }

  async findAll(q: AuditQuery) {
    const page = Math.max(1, q.page ?? 1);
    const limit = Math.min(100, Math.max(1, q.limit ?? 20));
    const cols: Record<string, string> = {
      createdAt: 'a.createdAt',
      actorName: 'a.actorName',
      action: 'a.action',
      label: 'a.label',
      status: 'a.status',
      entity: 'a.entity',
    };
    const dir = q.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const qb = this.repo
      .createQueryBuilder('a')
      .orderBy(
        cols[q.sortBy ?? ''] ?? 'a.createdAt',
        dir,
        dir === 'ASC' ? 'NULLS FIRST' : 'NULLS LAST',
      );
    if (q.sortBy && q.sortBy !== 'createdAt')
      qb.addOrderBy('a.createdAt', 'DESC');
    if (q.actorId) qb.andWhere('a.actorId = :actorId', { actorId: q.actorId });
    if (q.entity) qb.andWhere('a.entity = :entity', { entity: q.entity });
    if (q.entityId)
      qb.andWhere('a.entityId = :entityId', { entityId: q.entityId });
    if (q.action) qb.andWhere('a.action = :action', { action: q.action });
    if (q.status) qb.andWhere('a.status = :status', { status: q.status });
    if (q.module) qb.andWhere('a.module = :module', { module: q.module });
    if (q.suspicious === 'true') qb.andWhere('a.isSuspicious = true');
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
