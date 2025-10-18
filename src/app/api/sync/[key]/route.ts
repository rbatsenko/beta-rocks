import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/sync/:key
 * Retrieves user data (crags, chats, reports) for the given sync key
 *
 * TODO: Query Supabase for user data with matching sync_key_hash
 */
async function handleGet(_key: string) {
  try {
    // TODO: Implement Supabase query
    // const data = await supabase
    //   .from('user_profiles')
    //   .select('*')
    //   .eq('sync_key_hash', hashKey(_key));

    return NextResponse.json({
      profile: null,
      crags: [],
      reports: [],
      confirmations: [],
    });
  } catch (error) {
    console.error("Sync GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync/:key
 * Pushes merged user data to the server
 *
 * TODO: Implement conflict resolution via updatedAt timestamps
 * TODO: Save to Supabase
 */
async function handlePost(_key: string, _body: any) {
  try {
    // TODO: Validate sync key
    // TODO: Implement conflict resolution
    // TODO: Merge and save to Supabase

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sync POST error:", error);
    return NextResponse.json(
      { error: "Failed to sync data" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  return handleGet(key);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const body = await request.json();
  return handlePost(key, body);
}
