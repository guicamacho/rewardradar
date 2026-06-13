import { z } from "zod";

export const Currency = z.enum(["USD", "BRL", "AUD", "EUR", "MXN", "GBP", "SGD"]);
export const Language = z.enum(["en", "en-AU", "pt-BR", "es", "de"]);

/** Canonical loyalty programme id, must exist in programs.ts catalogue. */
export const ProgramId = z.string().regex(/^[a-z0-9_]+$/);

const IataCode = z.string().length(3).regex(/^[A-Z]{3}$/);

const PaymentMethod = z.enum([
  "card", "pix", "boleto", "sepa_debit", "oxxo",
  "apple_pay", "google_pay", "paypal",
]);
const PaymentProvider = z.enum(["stripe", "mercadopago", "paddle"]);
const TaxHandling = z.enum(["none", "au_gst", "eu_oss_vat", "br_nfse"]);
const PrivacyFramework = z.enum(["gdpr", "lgpd", "au_privacy_act", "ccpa", "pdpa_sg"]);

const ChannelType = z.enum([
  "email", "telegram", "whatsapp", "push",
  "x", "instagram", "tiktok", "youtube", "facebook", "discord",
]);

const Channel = z.object({
  type: ChannelType,
  /**
   * primary        - main alert delivery channel for subscribers
   * secondary      - additional delivery channel, often gated by tier
   * broadcast_only - one-way content syndication, no per-user alerts
   */
  role: z.enum(["primary", "secondary", "broadcast_only"]),
  handle: z.string().optional(),
  paidTierOnly: z.boolean().default(false),
});

const PricingTier = z.object({
  id: z.enum(["free", "pro", "elite"]),
  /** Price in the market currency. null means free. */
  monthly: z.number().nullable(),
  annual: z.number().nullable().optional(),
  limits: z.object({
    /** null means unlimited. */
    watchlists: z.number().int().nullable(),
    /**
     * Minutes alerts are delayed for this tier. The single most
     * effective free-to-paid lever for perishable inventory.
     */
    alertDelayMinutes: z.number().int().default(0),
  }),
  features: z.array(z.string()).default([]),
});

const AffiliateSlot = z.object({
  id: z.string(),
  kind: z.enum([
    "credit_card", "buy_miles_promo", "miles_club", "transfer_bonus",
    "hotel", "esim", "travel_insurance", "booking_service",
  ]),
  /** null means the slot is designed in but no partner is signed yet. */
  partner: z.string().nullable(),
  url: z.string().url().nullable(),
  active: z.boolean().default(false),
  surfaces: z
    .array(z.enum(["alert_footer", "results_page", "newsletter", "dedicated_page"]))
    .default([]),
});

const ContentPipeline = z.object({
  /** BCP-47 tag used for templates, copy and TTS. */
  languageTag: z.string(),
  tts: z.object({
    provider: z.enum(["elevenlabs", "none"]),
    voiceId: z.string().nullable(),
  }),
  shortFormPlatforms: z
    .array(z.enum(["instagram_reels", "tiktok", "youtube_shorts"]))
    .default([]),
  postsPerDayTarget: z.number().int().default(0),
});

const RegionOverride = z.object({
  currency: Currency.optional(),
  paymentMethods: z.array(PaymentMethod).optional(),
  pricingMultiplier: z.number().positive().optional(),
  homeAirports: z.array(IataCode).optional(),
});

export const MarketConfigSchema = z.object({
  id: z.enum(["global", "br", "au", "es", "de"]),
  status: z.enum(["live", "beta", "planned"]),

  brand: z.object({
    name: z.string(),
    /** First entry is the canonical domain. */
    domains: z.array(z.string()).min(1),
    tagline: z.string().optional(),
    fromEmail: z.string().email(),
  }),

  locale: z.object({
    language: Language,
    timezone: z.string(),
    dateFormat: z.enum(["DMY", "MDY", "YMD"]).default("DMY"),
  }),

  currency: Currency,

  payments: z.object({
    provider: PaymentProvider,
    methods: z.array(PaymentMethod).min(1),
    taxHandling: TaxHandling,
  }),

  pricing: z.object({
    tiers: z.array(PricingTier).min(1),
  }),

  programs: z.object({
    /** Ordered. Drives default search scope, UI ordering and content focus. */
    featured: z.array(ProgramId).min(1),
    /** Searchable but not promoted in this market. */
    alsoSearched: z.array(ProgramId).default([]),
    homeAirports: z.array(IataCode).min(1),
  }),

  channels: z.array(Channel).min(1),
  affiliates: z.array(AffiliateSlot).default([]),
  content: ContentPipeline,

  features: z.object({
    /** Amadeus fare-class load data (the GDS integration). */
    gdsLoadData: z.boolean().default(false),
    calendarView: z.boolean().default(true),
    /** Public delayed deal feed that drives signups. */
    publicTeaserFeed: z.boolean().default(true),
    api: z.boolean().default(false),
  }),

  compliance: z.object({
    privacyFrameworks: z.array(PrivacyFramework).default([]),
    cookieBanner: z.boolean().default(false),
    marketingOptIn: z.enum(["opt_in", "opt_out"]).default("opt_in"),
  }),

  /** Keyed by ISO 3166-1 alpha-2 country code, uppercase. */
  regionOverrides: z.record(z.string(), RegionOverride).default({}),

  seo: z.object({
    defaultTitle: z.string(),
    defaultDescription: z.string(),
    ogLocale: z.string(),
  }),
});

export type MarketConfig = z.infer<typeof MarketConfigSchema>;
export type MarketConfigInput = z.input<typeof MarketConfigSchema>;
export type MarketId = MarketConfig["id"];
