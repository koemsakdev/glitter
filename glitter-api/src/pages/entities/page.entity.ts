import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** A custom storefront content page (About, FAQ, Terms…) served at `/<slug>`. */
@Entity('pages')
export class PageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150 })
  slug!: string;

  @Column({ type: 'varchar', length: 200, name: 'title_en' })
  titleEn!: string;

  @Column({ type: 'varchar', length: 200, name: 'title_km' })
  titleKm!: string;

  @Column({ type: 'text', nullable: true, name: 'body_en' })
  bodyEn!: string | null;

  @Column({ type: 'text', nullable: true, name: 'body_km' })
  bodyKm!: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_published' })
  isPublished!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
