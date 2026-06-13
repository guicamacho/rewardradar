import type { MarketConfigInput } from "../schema";

/**
 * Brand name pending final decision (GarimpaMilhas vs RadarMilhas).
 * Domains below are placeholders, swap once registered.
 */
const br: MarketConfigInput = {
  id: "br",
  status: "beta",

  brand: {
    name: "RadarMilhas",
    domains: ["radarmilhas.com.br"],
    tagline: "Alertas de disponibilidade antes de todo mundo",
    fromEmail: "alertas@radarmilhas.com.br",
  },

  locale: { language: "pt-BR", timezone: "America/Sao_Paulo", dateFormat: "DMY" },
  currency: "BRL",

  payments: {
    // Stripe supports Pix for BR-settled accounts; Mercado Pago is the
    // fallback if settlement or approval rates become a problem.
    provider: "stripe",
    methods: ["pix", "card", "boleto"],
    taxHandling: "br_nfse",
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
        monthly: 29.9,
        annual: 299,
        limits: { watchlists: null, alertDelayMinutes: 0 },
        features: ["search", "calendar", "instant_alerts", "whatsapp_alerts"],
      },
    ],
  },

  programs: {
    featured: ["smiles", "latam_pass", "azul_fidelidade", "aeroplan", "lifemiles"],
    alsoSearched: [
      "flying_blue", "ba_executive_club", "iberia_plus", "united_mileageplus",
      "aa_aadvantage", "qatar_privilege", "emirates_skywards", "turkish_ms",
    ],
    homeAirports: ["GRU", "GIG", "BSB"],
  },

  channels: [
    { type: "telegram", role: "primary" },
    { type: "whatsapp", role: "secondary", paidTierOnly: true },
    { type: "email", role: "secondary" },
    { type: "instagram", role: "broadcast_only" },
  ],

  affiliates: [
    { id: "br-clube-milhas", kind: "miles_club", partner: null, url: null, active: false, surfaces: ["alert_footer", "newsletter"] },
    { id: "br-compra-milhas", kind: "buy_miles_promo", partner: null, url: null, active: false, surfaces: ["alert_footer", "results_page"] },
    { id: "br-transfer-bonus", kind: "transfer_bonus", partner: null, url: null, active: false, surfaces: ["newsletter", "dedicated_page"] },
    { id: "br-cartao-1", kind: "credit_card", partner: null, url: null, active: false, surfaces: ["dedicated_page"] },
  ],

  content: {
    languageTag: "pt-BR",
    tts: { provider: "elevenlabs", voiceId: null },
    shortFormPlatforms: ["instagram_reels", "tiktok", "youtube_shorts"],
    postsPerDayTarget: 3,
  },

  features: { gdsLoadData: false, calendarView: true, publicTeaserFeed: true, api: false },

  compliance: { privacyFrameworks: ["lgpd"], cookieBanner: false, marketingOptIn: "opt_in" },
  regionOverrides: {},

  seo: {
    defaultTitle: "RadarMilhas | Disponibilidade de passagens com milhas em tempo real",
    defaultDescription:
      "Encontre e monitore disponibilidade premio em Smiles, LATAM Pass, Azul Fidelidade e parceiros internacionais. Receba alertas na hora.",
    ogLocale: "pt_BR",
  },
};

export default br;
