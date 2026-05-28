/**
 * Lightweight i18n system. Just a Zustand store + a translations dictionary.
 */
import {create} from 'zustand';
import {persist} from 'zustand/middleware';

export type Language = 'en' | 'km';

const translations = {
    en: {
        // Login
        'login.title': 'Glitter Shop',
        'login.subtitle': 'Sign in to access the dashboard',
        'login.email': 'Email',
        'login.email.placeholder': 'admin@glittershop.com',
        'login.email.invalid': 'Please enter a valid email',
        'login.password': 'Password',
        'login.password.placeholder': 'Enter your password',
        'login.password.required': 'Password is required',
        'login.password.show': 'Show password',
        'login.password.hide': 'Hide password',
        'login.submit': 'Sign In',
        'login.welcome': 'Welcome back',
        'login.staffOnly': 'This dashboard is for staff only',

        // Toggles
        'theme.toggle': 'Toggle theme',
        'language.toggle': 'Change language',
        'language.english': 'English',
        'language.khmer': 'ភាសាខ្មែរ',

        // Sidebar groups
        'nav.main': 'Main',
        'nav.dashboard': 'Dashboard',
        'nav.group.catalog': 'Catalog',
        'nav.group.operations': 'Operations',
        'nav.group.settings': 'Settings',
        'nav.products': 'Products',
        'nav.categories': 'Categories',
        'nav.brands': 'Brands',
        'nav.productImages': 'Product Images',
        'nav.productVariants': 'Variants',
        'nav.productBadges': 'Badges',
        'nav.branches': 'Branches',
        'nav.inventory': 'Inventory',
        'nav.staff': 'Staff',
        'nav.users': 'Users',
        'nav.addresses': 'Addresses',
        'nav.appSettings': 'App Settings',

        // Topbar / user menu
        'user.profile': 'Profile',
        'user.changePassword': 'Change password',
        'user.logout': 'Logout',
        'user.notifications': 'Notifications',

        // Dashboard home
        'dashboard.welcome': 'Welcome back',
        'dashboard.overview': 'Here is an overview of your shop',
        'dashboard.totalProducts': 'Total Products',
        'dashboard.totalUsers': 'Total Users',
        'dashboard.totalBranches': 'Total Branches',
        'dashboard.totalCategories': 'Categories',

        // Common
        'common.loading': 'Loading...',
        'common.search': 'Search...',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.create': 'Create',
        'common.actions': 'Actions',
        'common.comingSoon': 'Coming soon',
        'common.toast.success': 'Success',
        'common.toast.error': 'Error',
        'common.toast.warning': 'Warning',
        'common.toast.info': 'Information',
        'common.toast.loading': 'Loading...',
        'common.toast.logout': 'Logging out...',
        'common.toast.wait': 'Please wait a moment',
        'common.toast.logout.success': 'Thank you for using Glitter Shop! See you next time.',
        'common.toast.logout.fail': 'Failed to logout! Please try again.',

        // Brands
        'brand.list.title': 'Brands',
        'brand.list.subtitle': 'Manage product brands',
        'brand.list.search': 'Search brands...',
        'brand.list.empty': 'No brands found. Create your first brand.',
        'brand.list.loading': 'Loading brands...',
        'brand.list.column.name': 'Name',
        'brand.list.column.slug': 'Slug',
        'brand.list.column.website': 'Website',
        'brand.list.column.status': 'Status',
        'brand.list.column.created': 'Created',
        'brand.action.create': 'Create Brand',
        'brand.action.view': 'View Detail',
        'brand.action.edit': 'Edit',
        'brand.action.delete': 'Delete',
        'brand.field.name': 'Name',
        'brand.field.slug': 'Slug',
        'brand.field.slug.help': 'URL-friendly (lowercase, numbers, hyphens)',
        'brand.field.website': 'Website URL',
        'brand.field.description': 'Description',
        'brand.field.status': 'Status',
        'brand.field.logo': 'Logo',
        'brand.field.logo.help': 'Optional. PNG/JPG/WebP, max 2 MB.',
        'brand.field.logo.replace': 'Replace logo',
        'brand.field.logo.remove': 'Remove logo',
        'brand.status.active': 'Active',
        'brand.status.inactive': 'Inactive',
        'brand.status.all': 'All statuses',
        'brand.create.title': 'Create Brand',
        'brand.create.submit': 'Create',
        'brand.create.success': 'Brand created',
        'brand.edit.title': 'Edit Brand',
        'brand.edit.submit': 'Save Changes',
        'brand.edit.success': 'Brand updated',
        'brand.delete.title': 'Delete Brand?',
        'brand.delete.message': 'This will permanently delete "{name}". This action cannot be undone.',
        'brand.delete.confirm': 'Yes, delete',
        'brand.delete.success': 'Brand deleted',
        'brand.validation.nameRequired': 'Name is required',
        'brand.validation.slugRequired': 'Slug is required',
        'brand.validation.slugFormat': 'Slug must be lowercase letters, numbers, and hyphens only',
        'brand.validation.urlInvalid': 'Must be a valid URL',
        'brand.sort.label': 'Sort',
        'brand.sort.newest': 'Newest First',
        'brand.sort.oldest': 'Oldest First',
        'brand.sort.nameAsc': 'Name (A → Z)',
        'brand.sort.nameDesc': 'Name (Z → A)',
        'brand.sort.recentlyUpdated': 'Recently Updated',
        'brand.ai.generateWebsite': 'Generate website with AI',
        'brand.ai.generateDescription': 'Generate description with AI',
        'brand.ai.nameRequired': 'Please enter a brand name first',
        'brand.ai.notFound': 'AI could not find information for this brand',
        'brand.ai.success': 'Generated successfully',
        'brand.detail.backToList': 'Back to brands',
        'brand.detail.information': 'Information',
        'brand.detail.informationDescription': 'Basic details about this brand',
        'brand.detail.description': 'Description',
        'brand.detail.descriptionHelp': 'Full description shown to customers',
        'brand.detail.noDescription': 'No description provided.',
        'brand.detail.metadata': 'Metadata',
        'brand.detail.updated': 'Last updated',
        'brand.detail.errorTitle': 'Could not load brand',
        'brand.detail.errorMessage': 'The brand you are looking for may have been deleted or does not exist.',

        // Category list
        'category.list.title': 'Categories',
        'category.list.subtitle': 'Manage product categories',
        'category.list.search': 'Search categories...',
        'category.list.empty': 'No categories found',
        'category.list.column.created': 'Created',

        // Category fields
        'category.field.icon': 'Icon',
        'category.field.icon.replace': 'Replace icon',
        'category.field.icon.remove': 'Remove icon',
        'category.field.icon.help': 'PNG, JPEG, WebP, or SVG (max 2 MB)',
        'category.field.name': 'Name',
        'category.field.nameEn': 'Name (English)',
        'category.field.nameKm': 'Name (Khmer)',
        'category.field.slug': 'Slug',
        'category.field.slug.help': 'URL-friendly identifier — lowercase letters, numbers, hyphens',
        'category.field.descriptionEn': 'Description (English)',
        'category.field.descriptionKm': 'Description (Khmer)',
        'category.field.displayOrder': 'Display Order',
        'category.field.displayOrder.help': 'Lower numbers appear first',
        'category.field.type': 'Type',
        'category.action.view': 'View details',
        'category.detail.backToList': 'Back to categories',
        'category.detail.information': 'Information',
        'category.detail.informationDescription': 'Basic details about this category',
        'category.detail.noDescription': 'No description provided.',
        'category.detail.metadata': 'Metadata',
        'category.detail.updated': 'Last updated',
        'category.detail.errorTitle': 'Could not load category',
        'category.detail.errorMessage': 'The category you are looking for may have been deleted or does not exist.',

        // Category types
        'category.type.all': 'All',
        'category.type.main': 'Main',
        'category.type.sub': 'Sub',
        'category.type.featured': 'Featured',

        // Category sort
        'category.sort.label': 'Sort',
        'category.sort.displayOrderAsc': 'Display order (ascending)',
        'category.sort.displayOrderDesc': 'Display order (descending)',
        'category.sort.newest': 'Newest first',
        'category.sort.oldest': 'Oldest first',
        'category.sort.nameEnAsc': 'Name EN (A → Z)',
        'category.sort.nameEnDesc': 'Name EN (Z → A)',
        'category.sort.nameKmAsc': 'Name KM (ក → អ)',
        'category.sort.recentlyUpdated': 'Recently updated',

        // Category actions
        'category.action.create': 'Create Category',
        'category.action.edit': 'Edit',
        'category.action.delete': 'Delete',

        // Create
        'category.create.title': 'Create Category',
        'category.create.submit': 'Create',
        'category.create.success': 'Category created successfully',

        // Edit
        'category.edit.title': 'Edit Category',
        'category.edit.submit': 'Save Changes',
        'category.edit.success': 'Category updated successfully',

        // Delete
        'category.delete.title': 'Delete category?',
        'category.delete.message': 'Are you sure you want to delete "{name}"? This action cannot be undone.',
        'category.delete.confirm': 'Delete',
        'category.delete.success': 'Category deleted successfully',

        // Validation
        'category.validation.nameEnRequired': 'English name is required',
        'category.validation.nameKmRequired': 'Khmer name is required',
        'category.validation.slugRequired': 'Slug is required',
        'category.validation.slugFormat': 'Slug must contain only lowercase letters, numbers, and hyphens',

        // AI
        'category.ai.generateDescriptionEn': 'Generate English description with AI',
        'category.ai.generateDescriptionKm': 'Generate Khmer description with AI',
        'category.ai.nameRequired': 'Please enter the category name first',
        'category.ai.notFound': 'AI could not generate a description',
        'category.ai.success': 'Generated successfully',
        'category.ai.busy': 'AI service is busy. Please try again in a moment.',

        // Product list
        'product.list.title': 'Products',
        'product.list.subtitle': 'Manage your product catalog',
        'product.list.search': 'Search products...',
        'product.list.empty': 'No products found',
        'product.list.emptyHelp': 'Start by creating your first product',

        // Product fields
        'product.field.image': 'Image',
        'product.field.name': 'Name',
        'product.field.nameEn': 'Name (English)',
        'product.field.nameKm': 'Name (Khmer)',
        'product.field.slug': 'Slug',
        'product.field.slug.help': 'URL-friendly identifier — lowercase letters, numbers, hyphens',
        'product.field.sku': 'SKU',
        'product.field.sku.help': 'Stock Keeping Unit — must be unique',
        'product.field.descriptionEn': 'Description (English)',
        'product.field.descriptionEn.help': 'Brief summary shown on product card',
        'product.field.descriptionKm': 'Description (Khmer)',
        'product.field.detailsEn': 'Details (English)',
        'product.field.detailsKm': 'Details (Khmer)',
        'product.field.price': 'Price',
        'product.field.price.help': 'Current selling price',
        'product.field.originalPrice': 'Original Price',
        'product.field.originalPrice.help': 'Original price before discount (optional)',
        'product.field.brand': 'Brand',
        'product.field.brand.placeholder': 'Select a brand',
        'product.field.brand.search': 'Search brands...',
        'product.field.brand.empty': 'No brands found',
        'product.field.category': 'Category',
        'product.field.category.placeholder': 'Select a category',
        'product.field.category.search': 'Search categories...',
        'product.field.category.empty': 'No categories found',
        'product.field.type': 'Type',
        'product.field.status': 'Status',
        'product.field.stock': 'Stock',
        'product.field.hasBox': 'Includes original box',
        'product.field.hasBox.help': 'Check if the product comes with its original packaging',
        'product.field.rating': 'Average Rating',
        'product.field.reviewCount': 'Reviews',

        // Filters
        'product.filter.allBrands': 'All brands',
        'product.filter.brand': 'Filter by brand',
        'product.filter.brandSearch': 'Search brands...',
        'product.filter.brandEmpty': 'No brands found',
        'product.filter.allCategories': 'All categories',
        'product.filter.category': 'Filter by category',
        'product.filter.categorySearch': 'Search categories...',
        'product.filter.categoryEmpty': 'No categories found',

        // Product status
        'product.status.all': 'All',
        'product.status.active': 'Active',
        'product.status.draft': 'Draft',
        'product.status.outOfStock': 'Out of Stock',
        'product.status.discontinued': 'Discontinued',
        'product.status.archived': 'Archived',

        // Product type
        'product.type.all': 'All',
        'product.type.standard': 'Standard',
        'product.type.featured': 'Featured',
        'product.type.limited': 'Limited',
        'product.type.exclusive': 'Exclusive',

        // Stock states
        'product.stock.outOfStock': 'Out of stock',
        'product.stock.low': 'Low',

        // Sort options
        'product.sort.label': 'Sort',
        'product.sort.newest': 'Newest first',
        'product.sort.oldest': 'Oldest first',
        'product.sort.priceLowToHigh': 'Price (low → high)',
        'product.sort.priceHighToLow': 'Price (high → low)',
        'product.sort.nameAsc': 'Name (A → Z)',
        'product.sort.nameDesc': 'Name (Z → A)',
        'product.sort.topRated': 'Top rated',
        'product.sort.recentlyUpdated': 'Recently updated',

        // Actions
        'product.action.view': 'View details',
        'product.action.edit': 'Edit',
        'product.action.delete': 'Delete',
        'product.action.create': 'Create Product',

        // Form sections
        'product.form.basic': 'Basic Information',
        'product.form.basicDescription': 'Names, descriptions, and product details',
        'product.form.pricing': 'Pricing',
        'product.form.pricingDescription': 'Set the selling price and optional discount',
        'product.form.organization': 'Organization',
        'product.form.organizationDescription': 'Categorize this product',
        'product.form.status': 'Visibility',

        // Create
        'product.create.title': 'Create Product',
        'product.create.subtitle': 'Add a new product to your catalog',
        'product.create.submit': 'Create Product',
        'product.create.success': 'Product created successfully',

        // Edit
        'product.edit.title': 'Edit Product',
        'product.edit.submit': 'Save Changes',
        'product.edit.success': 'Product updated successfully',

        // Delete
        'product.delete.title': 'Delete product?',
        'product.delete.message': 'Are you sure you want to delete "{name}"? This will also remove all its variants and images. This action cannot be undone.',
        'product.delete.confirm': 'Delete',
        'product.delete.success': 'Product deleted successfully',

        // Detail page
        'product.detail.backToList': 'Back to products',
        'product.detail.backToDetail': 'Back to product',
        'product.detail.errorTitle': 'Could not load product',
        'product.detail.errorMessage': 'The product you are looking for may have been deleted or does not exist.',
        'product.detail.pricing': 'Pricing',
        'product.detail.inventory': 'Inventory',
        'product.detail.organization': 'Organization',
        'product.detail.reviews': 'Reviews',
        'product.detail.metadata': 'Metadata',
        'product.detail.created': 'Created',
        'product.detail.updated': 'Last updated',
        'product.detail.noDescription': 'No description provided.',
        'product.detail.noDetails': 'No details provided.',
        'product.detail.images': 'Images',
        'product.detail.imagesComingSoon': 'Image gallery management — coming in Phase 1B',
        'product.detail.variants': 'Variants',
        'product.detail.variantsComingSoon': 'Size and color variants — coming in Phase 1C',
        'product.detail.badges': 'Badges',
        'product.detail.badgesComingSoon': 'Product badges — coming in Phase 1D',

        // Validation
        'product.validation.nameEnRequired': 'English name is required',
        'product.validation.nameKmRequired': 'Khmer name is required',
        'product.validation.nameTooLong': 'Name is too long (max 255 characters)',
        'product.validation.slugRequired': 'Slug is required',
        'product.validation.slugFormat': 'Slug must contain only lowercase letters, numbers, and hyphens',
        'product.validation.slugTooLong': 'Slug is too long (max 255 characters)',
        'product.validation.skuRequired': 'SKU is required',
        'product.validation.skuTooLong': 'SKU is too long (max 100 characters)',
        'product.validation.categoryRequired': 'Category is required',
        'product.validation.brandRequired': 'Brand is required',
        'product.validation.priceMin': 'Price must be 0 or greater',

        // AI
        'product.ai.generateDescriptionEn': 'Generate English description with AI',
        'product.ai.generateDescriptionKm': 'Generate Khmer description with AI',
        'product.ai.nameRequired': 'Please enter the product name first',
        'product.ai.notFound': 'AI could not generate a description',
        'product.ai.success': 'Generated successfully',
        'product.ai.busy': 'AI service is busy. Please try again in a moment.',

        // Common (if missing)
        'common.yes': 'Yes',
        'common.no': 'No',

        // Image form section
        'product.form.images': 'Product Images',
        'product.form.imagesDescription': 'Upload up to 10 images. The starred image is shown first.',

        // Image uploader UI
        'product.image.dropzoneTitle': 'Click to upload images',
        'product.image.dropzoneHelp': 'PNG, JPG, or WebP · max 10 MB each',
        'product.image.count': '{current} of {max} images',
        'product.image.tooMany': 'You can only upload up to {max} images per product',
        'product.image.invalidType': 'Only PNG, JPG, and WebP images are allowed',
        'product.image.tooLarge': '{name} exceeds the 10 MB size limit',
        'product.image.uploadSuccess': 'Images uploaded successfully',
        'product.image.primaryUpdated': 'Primary image updated',
        'product.image.deleted': 'Image deleted',

        // Submit button states (create flow)
        'product.create.creating': 'Creating product…',
        'product.create.uploadingImages': 'Uploading images…',
        'product.create.finalizing': 'Finalizing…',

        // Detail page
        'product.detail.imagesCount': '{count} image(s)',
        'product.detail.noImages': 'No images uploaded yet',

        // Variants form section
        'product.form.variants': 'Variants & Stock',
        'product.form.variantsDescription': 'Manage size, color, and stock for this product',

        // Variants UI
        'product.variant.toggle': 'This product has multiple sizes or colors',
        'product.variant.toggleHelp': 'Enable to manage individual sizes, colors, and per-variant stock. Leave unchecked for simple products.',
        'product.variant.singleStock': 'Stock',
        'product.variant.singleStockHelp': 'Total quantity available',
        'product.variant.add': 'Add Variant',
        'product.variant.empty': 'No variants yet. Click "Add Variant" to start.',
        'product.variant.created': 'Variant created',
        'product.variant.updated': 'Variant updated',
        'product.variant.deleted': 'Variant deleted',
        'product.variant.skuRequired': 'Variant SKU is required',
        'product.variant.duplicateCombo': 'A variant with this size and color already exists',

        // Table columns
        'product.variant.col.size': 'Size',
        'product.variant.col.color': 'Color',
        'product.variant.col.sku': 'SKU',
        'product.variant.col.stock': 'Stock',
        'product.variant.col.priceOverride': 'Price Override',
        'product.variant.col.effectivePrice': 'Price',

        // Submit steps (create flow with variants)
        'product.create.creatingVariants': 'Creating variants…',

        // Detail page
        'product.detail.variantsCount': '{count} variant(s)',
        'product.detail.noVariants': 'No variants configured',

        'product.save.savingProduct': 'Saving product…',
        'product.save.savingImages': 'Saving images…',
        'product.save.savingVariants': 'Saving variants…',
        'product.variant.sizeOrColorRequired': 'Each variant needs at least a size or a color',

        'product.variant.duplicateSku': 'Duplicate SKU: {sku}',
        'product.image.dropNow': 'Drop images here',
        'product.image.dragHint': 'Drag and drop to add more',

        'product.ai.generateDetailsEn': 'Generate English details with AI',
        'product.ai.generateDetailsKm': 'Generate Khmer details with AI',
    },
    km: {
        // Login
        'login.title': 'ហ្គ្លីតធើ សប',
        'login.subtitle': 'ចូលប្រព័ន្ធដើម្បីប្រើប្រាស់ផ្ទាំងគ្រប់គ្រង',
        'login.email': 'អ៊ីមែល',
        'login.email.placeholder': 'admin@glittershop.com',
        'login.email.invalid': 'សូមបញ្ចូលអ៊ីមែលត្រឹមត្រូវ',
        'login.password': 'ពាក្យសម្ងាត់',
        'login.password.placeholder': 'បញ្ចូលពាក្យសម្ងាត់របស់អ្នក',
        'login.password.required': 'តម្រូវឲ្យបញ្ចូលពាក្យសម្ងាត់',
        'login.password.show': 'បង្ហាញពាក្យសម្ងាត់',
        'login.password.hide': 'លាក់ពាក្យសម្ងាត់',
        'login.submit': 'ចូលប្រព័ន្ធ',
        'login.welcome': 'សូមស្វាគមន៍',
        'login.staffOnly': 'ផ្ទាំងគ្រប់គ្រងនេះសម្រាប់តែបុគ្គលិក',

        // Toggles
        'theme.toggle': 'ប្ដូររូបរាង',
        'language.toggle': 'ប្ដូរភាសា',
        'language.english': 'English',
        'language.khmer': 'ភាសាខ្មែរ',

        // Sidebar groups
        'nav.main': 'ទំព័រដើម',
        'nav.dashboard': 'ផ្ទាំងគ្រប់គ្រង',
        'nav.group.catalog': 'ផលិតផល',
        'nav.group.operations': 'ប្រតិបត្តិការ',
        'nav.group.settings': 'ការកំណត់',
        'nav.products': 'ផលិតផល',
        'nav.categories': 'ប្រភេទ',
        'nav.brands': 'ម៉ាក',
        'nav.productImages': 'រូបភាពផលិតផល',
        'nav.productVariants': 'ប្រភេទផលិតផល',
        'nav.productBadges': 'ស្លាកសញ្ញា',
        'nav.branches': 'សាខា',
        'nav.inventory': 'ស្តុក',
        'nav.staff': 'បុគ្គលិក',
        'nav.users': 'អ្នកប្រើប្រាស់',
        'nav.addresses': 'អាសយដ្ឋាន',
        'nav.appSettings': 'ការកំណត់កម្មវិធី',

        // Topbar / user menu
        'user.profile': 'ប្រវត្តិរូប',
        'user.changePassword': 'ប្ដូរពាក្យសម្ងាត់',
        'user.logout': 'ចាកចេញ',
        'user.notifications': 'ការជូនដំណឹង',

        // Dashboard home
        'dashboard.welcome': 'សូមស្វាគមន៍',
        'dashboard.overview': 'ទិដ្ឋភាពទូទៅនៃហាងរបស់អ្នក',
        'dashboard.totalProducts': 'ផលិតផលសរុប',
        'dashboard.totalUsers': 'អ្នកប្រើប្រាស់សរុប',
        'dashboard.totalBranches': 'សាខាសរុប',
        'dashboard.totalCategories': 'ប្រភេទ',

        // Common
        'common.loading': 'កំពុងផ្ទុក...',
        'common.search': 'ស្វែងរក...',
        'common.cancel': 'បោះបង់',
        'common.save': 'រក្សាទុក',
        'common.delete': 'លុប',
        'common.edit': 'កែប្រែ',
        'common.create': 'បង្កើត',
        'common.actions': 'សកម្មភាព',
        'common.comingSoon': 'នឹងមកដល់ឆាប់ៗ',
        'common.toast.success': 'ជោគជ័យ',
        'common.toast.error': 'មានបញ្ហា',
        'common.toast.warning': 'ការព្រមាន',
        'common.toast.info': 'ព័ត៌មាន',
        'common.toast.loading': 'សូមរង់ចាំ...',
        'common.toast.logout': 'កំពុងចាកចេញ...',
        'common.toast.wait': 'សូមរង់ចាំមួយភ្លែត',
        'common.toast.logout.success': 'សូមអរគុណសម្រាប់ការប្រើប្រាស់ហ្គ្លីតធើ សប! ជួបគ្នាថ្ងៃក្រោយ។',
        'common.toast.logout.fail': 'មិនអាចចាកចេញបាន! សូមព្យាយាមម្តងទៀត។',

        // Brands
        'brand.list.title': 'ម៉ាក',
        'brand.list.subtitle': 'គ្រប់គ្រងម៉ាកផលិតផល',
        'brand.list.search': 'ស្វែងរកម៉ាក...',
        'brand.list.empty': 'រកមិនឃើញម៉ាក។ បង្កើតម៉ាកដំបូងរបស់អ្នក។',
        'brand.list.loading': 'កំពុងផ្ទុកម៉ាក...',
        'brand.list.column.name': 'ឈ្មោះ',
        'brand.list.column.slug': 'ស្លាក',
        'brand.list.column.website': 'គេហទំព័រ',
        'brand.list.column.status': 'ស្ថានភាព',
        'brand.list.column.created': 'បានបង្កើត',
        'brand.action.create': 'បង្កើតម៉ាក',
        'brand.action.view': 'មើលលម្អិត',
        'brand.action.edit': 'កែប្រែ',
        'brand.action.delete': 'លុប',
        'brand.field.name': 'ឈ្មោះ',
        'brand.field.slug': 'ស្លាក',
        'brand.field.slug.help': 'អត្តសញ្ញាណ URL (អក្សរតូច លេខ និងសញ្ញា -)',
        'brand.field.website': 'URL គេហទំព័រ',
        'brand.field.description': 'ការពិពណ៌នា',
        'brand.field.status': 'ស្ថានភាព',
        'brand.field.logo': 'រូបសញ្ញា',
        'brand.field.logo.help': 'ស្រេចចិត្ត។ PNG/JPG/WebP អតិបរមា 2 MB។',
        'brand.field.logo.replace': 'ប្ដូររូបសញ្ញា',
        'brand.field.logo.remove': 'លុបរូបសញ្ញា',
        'brand.status.active': 'សកម្ម',
        'brand.status.inactive': 'អសកម្ម',
        'brand.status.all': 'គ្រប់ស្ថានភាព',
        'brand.create.title': 'បង្កើតម៉ាក',
        'brand.create.submit': 'បង្កើត',
        'brand.create.success': 'បានបង្កើតម៉ាក',
        'brand.edit.title': 'កែប្រែម៉ាក',
        'brand.edit.submit': 'រក្សាទុកការផ្លាស់ប្ដូរ',
        'brand.edit.success': 'បានកែប្រែម៉ាក',
        'brand.delete.title': 'លុបម៉ាក?',
        'brand.delete.message': 'នេះនឹងលុប "{name}" ជាអចិន្ត្រៃយ៍។ សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។',
        'brand.delete.confirm': 'យល់ព្រម លុប',
        'brand.delete.success': 'បានលុបម៉ាក',
        'brand.validation.nameRequired': 'តម្រូវឲ្យបញ្ចូលឈ្មោះ',
        'brand.validation.slugRequired': 'តម្រូវឲ្យបញ្ចូលស្លាក',
        'brand.validation.slugFormat': 'ស្លាកត្រូវមានតែអក្សរតូច លេខ និងសញ្ញា - ប៉ុណ្ណោះ',
        'brand.validation.urlInvalid': 'ត្រូវជា URL ត្រឹមត្រូវ',
        'brand.sort.label': 'តម្រៀប',
        'brand.sort.newest': 'ថ្មីបំផុតមុន',
        'brand.sort.oldest': 'ចាស់បំផុតមុន',
        'brand.sort.nameAsc': 'ឈ្មោះ (A → Z)',
        'brand.sort.nameDesc': 'ឈ្មោះ (Z → A)',
        'brand.sort.recentlyUpdated': 'បានកែសម្រួលថ្មីៗ',
        'brand.ai.generateWebsite': 'បង្កើតគេហទំព័រដោយប្រើ AI',
        'brand.ai.generateDescription': 'បង្កើតការពិពណ៌នាដោយប្រើ AI',
        'brand.ai.nameRequired': 'សូមបញ្ចូលឈ្មោះម៉ាកជាមុនសិន',
        'brand.ai.notFound': 'AI មិនអាចរកព័ត៌មានសម្រាប់ម៉ាកនេះបានទេ',
        'brand.ai.success': 'បង្កើតបានជោគជ័យ',
        'brand.detail.backToList': 'ត្រលប់ទៅម៉ាក',
        'brand.detail.information': 'ព័ត៌មាន',
        'brand.detail.informationDescription': 'ព័ត៌មានមូលដ្ឋានអំពីម៉ាកនេះ',
        'brand.detail.description': 'ការពិពណ៌នា',
        'brand.detail.descriptionHelp': 'ការពិពណ៌នាពេញលេញដែលបង្ហាញដល់អតិថិជន',
        'brand.detail.noDescription': 'មិនមានការពិពណ៌នាទេ។',
        'brand.detail.metadata': 'ទិន្នន័យមេតា',
        'brand.detail.updated': 'បានកែសម្រួលចុងក្រោយ',
        'brand.detail.errorTitle': 'មិនអាចផ្ទុកម៉ាកបានទេ',
        'brand.detail.errorMessage': 'ម៉ាកដែលអ្នកកំពុងស្វែងរកប្រហែលជាត្រូវបានលុបឬមិនមាន។',


        // Category list
        'category.list.title': 'ប្រភេទផលិតផល',
        'category.list.subtitle': 'គ្រប់គ្រងប្រភេទផលិតផល',
        'category.list.search': 'ស្វែងរកប្រភេទ...',
        'category.list.empty': 'រកមិនឃើញប្រភេទទេ',
        'category.list.column.created': 'បានបង្កើត',

        // Category fields
        'category.field.icon': 'រូបសញ្ញា',
        'category.field.icon.replace': 'ប្តូររូបសញ្ញា',
        'category.field.icon.remove': 'លុបរូបសញ្ញា',
        'category.field.icon.help': 'PNG, JPEG, WebP, ឬ SVG (ធំបំផុត 2 MB)',
        'category.field.name': 'ឈ្មោះ',
        'category.field.nameEn': 'ឈ្មោះ (អង់គ្លេស)',
        'category.field.nameKm': 'ឈ្មោះ (ខ្មែរ)',
        'category.field.slug': 'Slug',
        'category.field.slug.help': 'អត្តសញ្ញាណរ URL — អក្សរតូច លេខ និងសញ្ញាដាច់',
        'category.field.descriptionEn': 'ការពិពណ៌នា (អង់គ្លេស)',
        'category.field.descriptionKm': 'ការពិពណ៌នា (ខ្មែរ)',
        'category.field.displayOrder': 'លំដាប់បង្ហាញ',
        'category.field.displayOrder.help': 'លេខតូចជាងបង្ហាញមុន',
        'category.field.type': 'ប្រភេទ',

        // Category types
        'category.type.all': 'ទាំងអស់',
        'category.type.main': 'ចម្បង',
        'category.type.sub': 'រង',
        'category.type.featured': 'បានណែនាំ',

        // Category sort
        'category.sort.label': 'តម្រៀប',
        'category.sort.displayOrderAsc': 'លំដាប់បង្ហាញ (តិច → ច្រើន)',
        'category.sort.displayOrderDesc': 'លំដាប់បង្ហាញ (ច្រើន → តិច)',
        'category.sort.newest': 'ថ្មីបំផុតមុន',
        'category.sort.oldest': 'ចាស់បំផុតមុន',
        'category.sort.nameEnAsc': 'ឈ្មោះអង់គ្លេស (A → Z)',
        'category.sort.nameEnDesc': 'ឈ្មោះអង់គ្លេស (Z → A)',
        'category.sort.nameKmAsc': 'ឈ្មោះខ្មែរ (ក → អ)',
        'category.sort.recentlyUpdated': 'បានកែសម្រួលថ្មីៗ',

        // Category actions
        'category.action.create': 'បង្កើតប្រភេទ',
        'category.action.edit': 'កែសម្រួល',
        'category.action.delete': 'លុប',

        // Create
        'category.create.title': 'បង្កើតប្រភេទ',
        'category.create.submit': 'បង្កើត',
        'category.create.success': 'ប្រភេទត្រូវបានបង្កើតដោយជោគជ័យ',

        // Edit
        'category.edit.title': 'កែសម្រួលប្រភេទ',
        'category.edit.submit': 'រក្សាទុក',
        'category.edit.success': 'ប្រភេទត្រូវបានកែសម្រួលដោយជោគជ័យ',

        // Delete
        'category.delete.title': 'លុបប្រភេទមែនទេ?',
        'category.delete.message': 'តើអ្នកប្រាកដជាចង់លុប "{name}" មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។',
        'category.delete.confirm': 'លុប',
        'category.delete.success': 'ប្រភេទត្រូវបានលុបដោយជោគជ័យ',

        // Validation
        'category.validation.nameEnRequired': 'តម្រូវឱ្យបញ្ចូលឈ្មោះអង់គ្លេស',
        'category.validation.nameKmRequired': 'តម្រូវឱ្យបញ្ចូលឈ្មោះខ្មែរ',
        'category.validation.slugRequired': 'តម្រូវឱ្យបញ្ចូល Slug',
        'category.validation.slugFormat': 'Slug ត្រូវមានតែអក្សរតូច លេខ និងសញ្ញាដាច់',

        // AI
        'category.ai.generateDescriptionEn': 'បង្កើតការពិពណ៌នាអង់គ្លេសដោយ AI',
        'category.ai.generateDescriptionKm': 'បង្កើតការពិពណ៌នាខ្មែរដោយ AI',
        'category.ai.nameRequired': 'សូមបញ្ចូលឈ្មោះប្រភេទជាមុនសិន',
        'category.ai.notFound': 'AI មិនអាចបង្កើតការពិពណ៌នាបានទេ',
        'category.ai.success': 'បង្កើតបានជោគជ័យ',
        'category.ai.busy': 'សេវាកម្ម AI កំពុងរវល់។ សូមព្យាយាមម្តងទៀតក្នុងពេលឆាប់ៗ។',
        'category.action.view': 'មើលលម្អិត',
        'category.detail.backToList': 'ត្រលប់ទៅប្រភេទ',
        'category.detail.information': 'ព័ត៌មាន',
        'category.detail.informationDescription': 'ព័ត៌មានមូលដ្ឋានអំពីប្រភេទនេះ',
        'category.detail.noDescription': 'មិនមានការពិពណ៌នាទេ។',
        'category.detail.metadata': 'ទិន្នន័យមេតា',
        'category.detail.updated': 'បានកែសម្រួលចុងក្រោយ',
        'category.detail.errorTitle': 'មិនអាចផ្ទុកប្រភេទបានទេ',
        'category.detail.errorMessage': 'ប្រភេទដែលអ្នកកំពុងស្វែងរកប្រហែលជាត្រូវបានលុបឬមិនមាន។',

        // Product list
        'product.list.title': 'ផលិតផល',
        'product.list.subtitle': 'គ្រប់គ្រងកាតាឡុកផលិតផល',
        'product.list.search': 'ស្វែងរកផលិតផល...',
        'product.list.empty': 'រកមិនឃើញផលិតផលទេ',
        'product.list.emptyHelp': 'ចាប់ផ្តើមដោយការបង្កើតផលិតផលដំបូងរបស់អ្នក',

        // Product fields
        'product.field.image': 'រូបភាព',
        'product.field.name': 'ឈ្មោះ',
        'product.field.nameEn': 'ឈ្មោះ (អង់គ្លេស)',
        'product.field.nameKm': 'ឈ្មោះ (ខ្មែរ)',
        'product.field.slug': 'Slug',
        'product.field.slug.help': 'អត្តសញ្ញាណរ URL — អក្សរតូច លេខ និងសញ្ញាដាច់',
        'product.field.sku': 'SKU',
        'product.field.sku.help': 'លេខកូដស្តុក — ត្រូវតែមានតែមួយ',
        'product.field.descriptionEn': 'ការពិពណ៌នា (អង់គ្លេស)',
        'product.field.descriptionEn.help': 'សេចក្តីសង្ខេបខ្លីៗបង្ហាញនៅលើកាតផលិតផល',
        'product.field.descriptionKm': 'ការពិពណ៌នា (ខ្មែរ)',
        'product.field.detailsEn': 'ព័ត៌មានលម្អិត (អង់គ្លេស)',
        'product.field.detailsKm': 'ព័ត៌មានលម្អិត (ខ្មែរ)',
        'product.field.price': 'តម្លៃ',
        'product.field.price.help': 'តម្លៃលក់បច្ចុប្បន្ន',
        'product.field.originalPrice': 'តម្លៃដើម',
        'product.field.originalPrice.help': 'តម្លៃដើមមុនបញ្ចុះ (ស្រេចចិត្ត)',
        'product.field.brand': 'ម៉ាក',
        'product.field.brand.placeholder': 'ជ្រើសរើសម៉ាក',
        'product.field.brand.search': 'ស្វែងរកម៉ាក...',
        'product.field.brand.empty': 'រកមិនឃើញម៉ាកទេ',
        'product.field.category': 'ប្រភេទ',
        'product.field.category.placeholder': 'ជ្រើសរើសប្រភេទ',
        'product.field.category.search': 'ស្វែងរកប្រភេទ...',
        'product.field.category.empty': 'រកមិនឃើញប្រភេទទេ',
        'product.field.type': 'ប្រភេទ',
        'product.field.status': 'ស្ថានភាព',
        'product.field.stock': 'ស្តុក',
        'product.field.hasBox': 'រួមមានប្រអប់ដើម',
        'product.field.hasBox.help': 'ធីកប្រសិនបើផលិតផលមកជាមួយវេចខ្ចប់ដើម',
        'product.field.rating': 'ការវាយតម្លៃជាមធ្យម',
        'product.field.reviewCount': 'ការវាយតម្លៃ',

        // Filters
        'product.filter.allBrands': 'ម៉ាកទាំងអស់',
        'product.filter.brand': 'តម្រងតាមម៉ាក',
        'product.filter.brandSearch': 'ស្វែងរកម៉ាក...',
        'product.filter.brandEmpty': 'រកមិនឃើញម៉ាកទេ',
        'product.filter.allCategories': 'ប្រភេទទាំងអស់',
        'product.filter.category': 'តម្រងតាមប្រភេទ',
        'product.filter.categorySearch': 'ស្វែងរកប្រភេទ...',
        'product.filter.categoryEmpty': 'រកមិនឃើញប្រភេទទេ',

        // Product status
        'product.status.all': 'ទាំងអស់',
        'product.status.active': 'សកម្ម',
        'product.status.draft': 'ព្រាង',
        'product.status.outOfStock': 'អស់ស្តុក',
        'product.status.discontinued': 'ឈប់លក់',
        'product.status.archived': 'រក្សាទុក',

        // Product type
        'product.type.all': 'ទាំងអស់',
        'product.type.standard': 'ស្តង់ដារ',
        'product.type.featured': 'លេចធ្លោ',
        'product.type.limited': 'មានកំណត់',
        'product.type.exclusive': 'ផ្តាច់មុខ',

        // Stock states
        'product.stock.outOfStock': 'អស់ស្តុក',
        'product.stock.low': 'តិច',

        // Sort options
        'product.sort.label': 'តម្រៀប',
        'product.sort.newest': 'ថ្មីបំផុតមុន',
        'product.sort.oldest': 'ចាស់បំផុតមុន',
        'product.sort.priceLowToHigh': 'តម្លៃ (តិច → ច្រើន)',
        'product.sort.priceHighToLow': 'តម្លៃ (ច្រើន → តិច)',
        'product.sort.nameAsc': 'ឈ្មោះ (A → Z)',
        'product.sort.nameDesc': 'ឈ្មោះ (Z → A)',
        'product.sort.topRated': 'វាយតម្លៃខ្ពស់បំផុត',
        'product.sort.recentlyUpdated': 'បានកែសម្រួលថ្មីៗ',

        // Actions
        'product.action.view': 'មើលលម្អិត',
        'product.action.edit': 'កែសម្រួល',
        'product.action.delete': 'លុប',
        'product.action.create': 'បង្កើតផលិតផល',

        // Form sections
        'product.form.basic': 'ព័ត៌មានមូលដ្ឋាន',
        'product.form.basicDescription': 'ឈ្មោះ ការពិពណ៌នា និងព័ត៌មានលម្អិតផលិតផល',
        'product.form.pricing': 'តម្លៃ',
        'product.form.pricingDescription': 'កំណត់តម្លៃលក់ និងការបញ្ចុះតម្លៃជាជម្រើស',
        'product.form.organization': 'ការរៀបចំ',
        'product.form.organizationDescription': 'ចាត់ថ្នាក់ផលិតផលនេះ',
        'product.form.status': 'ការមើលឃើញ',

        // Create
        'product.create.title': 'បង្កើតផលិតផល',
        'product.create.subtitle': 'បន្ថែមផលិតផលថ្មីទៅកាតាឡុករបស់អ្នក',
        'product.create.submit': 'បង្កើតផលិតផល',
        'product.create.success': 'ផលិតផលត្រូវបានបង្កើតដោយជោគជ័យ',

        // Edit
        'product.edit.title': 'កែសម្រួលផលិតផល',
        'product.edit.submit': 'រក្សាទុក',
        'product.edit.success': 'ផលិតផលត្រូវបានកែសម្រួលដោយជោគជ័យ',

        // Delete
        'product.delete.title': 'លុបផលិតផលមែនទេ?',
        'product.delete.message': 'តើអ្នកប្រាកដជាចង់លុប "{name}" មែនទេ? វានឹងលុបវ៉ារ្យង់និងរូបភាពទាំងអស់របស់វាផងដែរ។ សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។',
        'product.delete.confirm': 'លុប',
        'product.delete.success': 'ផលិតផលត្រូវបានលុបដោយជោគជ័យ',

        // Detail page
        'product.detail.backToList': 'ត្រលប់ទៅផលិតផល',
        'product.detail.backToDetail': 'ត្រលប់ទៅផលិតផល',
        'product.detail.errorTitle': 'មិនអាចផ្ទុកផលិតផលបានទេ',
        'product.detail.errorMessage': 'ផលិតផលដែលអ្នកកំពុងស្វែងរកប្រហែលជាត្រូវបានលុបឬមិនមាន។',
        'product.detail.pricing': 'តម្លៃ',
        'product.detail.inventory': 'ស្តុក',
        'product.detail.organization': 'ការរៀបចំ',
        'product.detail.reviews': 'ការវាយតម្លៃ',
        'product.detail.metadata': 'ទិន្នន័យមេតា',
        'product.detail.created': 'បានបង្កើត',
        'product.detail.updated': 'បានកែសម្រួលចុងក្រោយ',
        'product.detail.noDescription': 'មិនមានការពិពណ៌នាទេ។',
        'product.detail.noDetails': 'មិនមានព័ត៌មានលម្អិតទេ។',
        'product.detail.images': 'រូបភាព',
        'product.detail.imagesComingSoon': 'ការគ្រប់គ្រងវិចិត្រសាលរូបភាព — នឹងមកដល់ក្នុង Phase 1B',
        'product.detail.variants': 'វ៉ារ្យង់',
        'product.detail.variantsComingSoon': 'វ៉ារ្យង់ទំហំ និងពណ៌ — នឹងមកដល់ក្នុង Phase 1C',
        'product.detail.badges': 'ស្លាក',
        'product.detail.badgesComingSoon': 'ស្លាកផលិតផល — នឹងមកដល់ក្នុង Phase 1D',

        // Validation
        'product.validation.nameEnRequired': 'តម្រូវឱ្យបញ្ចូលឈ្មោះអង់គ្លេស',
        'product.validation.nameKmRequired': 'តម្រូវឱ្យបញ្ចូលឈ្មោះខ្មែរ',
        'product.validation.nameTooLong': 'ឈ្មោះវែងពេក (អតិបរមា 255 តួអក្សរ)',
        'product.validation.slugRequired': 'តម្រូវឱ្យបញ្ចូល Slug',
        'product.validation.slugFormat': 'Slug ត្រូវមានតែអក្សរតូច លេខ និងសញ្ញាដាច់',
        'product.validation.slugTooLong': 'Slug វែងពេក (អតិបរមា 255 តួអក្សរ)',
        'product.validation.skuRequired': 'តម្រូវឱ្យបញ្ចូល SKU',
        'product.validation.skuTooLong': 'SKU វែងពេក (អតិបរមា 100 តួអក្សរ)',
        'product.validation.categoryRequired': 'តម្រូវឱ្យជ្រើសរើសប្រភេទ',
        'product.validation.brandRequired': 'តម្រូវឱ្យជ្រើសរើសម៉ាក',
        'product.validation.priceMin': 'តម្លៃត្រូវតែ 0 ឬច្រើនជាង',

        // AI
        'product.ai.generateDescriptionEn': 'បង្កើតការពិពណ៌នាអង់គ្លេសដោយ AI',
        'product.ai.generateDescriptionKm': 'បង្កើតការពិពណ៌នាខ្មែរដោយ AI',
        'product.ai.nameRequired': 'សូមបញ្ចូលឈ្មោះផលិតផលជាមុនសិន',
        'product.ai.notFound': 'AI មិនអាចបង្កើតការពិពណ៌នាបានទេ',
        'product.ai.success': 'បង្កើតបានជោគជ័យ',
        'product.ai.busy': 'សេវាកម្ម AI កំពុងរវល់។ សូមព្យាយាមម្តងទៀតក្នុងពេលឆាប់ៗ។',

        // Common
        'common.yes': 'បាទ/ចាស',
        'common.no': 'ទេ',

        // Image form section
        'product.form.images': 'រូបភាពផលិតផល',
        'product.form.imagesDescription': 'អាប់ឡូតរហូតដល់ 10 រូបភាព។ រូបភាពដែលមានផ្កាយត្រូវបានបង្ហាញដំបូង។',

        // Image uploader UI
        'product.image.dropzoneTitle': 'ចុចដើម្បីអាប់ឡូតរូបភាព',
        'product.image.dropzoneHelp': 'PNG, JPG, ឬ WebP · អតិបរមា 10 MB ក្នុងមួយរូប',
        'product.image.count': '{current} នៃ {max} រូបភាព',
        'product.image.tooMany': 'អ្នកអាចអាប់ឡូតបានរហូតដល់ {max} រូបភាពក្នុងផលិតផលមួយ',
        'product.image.invalidType': 'អនុញ្ញាតតែរូបភាព PNG, JPG, និង WebP ប៉ុណ្ណោះ',
        'product.image.tooLarge': '{name} លើសពីដែនកំណត់ 10 MB',
        'product.image.uploadSuccess': 'រូបភាពត្រូវបានអាប់ឡូតដោយជោគជ័យ',
        'product.image.primaryUpdated': 'រូបភាពចម្បងត្រូវបានកែសម្រួល',
        'product.image.deleted': 'រូបភាពត្រូវបានលុប',

        // Submit button states (create flow)
        'product.create.creating': 'កំពុងបង្កើតផលិតផល…',
        'product.create.uploadingImages': 'កំពុងអាប់ឡូតរូបភាព…',
        'product.create.finalizing': 'កំពុងបញ្ចប់…',

        // Detail page
        'product.detail.imagesCount': 'រូបភាព {count}',
        'product.detail.noImages': 'មិនទាន់មានរូបភាពទេ',

        // Variants form section
        'product.form.variants': 'វ៉ារ្យង់ និងស្តុក',
        'product.form.variantsDescription': 'គ្រប់គ្រងទំហំ ពណ៌ និងស្តុកសម្រាប់ផលិតផលនេះ',

        // Variants UI
        'product.variant.toggle': 'ផលិតផលនេះមានទំហំ ឬពណ៌ច្រើន',
        'product.variant.toggleHelp': 'បើកដើម្បីគ្រប់គ្រងទំហំ ពណ៌ និងស្តុកសម្រាប់វ៉ារ្យង់នីមួយៗ។ ទុកមិនធីកសម្រាប់ផលិតផលធម្មតា។',
        'product.variant.singleStock': 'ស្តុក',
        'product.variant.singleStockHelp': 'បរិមាណសរុបដែលមាន',
        'product.variant.add': 'បន្ថែមវ៉ារ្យង់',
        'product.variant.empty': 'មិនទាន់មានវ៉ារ្យង់ទេ។ ចុច "បន្ថែមវ៉ារ្យង់" ដើម្បីចាប់ផ្តើម។',
        'product.variant.created': 'វ៉ារ្យង់ត្រូវបានបង្កើត',
        'product.variant.updated': 'វ៉ារ្យង់ត្រូវបានកែសម្រួល',
        'product.variant.deleted': 'វ៉ារ្យង់ត្រូវបានលុប',
        'product.variant.skuRequired': 'តម្រូវឱ្យបញ្ចូល SKU វ៉ារ្យង់',
        'product.variant.duplicateCombo': 'វ៉ារ្យង់ដែលមានទំហំ និងពណ៌នេះមានស្រាប់',

        // Table columns
        'product.variant.col.size': 'ទំហំ',
        'product.variant.col.color': 'ពណ៌',
        'product.variant.col.sku': 'SKU',
        'product.variant.col.stock': 'ស្តុក',
        'product.variant.col.priceOverride': 'តម្លៃជំនួស',
        'product.variant.col.effectivePrice': 'តម្លៃ',

        // Submit steps
        'product.create.creatingVariants': 'កំពុងបង្កើតវ៉ារ្យង់…',

        // Detail page
        'product.detail.variantsCount': 'វ៉ារ្យង់ {count}',
        'product.detail.noVariants': 'មិនទាន់មានវ៉ារ្យង់',
        'product.save.savingProduct': 'កំពុងរក្សាទុកផលិតផល…',
        'product.save.savingImages': 'កំពុងរក្សាទុករូបភាព…',
        'product.save.savingVariants': 'កំពុងរក្សាទុកវ៉ារ្យង់…',
        'product.variant.sizeOrColorRequired': 'វ៉ារ្យង់នីមួយៗត្រូវការទំហំ ឬពណ៌យ៉ាងតិចមួយ',
        'product.variant.duplicateSku': 'SKU ស្ទួន៖ {sku}',
        'product.image.dropNow': 'ទម្លាក់រូបភាពនៅទីនេះ',
        'product.image.dragHint': 'អូស និងទម្លាក់ដើម្បីបន្ថែម',

        'product.ai.generateDetailsEn': 'បង្កើតព័ត៌មានលម្អិតអង់គ្លេសដោយ AI',
        'product.ai.generateDetailsKm': 'បង្កើតព័ត៌មានលម្អិតខ្មែរដោយ AI',
    },
} as const;

export type TranslationKey = keyof (typeof translations)['en'];

interface I18nState {
    language: Language;
    setLanguage: (language: Language) => void;
}

const useI18nStore = create<I18nState>()(
    persist(
        (set) => ({
            language: 'en',
            setLanguage: (language) => set({language}),
        }),
        {name: 'glitter_language'},
    ),
);

export function useI18n() {
    const language = useI18nStore((s) => s.language);
    const setLanguage = useI18nStore((s) => s.setLanguage);

    const t = (key: TranslationKey): string => {
        return translations[language][key] ?? translations.en[key] ?? key;
    };

    return {language, setLanguage, t};
}