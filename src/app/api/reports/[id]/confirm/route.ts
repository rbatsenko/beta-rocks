import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/integrations/supabase/client';

/**
 * POST /api/reports/[id]/confirm
 * Confirm (thumbs up) a report
 *
 * Params:
 * - id: string (report id)
 *
 * Body:
 * - userKeyHash: string (user's sync key hash)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userKeyHash } = await request.json();

    if (!userKeyHash) {
      return NextResponse.json(
        { error: 'userKeyHash is required' },
        { status: 400 }
      );
    }

    // Check if already confirmed
    const { data: existing } = await supabase
      .from('confirmations')
      .select('id')
      .eq('report_id', id)
      .eq('user_key_hash', userKeyHash)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Already confirmed this report' },
        { status: 409 }
      );
    }

    // Add confirmation
    const { data, error } = await supabase
      .from('confirmations')
      .insert({
        report_id: id,
        user_key_hash: userKeyHash,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Confirm error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm report' },
      { status: 500 }
    );
  }
}
