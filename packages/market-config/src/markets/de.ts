import type { MarketConfigInput } from "../schema";

/**
 * German-language brand for Germany, Austria and Switzerland.
 * Featured ordering reflects how this community books Lufthansa Group
 * premium space: Miles & More plus the Star partner programmes.
 */
const de: MarketConfigInput = {
  id: "de",
  status: "planned",

  brand: {
    name: "MeilenRadar",
    domains: ["meilenradar.de"],
    tagline: "Praemienverfuegbarkeit, bevor sie weg ist",
    fromEmail: "alerts@meilenradar.de",
  },

  locale: { language: "de", timezone: "Europe/Berlin", dateFormat: "DMY" },
  currency: "EUR",

  payments: {
    provider: "stripe",
    methods: ["card", "sepa_debit", "paypal", "apple_pay"],
    taxHandling: "eu_oss_vat",
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
    featured: ["miles_and_more", "aeroplan", "lifemiles", "united_mileageplus", "flying_blue", "eurobonus"],
    alsoSearched: [
      "ba_executive_club", "iberia_plus", "virgin_atlantic", "turkish_ms",
      "emirates_skywards", "qatar_privilege", "ana_mileage_club", "krisflyer",
    ],
    homeAirports: ["FRA", "MUC", "VIE", "ZRH", "BER"],
  },

  channels: [
    { type: "email", role: "primary" },
    { type: "telegram", role: "secondary" },
    { type: "push", role: "secondary" },
    { type: "youtube", role: "broadcast_only" },
  ],

  affiliates: [
    { id: "de-card-1", kind: "credit_card", partner: null, url: null, active: false, surfaces: ["newsletter", "dedicated_page"] },
    { id: "de-buy-miles", kind: "buy_miles_promo", partner: null, url: null, active: false, surfaces: ["alert_footer"] },
  ],

  content: {
    languageTag: "de-DE",
    tts: { provider: "elevenlabs", voiceId: null },
    shortFormPlatforms: ["youtube_shorts", "instagram_reels"],
    postsPerDayTarget: 2,
  },

  features: { gdsLoadData: false, calendarView: true, publicTeaserFeed: true, api: false },

  compliance: { privacyFrameworks: ["gdpr"], cookieBanner: true, marketingOptIn: "opt_in" },

  regionOverrides: {
    CH: { homeAirports: ["ZRH", "GVA"] },
    AT: { homeAirports: ["VIE"] },
  },

  seo: {
    defaultTitle: "MeilenRadar | Praemienflug-Verfuegbarkeit in Echtzeit",
    defaultDescription:
      "Verfuegbarkeit von Praemienfluegen bei Miles & More und Star-Alliance-Partnern suchen und ueberwachen. Sofortige Alerts, wenn Plaetze frei werden.",
    ogLocale: "de_DE",
  },
};

export default de;
