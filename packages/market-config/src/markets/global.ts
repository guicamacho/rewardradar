import type { MarketConfigInput } from "../schema";

const global: MarketConfigInput = {
  id: "global",
  status: "beta",

  brand: {
    name: "RewardRadar",
    domains: ["rewardradar.com"],
    tagline: "Reward seat alerts before anyone else",
    fromEmail: "alerts@rewardradar.com",
  },

  locale: { language: "en", timezone: "UTC", dateFormat: "MDY" },
  currency: "USD",

  payments: {
    provider: "stripe",
    methods: ["card", "apple_pay", "google_pay", "paypal"],
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
        features: ["search", "calendar", "instant_alerts", "gds_load_data"],
      },
    ],
  },

  programs: {
    featured: [
      "aeroplan", "lifemiles", "krisflyer", "flying_blue",
      "ba_executive_club", "united_mileageplus", "aa_aadvantage", "alaska_mileage_plan",
    ],
    alsoSearched: [
      "virgin_atlantic", "turkish_ms", "ana_mileage_club", "jal_mileage_bank",
      "emirates_skywards", "etihad_guest", "qatar_privilege", "asia_miles",
      "delta_skymiles", "eurobonus", "qantas_ff", "velocity",
    ],
    homeAirports: ["JFK", "LAX", "LHR", "SIN"],
  },

  channels: [
    { type: "email", role: "primary" },
    { type: "push", role: "secondary" },
    { type: "x", role: "broadcast_only", handle: "@rewardradar" },
    { type: "discord", role: "secondary", paidTierOnly: true },
  ],

  affiliates: [
    { id: "global-card-1", kind: "credit_card", partner: null, url: null, active: false, surfaces: ["newsletter", "dedicated_page"] },
    { id: "global-booking-svc", kind: "booking_service", partner: null, url: null, active: false, surfaces: ["results_page"] },
  ],

  content: {
    languageTag: "en-US",
    tts: { provider: "elevenlabs", voiceId: null },
    shortFormPlatforms: ["youtube_shorts", "tiktok"],
    postsPerDayTarget: 2,
  },

  features: { gdsLoadData: true, calendarView: true, publicTeaserFeed: true, api: true },

  compliance: { privacyFrameworks: ["ccpa"], cookieBanner: false, marketingOptIn: "opt_in" },
  regionOverrides: {},

  seo: {
    defaultTitle: "RewardRadar | Find reward flight availability with miles and points",
    defaultDescription:
      "Search and track award seat availability across major airline loyalty programmes. Get alerted the moment seats open.",
    ogLocale: "en_US",
  },
};

export default global;
