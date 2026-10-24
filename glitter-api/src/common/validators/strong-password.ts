import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Password policy for every account (staff and customers).
 *
 * TESTING: short, simple passwords are allowed. Before going live, set
 * PASSWORD_MIN_LENGTH to 8 and REQUIRE_MIXED to true (and the same two values
 * in the dashboard's and store's password-strength components).
 */
export const PASSWORD_MIN_LENGTH = 4;
export const REQUIRE_MIXED = false;

/** At least one lowercase letter, one uppercase letter and one digit. */
const MIXED = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const PASSWORD_MESSAGE = REQUIRE_MIXED
  ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include an uppercase letter, a lowercase letter and a number`
  : `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;

export function IsStrongPassword(): PropertyDecorator {
  const rules = [
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_MESSAGE }),
    MaxLength(128),
  ];
  if (REQUIRE_MIXED) rules.push(Matches(MIXED, { message: PASSWORD_MESSAGE }));
  return applyDecorators(...rules);
}
