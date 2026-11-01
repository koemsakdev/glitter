import { BadRequestException } from '@nestjs/common';

/**
 * Pricing rules (dashboard and API agree):
 *   selling price ≤ price before discount (when one is set), and
 *   selling price ≤ a variant's own price ≤ price before discount.
 */

const money = (n: number) => `$${n.toFixed(2)}`;

export function assertSellingPrice(
  price: number,
  originalPrice: number | null | undefined,
): void {
  const before = Number(originalPrice ?? 0);
  if (before > 0 && Number(price) > before) {
    throw new BadRequestException(
      `The selling price (${money(Number(price))}) can't be higher than the price before discount (${money(before)}).`,
    );
  }
}

export function assertVariantPrice(
  override: number | null | undefined,
  product:
    | { price: number | string; originalPrice: number | string | null }
    | null
    | undefined,
  label: string,
): void {
  if (override === null || override === undefined || !product) return;
  const price = Number(product.price);
  const before = Number(product.originalPrice ?? 0);
  if (override < price) {
    throw new BadRequestException(
      `${label}: price ${money(override)} can't be lower than the selling price (${money(price)}).`,
    );
  }
  if (before > 0 && override > before) {
    throw new BadRequestException(
      `${label}: price ${money(override)} can't be higher than the price before discount (${money(before)}).`,
    );
  }
}
