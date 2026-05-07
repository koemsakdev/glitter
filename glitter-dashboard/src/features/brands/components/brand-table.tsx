'use client';

import { format } from 'date-fns';
import {
  Edit,
  ExternalLink,
  ImageIcon,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getFileUrl } from '@/lib/file-url';
import { useI18n } from '@/lib/i18n';
import type { Brand } from '@/types/brand';

interface BrandTableProps {
  brands: Brand[];
  onEdit: (brand: Brand) => void;
  onDelete: (brand: Brand) => void;
}

export function BrandTable({ brands, onEdit, onDelete }: BrandTableProps) {
  const { t } = useI18n();

  if (brands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <ImageIcon className="size-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          {t('brand.list.empty')}
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">{t('brand.field.logo')}</TableHead>
          <TableHead>{t('brand.list.column.name')}</TableHead>
          <TableHead>{t('brand.list.column.slug')}</TableHead>
          <TableHead className="hidden md:table-cell">
            {t('brand.list.column.website')}
          </TableHead>
          <TableHead>{t('brand.list.column.status')}</TableHead>
          <TableHead className="hidden lg:table-cell">
            {t('brand.list.column.created')}
          </TableHead>
          <TableHead className="w-[60px] text-right">
            {t('common.actions')}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {brands.map((brand) => {
          const logoUrl = getFileUrl(brand.logoUrl);
          return (
            <TableRow key={brand.id}>
              <TableCell>
                <div className="flex size-10 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={brand.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="size-4 text-muted-foreground/40" />
                  )}
                </div>
              </TableCell>
              <TableCell className="font-medium">{brand.name}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {brand.slug}
              </TableCell>
              <TableCell className="hidden max-w-50 truncate md:table-cell">
                {brand.websiteUrl ? (
                  <a
                    href={brand.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-pink-600 hover:underline dark:text-pink-300"
                  >
                    <span className="truncate">
                      {brand.websiteUrl.replace(/^https?:\/\//, '')}
                    </span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={brand.status === 'active' ? 'default' : 'secondary'}
                  className={
                    brand.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : ''
                  }
                >
                  {t(`brand.status.${brand.status}` as never)}
                </Badge>
              </TableCell>
              <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                {format(new Date(brand.createdAt), 'PP')}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">
                          {t('common.actions')}
                        </span>
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(brand)}>
                      <Edit className="mr-2 size-4" />
                      {t('brand.action.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(brand)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 size-4" />
                      {t('brand.action.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}