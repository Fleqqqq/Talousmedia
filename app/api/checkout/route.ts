import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const articleId = body.articleId || "";

    const origin = req.headers.get("origin") || req.nextUrl.origin || "http://localhost:3000";
    const returnUrl = articleId ? `${origin}/article/${articleId}?subscribed=true` : `${origin}/?subscribed=true`;
    const cancelUrl = articleId ? `${origin}/article/${articleId}` : origin;

    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (stripeKey) {
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2024-06-20" as any,
      });

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: "Talousmedia Pro - Kuukausitilaus",
                description: "Täysi pääsy Helsingin pörssin DCF-kassavirtamalleihin, valuation-kertoimiin ja syväanalyyseihin.",
              },
              unit_amount: 499, // 4,99 €
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        success_url: returnUrl,
        cancel_url: cancelUrl,
      });

      return NextResponse.json({ url: session.url });
    }

    // Jos STRIPE_SECRET_KEY ei ole vielä asetettu, ohjataan testisivulle subscribed=true
    return NextResponse.json({
      url: returnUrl,
      simulated: true,
      message: "STRIPE_SECRET_KEY puuttuu .env-tiedostosta. Ohjataan testisivulle tilaajatilaan.",
    });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json({ error: error.message || "Checkout failed" }, { status: 500 });
  }
}
