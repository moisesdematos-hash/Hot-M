import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/core/database/supabase-server';
import { AuthService } from '@/modules/auth/auth-service';
import { PixelService } from '@/modules/marketing/pixel-service';
import { savePixelSchema } from '@/modules/marketing/schemas';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const { searchParams } = new URL(request.url);
    const publicOnly = searchParams.get('public') === 'true';

    const supabase = await createServerSupabaseClient();
    const pixelService = new PixelService(supabase);

    // If public call (checkout), only return active pixels
    if (publicOnly) {
      const pixels = await pixelService.listProductPixels(productId, true);
      return NextResponse.json({ success: true, pixels });
    }

    // Authenticated creator call
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const pixels = await pixelService.listProductPixels(productId, false);
    return NextResponse.json({ success: true, pixels });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao buscar pixels do produto';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = savePixelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const pixelService = new PixelService(supabase);
    const pixel = await pixelService.savePixel(session.id, productId, parsed.data);

    return NextResponse.json({ success: true, pixel }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao salvar pixel';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const { searchParams } = new URL(request.url);
    const pixelId = searchParams.get('pixelId');

    if (!pixelId) {
      return NextResponse.json({ error: 'pixelId é obrigatório' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const authService = new AuthService(supabase);
    const session = await authService.getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const pixelService = new PixelService(supabase);
    await pixelService.deletePixel(session.id, productId, pixelId);

    return NextResponse.json({ success: true, message: 'Pixel removido com sucesso' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao remover pixel';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
