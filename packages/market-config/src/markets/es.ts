import type { MarketConfigInput } from "../schema";

/**
 * One Spanish-language brand covering Mexico, Colombia, Chile, Peru,
 * Argentina and Spain. Mexico and Colombia/Chile carry monetisation;
 * Argentina is treated as audience and stays on USD card by design.
 */
const es: MarketConfigInput = {
  id: "es",
  status: "planned",

  brand: {
    name: "RadarMillas",
    domains: ["radarmillas.com"],
    tagline: "Alertas de disponibilidad premio antes que nadie",
    fromEmail: "alertas@radarmillas.com",
  },

  locale: { language: "es", timezone: "America/Mexico_City", dateFormat: "DMY" },
  currency: "USD",

  payments: {
    provider: "stripe",
    methods: ["card", "paypal"],
    taxHandling: "none",
  },

  pricing: {
    tiers: [
      {
        id: "free",
        monthly: null,
        limits: { watchlists: 2, alertDelayMinutes: 15 },
        features: ["search", "calendar"],
      },
      {
        id: "pro",
        monthly: 9.99,
        annual: 99,
        limits: { watchlists: null, alertDelayMinutes: 0 },
        features: ["search", "calendar", "instant_alerts"],
      },
    ],
  },

  programs: {
    featured: ["lifemiles", "latam_pass", "club_premier", "connectmiles", "aerolineas_plus", "iberia_plus"],
    alsoSearched: [
      "aeroplan", "united_mileageplus", "aa_aadvantage", "ba_executive_club",
      "flying_blue", "emirates_skywards", "qatar_privilege",
    ],
    homeAirports: ["MEX", "BOG", "SCL", "EZE", "MAD"],
  },

  channels: [
    { type: "telegram", role: "primary" },
    { type: "whatsapp", role: "secondary", paidTierOnly: true },
    { type: "email", role: "secondary" },
    { type: "instagram", role: "broadcast_only" },
  ],

  affiliates: [
    { id: "es-buy-miles", kind: "buy_miles_promo", partner: null, url: null, active: false, surfaces: ["alert_footer", "newsletter"] },
    { id: "es-card-mx", kind: "credit_card", partner: null, url: null, active: false, surfaces: ["dedicated_page"] },
  ],

  content: {
    languageTag: "es-419",
    tts: { provider: "elevenlabs", voiceId: null },
    shortFormPlatforms: ["instagram_reels", "tiktok", "youtube_shorts"],
    postsPerDayTarget: 3,
  },

  features: { gdsLoadData: false, calendarView: true, publicTeaserFeed: true, api: false },

  compliance: { privacyFrameworks: [], cookieBanner: false, marketingOptIn: "opt_in" },

  regionOverrides: {
    MX: { currency: "MXN", paymentMethods: ["card", "oxxo"], pricingMultiplier: 20, homeAirports: ["MEX", "GDL", "MTY", "CUN"] },
    ES: { currency: "EUR", paymentMethods: ["card", "sepa_debit", "paypal"], pricingMultiplier: 0.95, homeAirports: ["MAD", "BCN"] },
    AR: { homeAirports: ["EZE", "AEP"] },
    CO: { homeAirports: ["BOG", "MDE"] },
    CL: { homeAirports: ["SCL"] },
  },

  seo: {
    defaultTitle: "RadarMillas | Disponibilidad de vuelos premio con millas en tiempo real",
    defaultDescription:
      "Busca y monitorea disponibilidad premio en LifeMiles, LATAM Pass, Club Premier y mas. Recibe alertas al instante cuando se abren asientos.",
    ogLocale: "es_LA",
  },
};

export default es;
