import { ValueTransformer } from 'typeorm';

/**
 * Stores numeric/decimal columns as numbers in JS while persisting them as
 * fixed-precision decimals in Postgres. Without this, TypeORM returns `decimal`
 * columns as strings, which breaks arithmetic on money fields.
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null): number | null =>
    value === undefined || value === null ? null : value,
  from: (value?: string | null): number =>
    value === undefined || value === null ? 0 : Number(value),
};
