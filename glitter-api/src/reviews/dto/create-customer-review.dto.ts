import { OmitType } from '@nestjs/swagger';
import { CreateReviewDto } from './create-review.dto';

/** A logged-in customer's review — name + verified status come from the server. */
export class CreateCustomerReviewDto extends OmitType(CreateReviewDto, [
  'reviewerName',
] as const) {}
