import type { MarketConfigInput } from "../schema";

const au: MarketConfigInput = {
  id: "au",
  status: "planned",

  brand: {
    name: "RewardRadar Australia",
    domains: ["rewardradar.com.au"],
    tagline: "Classic Reward alerts before anyone else",
    fromEmail: "alerts@rewardradar.com.au",
  },

  locale: { language: "en-AU", timezone: "Australia/Sydney", dateFormat: "DMY" },
  currency: "AUD",

  payments: {
    provider: "stripe",
    methods: ["card", "apple_pay", "google_pay"],
    taxHandling: "au_gst",
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
        monthly: 14.99,
        annual: 129,
        limits: { watchlists: null, alertDelayMinutes: 0 },
        // gds_load_data is the local differentiator: fare-class load
        // visibility for the Qantas community.
        features: ["search", "calendar", "instant_alerts", "gds_load_data"],
      },
    ],
  },

  programs: {
    featured: ["qantas_ff", "velocity", "krisflyer", "asia_miles", "aeroplan"],
    alsoSearched: [
      "lifemiles", "united_mileageplus", "aa_aadvantage", "ba_executive_club",
      "flying_blue", "emirates_skywards", "qatar_privilege", "ana_mileage_club", "jal_mileage_bank",
    ],
    homeAirports: ["SYD", "MEL", "BNE", "PER"],
  },

  channels: [
    { type: "email", role: "primary" },
    { type: "push", role: "secondary" },
    { type: "facebook", role: "broadcast_only" },
    { type: "instagram", role: "broadcast_only" },
  ],

  affiliates: [
    { id: "au-card-1", kind: "credit_card", partner: null, url: null, active: false, surfaces: ["newsletter", "dedicated_page"] },
    { id: "au-transfer-bonus", kind: "transfer_bonus", partner: null, url: null, active: false, surfaces: ["newsletter", "alert_footer"] },
    { id: "au-buy-miles", kind: "buy_miles_promo", partner: null, url: null, active: false, surfaces: ["results_page"] },
  ],

  content: {
    languageTag: "en-AU",
    tts: { provider: "elevenlabs", voiceId: null },
    shortFormPlatforms: ["instagram_reels", "youtube_shorts"],
    postsPerDayTarget: 2,
  },

  features: { gdsLoadData: true, calendarView: true, publicTeaserFeed: true, api: false },

  compliance: { privacyFrameworks: ["au_privacy_act"], cookieBanner: false, marketingOptIn: "opt_in" },
  regionOverrides: {},

  seo: {
    defaultTitle: "RewardRadar Australia | Qantas and Velocity reward seat alerts",
    defaultDescription:
      "Track Classic Reward and Velocity reward seat availability in real time, with fare-class load data for serious points travellers.",
    ogLocale: "en_AU",
  },
};

export default au;
