# 🛍️ Glitter Shop — E‑Commerce Platform

A full‑stack, bilingual (English / ខ្មែរ) e‑commerce system for a Cambodian retail shop, built as a Year‑4 thesis project. It consists of **three applications** sharing one database.

| App | Tech | Purpose | Users |
|---|---|---|---|
| **glitter-store** | Next.js (App Router) | Customer‑facing online shop | Customers, guests |
| **glitter-dashboard** | Next.js (App Router) | Admin/staff back‑office | Super admin, admin, manager, cashier |
| **glitter-api** | NestJS + TypeORM | REST API + realtime + business logic | (backend for both) |
| **Database** | PostgreSQL (Neon) | Single source of truth | — |

**Cross‑cutting features:** JWT auth (access + refresh), OAuth login (Google / Facebook / Telegram), realtime updates via SSE, AI shopping assistant (Google Gemini), image uploads, email OTP verification (SMTP), ABA **KHQR** payments, dark/light mode, and full EN/KM localization.

---

## 📑 Table of Contents
1. [System Architecture](#-system-architecture)
2. [User Roles & Permissions](#-user-roles--permissions)
3. [Storefront Features (glitter-store)](#-storefront-features-glitter-store)
4. [Dashboard Features (glitter-dashboard)](#-dashboard-features-glitter-dashboard)
5. [User Journey Flows](#-user-journey-flows)
6. [Diagrams](#-diagrams)
   - [Context Diagram (DFD Level 0)](#context-diagram--dfd-level-0)
   - [Data Flow Diagram — Level 1](#data-flow-diagram--level-1)
   - [Data Flow Diagram — Level 2 (Checkout & Payment)](#data-flow-diagram--level-2-checkout--payment)
   - [Entity Relationship Diagram (ERD)](#entity-relationship-diagram-erd)
   - [Relationship Diagram](#relationship-diagram)
7. [Getting Started](#-getting-started)
8. [Deployment](#-deployment)

---

## 🏗 System Architecture

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#ffffff","primaryBorderColor":"#000000","lineColor":"#000000","primaryTextColor":"#000000","fontFamily":"Arial"},"flowchart":{"curve":"step"}}}%%
flowchart LR
    subgraph Clients
      C["👤 Customer<br/>(Browser / Mobile web)"]
      S["🧑‍💼 Staff / Admin<br/>(Browser)"]
    end

    subgraph Frontends
      STORE["glitter-store<br/>(Next.js)"]
      DASH["glitter-dashboard<br/>(Next.js)"]
    end

    API["glitter-api<br/>(NestJS REST + SSE)"]
    DB[("PostgreSQL<br/>Neon")]

    subgraph External
      ABA["ABA PayWay<br/>(KHQR)"]
      OAUTH["Google / Facebook /<br/>Telegram OAuth"]
      GEMINI["Google Gemini<br/>(AI)"]
      SMTP["SMTP<br/>(Email OTP)"]
    end

    C --> STORE
    S --> DASH
    STORE <-->|REST + SSE| API
    DASH  <-->|REST + SSE| API
    API <--> DB
    API <--> ABA
    API <--> OAUTH
    API <--> GEMINI
    API <--> SMTP
```

- **REST** for all data operations; **SSE (`/api/realtime/events`)** pushes live updates (e.g. an admin edit instantly refreshes the storefront / dashboard lists).
- The API is a **persistent server** (needed for SSE + background reconciliation jobs), so it is hosted on a container platform (Render/Koyeb), while the two Next.js apps deploy to **Vercel**.

---

## 👥 User Roles & Permissions

Access is enforced by a global JWT guard plus a `@Roles()` guard on the API. There are **five roles**:

| Role | Where | Capabilities |
|---|---|---|
| **super_admin** | Dashboard | Full system control. Everything `admin` can do **plus** exclusive actions: manage staff & role assignments and critical global settings. |
| **admin** | Dashboard | Manage the full catalog, orders, customers, promotions, reviews, branches, inventory, and all content/app settings. |
| **manager** | Dashboard | Operational management: products, product variants/badges/images, categories, brands, colors, inventory (branch stock), and orders. No staff/critical‑settings access. |
| **cashier** | Dashboard (POS) | In‑store point‑of‑sale: create walk‑in orders, take payment, look up products & branch stock. No management screens. |
| **customer** | Storefront | Shop the store: browse, search/filter, cart, checkout, track orders, wishlist, write reviews, manage their account & addresses, connect social logins. No dashboard access. |

> Roles are hierarchical in practice: `super_admin ⊇ admin ⊇ manager`, with `cashier` scoped to sales operations and `customer` scoped to the storefront.

---

## 🛒 Storefront Features (glitter-store)

The customer web app — a native‑app‑style, bilingual (EN/KM), light/dark storefront.

### Browsing & Discovery
- **Home page** — configurable sections (hero **banner carousel**, best sellers, new arrivals, category grids, promotional strips) managed from the dashboard.
- **Product catalog** (`/products`) — paginated grid with:
  - **Live search** (debounced, instant results).
  - **Sort**: newest, price low→high, price high→low, name A→Z, top rated.
  - **Filters**: **price range** (min/max), **brand** multi‑select, **category** chips.
  - **Curated views**: "Best sellers" and "New arrivals" get a dedicated hero when reached from the home page.
- **Product detail** (`/products/[slug]`) — image gallery, variants (size/color with swatches), price/discount, stock/availability per branch, badges, star ratings & **reviews**, related products, add‑to‑cart with quantity, wishlist toggle.
- **Brands** (`/brands`) and **Categories** browsing.
- **Store locations** (`/stores`) — branch list with contact info.
- **Promotions** (`/promotion`) — active vouchers / offers.
- **Dynamic content pages** (`/[slug]`) and **About** page (managed in the dashboard).

### Cart & Checkout
- **Cart** (`/cart`) — item list with quantity steppers, remove, live subtotal, free‑delivery hint.
- **Checkout** (`/checkout`) — a Cambodia‑style flow:
  - **Shipping region**: Phnom Penh vs Province.
  - **Delivery method** (region‑filtered): COD, Grab, Pickup (branch selector), VET Express — each with its own fee and payment rule.
  - **Payment**: **ABA KHQR** (scan QR, upload proof) or **Cash** (COD / pay‑at‑pickup) depending on the method.
  - **Address**: text address + optional **Google Maps pin**; logged‑in users reuse saved addresses.
  - Server‑computed shipping fees (anti‑tamper), voucher application, order summary.
- **Order confirmation & receipt** — downloadable receipt (rendered to image).

### Account & Engagement
- **Register / Login** (`/account/login`, `/account/register`) — email+password or **Google / Facebook / Telegram** OAuth; **email OTP verification**.
- **My account** (`/account`) — profile, appearance settings (language + dark/light), **connected social accounts** (link/disconnect), phone validation.
- **My orders** (`/account/orders`, `/account/orders/[id]`) — native‑app order list + detail with status timeline and **receipt download**.
- **Wishlist** (`/account/wishlist`).
- **Notifications** — order/status updates.
- **🤖 AI Shopping Assistant** — a floating chatbot (animated robot launcher) that answers questions about **products** (incl. "find the cheapest"), **delivery & payment**, **store info**, and a signed‑in customer's **order status**, replying in the language the customer writes in.

---

## 🖥 Dashboard Features (glitter-dashboard)

The staff back‑office. Every module below is a set of list/detail/create/edit screens with search, realtime refresh, and role‑gated actions.

### Overview
- **Dashboard home** (`/dashboard`) — KPI stats (total orders, today's orders & revenue, order‑status breakdown) and charts.

### Catalog Management
- **Products** — full CRUD with a rich multi‑section form: basic info (bilingual), pricing (price + original/discount), **variants** (size/color/hex, per‑variant stock & price override), **images** (multi‑upload, primary), **badges**, **organization** (category/brand/type/status), **related products**, and **AI‑assisted** description/detail generation.
- **Categories**, **Brands**, **Colors**, **Badges** — CRUD with icons/logos and bilingual names; AI‑assisted brand/category descriptions.
- **Inventory** — branch‑level stock management (`inventory_branch`): set/adjust quantity available per variant per branch.

### Sales
- **Orders** — list with filters, detail view (items, delivery method/region, address + map link, payment method, **payment‑proof image**, status), status transitions with stock side‑effects, **payment confirmation** (mark paid), and printable **receipt**.
- **POS / New order** (`/dashboard/orders/new`) — cashier creates a walk‑in order, adds items, applies discounts, takes payment.

### Customers & Staff
- **Customers** — CRUD (profile photo, contact, addresses with map), soft‑delete (frees the email for re‑use), hide deleted from lists.
- **Staff** — CRUD for admin/manager/cashier accounts with role assignment (super_admin).
- **Branches** — store branches CRUD (contact, location).

### Marketing & Content
- **Promotions / Vouchers** — discount codes and offers.
- **Advertisements** — placements/slots for promotional creatives.
- **Reviews** — moderate product reviews.
- **App Settings**:
  - **General** — shop name/tagline/footer (bilingual), **logo** management (add/edit/set active, corner‑rounding), **Delivery & Payment** config (regions, methods, fees, KHQR config).
  - **Banners** — hero banners (image upload with **aspect‑ratio validation**, scheduling, placements, status).
  - **Theme** & **Appearance** — brand color, fonts, product grid density, default sort.
  - **Home / Sections** — enable/reorder homepage sections.
  - **Navigation**, **Contact**, **About** — menu items, contact channels, about page content.

### Personal
- **Profile** & **Change password**.

---

## 🧭 User Journey Flows

### A. Customer purchase journey
```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#ffffff","primaryBorderColor":"#000000","lineColor":"#000000","primaryTextColor":"#000000","fontFamily":"Arial"},"flowchart":{"curve":"step"}}}%%
flowchart TD
    A[Visit storefront] --> B[Browse / search / filter products]
    B --> C[Open product detail]
    C --> D{Add to cart?}
    D -- No --> B
    D -- Yes --> E[Cart]
    E --> F[Checkout]
    F --> G[Choose region + delivery method]
    G --> H[Enter/select address + optional map pin]
    H --> I{Payment rule}
    I -- KHQR pay‑first --> J[Scan KHQR + upload proof]
    I -- COD / pay‑on‑pickup --> K[Confirm cash]
    J --> L[Order placed - awaiting confirmation]
    K --> L
    L --> M[Admin confirms payment / status]
    M --> N[Order processing → shipped → completed]
    N --> O[Customer tracks order + downloads receipt]
```

### B. Authentication journey
```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#ffffff","primaryBorderColor":"#000000","lineColor":"#000000","primaryTextColor":"#000000","fontFamily":"Arial"},"flowchart":{"curve":"step"}}}%%
flowchart TD
    A[Register / Login] --> B{Method}
    B -- Email + password --> C[Create account]
    B -- Google / Facebook / Telegram --> D[OAuth verify → find‑or‑create user]
    C --> E[Send email OTP]
    E --> F[Verify OTP → email verified]
    D --> G[Issue JWT access + refresh]
    F --> G
    G --> H[Authenticated session]
    H --> I[Access refresh on 401 → new tokens]
```

### C. Staff order‑fulfilment journey
```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#ffffff","primaryBorderColor":"#000000","lineColor":"#000000","primaryTextColor":"#000000","fontFamily":"Arial"},"flowchart":{"curve":"step"}}}%%
flowchart TD
    A[Staff logs into dashboard] --> B[Open Orders]
    B --> C[View order detail + payment proof]
    C --> D{Payment valid?}
    D -- Yes --> E[Mark Paid]
    D -- No --> F[Contact customer / cancel]
    E --> G[Set status: processing]
    G --> H[Stock reserved/deducted]
    H --> I[Shipped]
    I --> J[Completed]
    J --> K[Customer notified in realtime SSE]
```

---

## 📊 Diagrams

### Context Diagram — DFD Level 0
The whole system as a single process with its external entities.

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#ffffff","primaryBorderColor":"#000000","lineColor":"#000000","primaryTextColor":"#000000","fontFamily":"Arial"},"flowchart":{"curve":"step"}}}%%
flowchart TB
    Customer[Customer / Guest]
    Staff[Staff / Admin]
    ABA[ABA PayWay - KHQR]
    OAuth[Google / Facebook / Telegram]
    AI[Google Gemini]
    Email[SMTP Email]

    System(("Glitter Shop<br/>Management System"))

    Customer -->|Order / Payment / Review / Chat| System
    System -->|Products / Receipt / Order status / Reply| Customer

    Staff -->|Manage catalog, orders, settings| System
    System -->|Dashboards / Reports / Notifications| Staff

    System -->|Payment status query| ABA
    ABA -->|Transaction result| System

    System -->|Verify token| OAuth
    OAuth -->|Profile / Identity| System

    System -->|Prompt + shop data| AI
    AI -->|Assistant reply| System

    System -->|OTP / Verification mail| Email
```

### Data Flow Diagram — Level 1
The main internal processes and data stores.

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#ffffff","primaryBorderColor":"#000000","lineColor":"#000000","primaryTextColor":"#000000","fontFamily":"Arial"},"flowchart":{"curve":"step"}}}%%
flowchart TB
    Customer[Customer]
    Staff[Staff/Admin]
    ABA[ABA PayWay]
    AI[Gemini AI]

    P1["1.0 Authentication<br/>& Accounts"]
    P2["2.0 Catalog &<br/>Content"]
    P3["3.0 Cart &<br/>Checkout"]
    P4["4.0 Order &<br/>Payment Processing"]
    P5["5.0 Admin<br/>Management"]
    P6["6.0 AI Assistant<br/>& Realtime"]

    DS1[("Users / Auth")]
    DS2[("Products / Categories<br/>/ Brands / Inventory")]
    DS3[("Orders / Items<br/>/ Payments")]
    DS4[("Settings / Banners<br/>/ Vouchers / Reviews")]

    Customer --> P1 --> DS1
    Customer --> P2
    Staff --> P5
    P2 <--> DS2
    Customer --> P3 --> P4
    P3 <--> DS2
    P4 <--> DS3
    P4 <--> ABA
    P5 <--> DS2
    P5 <--> DS3
    P5 <--> DS4
    P5 <--> DS1
    Customer --> P6
    P6 <--> AI
    P6 <--> DS2
    P6 <--> DS3
    P4 -->|SSE events| P6
```

### Data Flow Diagram — Level 2 (Checkout & Payment)
Drill‑down of process **4.0 Order & Payment Processing**.

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#ffffff","primaryBorderColor":"#000000","lineColor":"#000000","primaryTextColor":"#000000","fontFamily":"Arial"},"flowchart":{"curve":"step"}}}%%
flowchart TB
    Customer[Customer]
    ABA[ABA PayWay]
    Staff[Staff]

    P41["4.1 Validate cart<br/>& compute fees"]
    P42["4.2 Create order<br/>(status: awaiting_payment)"]
    P43["4.3 Handle payment<br/>(KHQR / COD)"]
    P44["4.4 Upload payment proof"]
    P45["4.5 Reconcile / confirm<br/>payment"]
    P46["4.6 Update status<br/>& adjust stock"]

    DS2[("Products / Inventory")]
    DS3[("Orders / Payments")]

    Customer --> P41
    P41 <--> DS2
    P41 --> P42 --> DS3
    P42 --> P43
    P43 -->|KHQR| P44 --> DS3
    P43 -->|query status| ABA
    ABA --> P45
    P45 --> P46
    Staff -->|manual confirm| P45
    P46 <--> DS3
    P46 <--> DS2
    P46 -->|receipt + notification| Customer
```

### Entity Relationship Diagram (ERD)
Full physical data model — every table with its columns and crow's‑foot relationships.

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#ffffff","primaryBorderColor":"#000000","lineColor":"#000000","primaryTextColor":"#000000","fontFamily":"Arial"}}}%%
erDiagram
    USER ||--o{ AUTH_ACCOUNT : has
    USER ||--o{ ADDRESS : owns
    USER ||--o{ ORDER : "places (customer)"
    USER ||--o{ REVIEW : writes
    USER ||--o| WISHLIST : has
    USER }o--o| BRANCH : "staff at"
    CATEGORY ||--o{ PRODUCT : contains
    BRAND ||--o{ PRODUCT : makes
    PRODUCT ||--o{ PRODUCT_VARIANT : has
    PRODUCT ||--o{ PRODUCT_IMAGE : has
    PRODUCT ||--o{ PRODUCT_BADGE : tagged
    PRODUCT ||--o{ RELATED_PRODUCT : links
    PRODUCT ||--o{ REVIEW : receives
    PRODUCT ||--o{ ORDER_ITEM : ordered_in
    PRODUCT ||--o{ WISHLIST_ITEM : saved_in
    BADGE ||--o{ PRODUCT_BADGE : catalog
    PRODUCT_VARIANT ||--o{ INVENTORY_BRANCH : stocked_as
    PRODUCT_VARIANT ||--o{ ORDER_ITEM : sold_as
    BRANCH ||--o{ INVENTORY_BRANCH : holds
    BRANCH ||--o{ ORDER : fulfilled_at
    BRANCH ||--o{ SHIPMENT : dispatches
    ORDER ||--o{ ORDER_ITEM : contains
    ORDER ||--o{ PAYMENT : paid_by
    ORDER ||--o{ SHIPMENT : ships_as
    WISHLIST ||--o{ WISHLIST_ITEM : contains

    USER {
        uuid id PK
        string email
        string fullName
        string phoneNumber
        datetime emailVerifiedAt
        datetime phoneVerifiedAt
        string profileImageUrl
        enum role
        uuid branchId FK
        enum accountStatus
        boolean isProfileComplete
        int tokenVersion
        datetime createdAt
        datetime updatedAt
    }
    AUTH_ACCOUNT {
        uuid id PK
        uuid userId FK
        enum provider
        string providerAccountId
        string passwordHash
        string accessToken
        string refreshToken
        datetime tokenExpiresAt
        datetime createdAt
        datetime updatedAt
    }
    ADDRESS {
        uuid id PK
        uuid userId FK
        string label
        string recipientName
        string recipientPhone
        string province
        string district
        string commune
        string village
        string streetAddress
        string postalCode
        string landmark
        enum addressType
        boolean isDefaultShipping
        boolean isDefaultBilling
        decimal latitude
        decimal longitude
        datetime createdAt
        datetime updatedAt
    }
    CATEGORY {
        uuid id PK
        string slug
        string nameEn
        string nameKm
        string iconUrl
        string description
        enum status
        int displayOrder
        datetime createdAt
        datetime updatedAt
    }
    BRAND {
        uuid id PK
        string slug
        string name
        string logoUrl
        string websiteUrl
        string description
        enum status
        datetime createdAt
        datetime updatedAt
    }
    BADGE {
        uuid id PK
        string slug
        string nameEn
        string nameKm
        string color
        boolean active
        int displayOrder
        datetime createdAt
        datetime updatedAt
    }
    PRODUCT {
        uuid id PK
        uuid categoryId FK
        uuid brandId FK
        string sku
        string nameEn
        string nameKm
        string slug
        text descriptionEn
        text descriptionKm
        text detailsEn
        text detailsKm
        decimal price
        decimal originalPrice
        enum productType
        enum status
        boolean hasBox
        int totalStock
        decimal averageRating
        int reviewCount
        datetime createdAt
        datetime updatedAt
    }
    PRODUCT_VARIANT {
        uuid id PK
        uuid productId FK
        string variantSku
        string size
        string color
        string colorHex
        int quantityInStock
        decimal priceOverride
        datetime createdAt
        datetime updatedAt
    }
    PRODUCT_IMAGE {
        uuid id PK
        uuid productId FK
        string imageUrl
        string imageAltTextEn
        string imageAltTextKm
        enum imageType
        int displayOrder
        datetime createdAt
    }
    PRODUCT_BADGE {
        uuid id PK
        uuid productId FK
        string badgeType
        string badgeLabelEn
        string badgeLabelKm
        string badgeIconColor
        datetime badgeStartDate
        datetime badgeEndDate
        datetime createdAt
    }
    RELATED_PRODUCT {
        uuid id PK
        uuid productId FK
        uuid relatedProductId FK
        enum relationType
        int displayOrder
        datetime createdAt
    }
    BRANCH {
        uuid id PK
        string branchCode
        string branchNameEn
        string branchNameKm
        string phone
        string addressEn
        string addressKm
        decimal latitude
        decimal longitude
        enum status
        datetime createdAt
        datetime updatedAt
    }
    INVENTORY_BRANCH {
        uuid id PK
        uuid productVariantId FK
        uuid branchId FK
        int quantityAvailable
        datetime createdAt
        datetime updatedAt
    }
    ORDER {
        uuid id PK
        string orderNumber
        enum source
        enum status
        uuid branchId FK
        uuid customerId FK
        uuid cashierId FK
        string customerName
        string customerPhone
        decimal subtotal
        decimal discountTotal
        decimal shippingCost
        decimal taxAmount
        decimal grandTotal
        enum paymentStatus
        string currency
        string deliveryRegion
        string deliveryMethod
        text deliveryAddress
        string paymentMethod
        string paymentProofUrl
        datetime createdAt
        datetime updatedAt
    }
    ORDER_ITEM {
        uuid id PK
        uuid orderId FK
        uuid productId FK
        uuid productVariantId FK
        string productName
        string variantSku
        string size
        string color
        string colorHex
        decimal unitPrice
        int quantity
        datetime createdAt
    }
    PAYMENT {
        uuid id PK
        uuid orderId FK
        enum method
        enum status
        decimal amount
        string reference
        datetime paidAt
        datetime createdAt
    }
    SHIPMENT {
        uuid id PK
        uuid orderId FK
        uuid branchId FK
        enum status
        string trackingNumber
        datetime shippedAt
        datetime deliveredAt
        datetime createdAt
        datetime updatedAt
    }
    REVIEW {
        uuid id PK
        uuid productId FK
        uuid userId FK
        text comment
        int rating
        enum status
        datetime createdAt
        datetime updatedAt
    }
    WISHLIST {
        uuid id PK
        uuid userId FK
        datetime createdAt
    }
    WISHLIST_ITEM {
        uuid id PK
        uuid wishlistId FK
        uuid productId FK
        datetime createdAt
    }
    VOUCHER {
        uuid id PK
        string code
        enum discountType
        decimal discountValue
        decimal minOrder
        int usageLimit
        int usedCount
        datetime startsAt
        datetime expiresAt
        enum status
        datetime createdAt
        datetime updatedAt
    }
```

### Relationship Diagram
A simplified view of how the main entities connect (cardinalities).

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#ffffff","primaryBorderColor":"#000000","lineColor":"#000000","primaryTextColor":"#000000","fontFamily":"Arial"},"flowchart":{"curve":"step"}}}%%
flowchart LR
    USER -->|1..*| ORDER
    USER -->|1..*| ADDRESS
    USER -->|1..*| AUTH_ACCOUNT
    USER -->|1..*| REVIEW
    USER -->|1..1| WISHLIST

    CATEGORY -->|1..*| PRODUCT
    BRAND -->|1..*| PRODUCT
    PRODUCT -->|1..*| PRODUCT_VARIANT
    PRODUCT -->|1..*| PRODUCT_IMAGE
    PRODUCT -->|1..*| PRODUCT_BADGE
    PRODUCT -->|1..*| RELATED_PRODUCT

    PRODUCT_VARIANT -->|1..*| INVENTORY_BRANCH
    BRANCH -->|1..*| INVENTORY_BRANCH

    ORDER -->|1..*| ORDER_ITEM
    ORDER -->|1..*| PAYMENT
    ORDER -->|1..*| SHIPMENT
    BRANCH -->|1..*| ORDER

    WISHLIST -->|1..*| WISHLIST_ITEM
    ORDER_ITEM -.->|references| PRODUCT_VARIANT
```

---

## 🚀 Getting Started

Each app has its own `.env.example` — copy it and fill in values.

```bash
# 1. API (NestJS) — http://localhost:5000
cd glitter-api
cp .env.example .env      # fill DATABASE_URL, JWT secrets, keys…
npm install
npm run start:dev

# 2. Storefront (Next.js) — http://localhost:3000
cd glitter-store
cp .env.example .env.local # set NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev

# 3. Dashboard (Next.js) — http://localhost:3001
cd glitter-dashboard
cp .env.example .env.local # set NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev
```

- **Database**: PostgreSQL (Neon). TypeORM `synchronize: true` builds the schema on boot (dev).
- **Seed admin**: created on first boot from `SEED_ADMIN_*` env vars.
- **Swagger API docs**: `http://localhost:5000/swagger`.

---

## ☁ Deployment

| App | Host | Notes |
|---|---|---|
| **glitter-api** | Render / Koyeb | Persistent server (needed for SSE + jobs). Set all `.env` vars + `ALLOWED_ORIGINS` (the Vercel domains). |
| **glitter-store** | Vercel | Root dir `glitter-store`; set `NEXT_PUBLIC_API_URL` to the API URL. |
| **glitter-dashboard** | Vercel | Root dir `glitter-dashboard`; same `NEXT_PUBLIC_API_URL`. |
| **Database** | Neon | Use a region close to users (e.g. Singapore) for latency. |

**Production CORS**: the API allows `localhost` in dev and the domains listed in `ALLOWED_ORIGINS` (comma‑separated) in production. **OAuth**: add the production domains to the Google/Facebook consoles.

---

*Glitter Shop — Year‑4 Thesis Project.*
