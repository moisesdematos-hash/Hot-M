import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminSupabaseClient } from '@/core/database/supabase-admin';
import { WebhookEngine } from '@/modules/webhooks/webhook-engine';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    const headersRecord: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headersRecord[key.toLowerCase()] = value;
    });

    // Use admin client with service role since webhooks are server-to-server without client session
    const supabaseAdmin = createAdminSupabaseClient();
    const webhookEngine = new WebhookEngine(supabaseAdmin);
    const requestId = crypto.randomUUID();

    const result = await webhookEngine.processProxyPayWebhook({
      headers: headersRecord,
      rawBody,
      requestId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha interna no processamento de webhook';
    const isAuthError = message.includes('UNAUTHORIZED_SIGNATURE');
    const status = isAuthError ? 401 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
