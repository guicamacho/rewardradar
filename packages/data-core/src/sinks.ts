import { createHmac } from "node:crypto";
import type { RoutedAlert } from "./router";

/**
 * Delivery boundary. The data core does not know how to format a
 * Telegram post or an email; it hands RoutedAlerts to sinks. Brand
 * apps and the syndication worker are just sinks (usually webhooks).
 */
export interface AlertSink {
  id: string;
  deliver(alert: RoutedAlert): Promise<void>;
}

export class ConsoleSink implements AlertSink {
  id = "console";

  async deliver(a: RoutedAlert): Promise<void> {
    const e = a.event;
    const seats = e.seats === null ? "?" : String(e.seats);
    const miles = e.miles === null ? "?" : e.miles.toLocaleString("en-US");
    const ch = a.channels.map((c) => c.type).join("+") || "(none)";
    const teaser =
      a.releaseTeaserAt === a.releaseInstantAt
        ? "teaser immediate"
        : `teaser +${Math.round((Date.parse(a.releaseTeaserAt) - Date.parse(a.releaseInstantAt)) / 60000)}m`;
    console.log(
      `  -> [${a.market}/${a.languageTag}] ${e.program} ${e.origin}-${e.destination} ` +
      `${e.departureDate} ${e.cabin} ${e.change} seats=${seats} miles=${miles} ` +
      `via ${ch} (${teaser}${a.featured ? ", featured" : ""})`,
    );
  }
}

/**
 * Generic webhook sink with HMAC-SHA256 signing. Point one at the
 * brand app's /internal/alerts endpoint and another at the
 * syndication worker; both verify X-RewardRadar-Signature.
 */
export class WebhookSink implements AlertSink {
  id: string;

  constructor(
    private url: string,
    private secret: string,
    id = "webhook",
  ) {
    this.id = id;
  }

  async deliver(a: RoutedAlert): Promise<void> {
    const body = JSON.stringify(a);
    const sig = createHmac("sha256", this.secret).update(body).digest("hex");
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-rewardradar-signature": sig,
      },
      body,
    });
    if (!res.ok) throw new Error(`Webhook ${this.id} responded ${res.status}`);
  }
}

/**
 * Direct Telegram delivery for the channels that are Telegram-primary
 * (BR, ES). Formatting per language belongs to the syndication worker;
 * this sink exists for simple single-channel setups.
 * Env: TELEGRAM_BOT_TOKEN plus a chat id per market.
 */
export class TelegramSink implements AlertSink {
  id = "telegram";

  constructor(
    private botToken: string,
    private chatIdByMarket: Record<string, string>,
  ) {}

  async deliver(a: RoutedAlert): Promise<void> {
    const wantsTelegram = a.channels.some((c) => c.type === "telegram");
    const chatId = this.chatIdByMarket[a.market];
    if (!wantsTelegram || !chatId) return;

    const e = a.event;
    const text = `${e.program}: ${e.origin} -> ${e.destination} ${e.departureDate} ${e.cabin} ${e.change}` +
      (e.seats !== null ? ` (${e.seats} seats)` : "");

    const res = await fetch(
      `https://api.telegram.org/bot${this.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );
    if (!res.ok) throw new Error(`Telegram API responded ${res.status}`);
  }
}
