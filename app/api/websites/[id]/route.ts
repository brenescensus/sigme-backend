// app/api/websites/[id]/route.ts 
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// ==========================================
// GET - Get single website
// ==========================================
export const GET = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const websiteId = params.id;
      
      console.log('[WEBSITE GET] User:', user.email, 'Website:', websiteId);
      
      //  Get authenticated client from request
      const supabase = await getAuthenticatedClient(req);
      
      // Verify ownership and fetch
      const { data: website, error } = await supabase
        .from('websites')
        .select('*')
        .eq('id', websiteId)
        .eq('user_id', user.id)
        .single();
      
      if (error || !website) {
        return NextResponse.json({
          success: false,
          error: 'Website not found or access denied',
        }, { status: 404 });
      }
      
      console.log(' [WEBSITE GET] Found:', website.name);
      
      return NextResponse.json({
        success: true,
        website,
      });
    } catch (error: any) {
      console.error(' [WEBSITE GET] Error:', error);
      return NextResponse.json({
        success: false,
        error: 'Internal server error',
      }, { status: 500 });
    }
  }
);

// ==========================================
// PATCH - Update website
// ==========================================
export const PATCH = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const websiteId = params.id;
      
      console.log('📝 [WEBSITE PATCH] User:', user.email, 'Website:', websiteId);
      
      const body = await req.json();
      
      //  Get authenticated client from request
      const supabase = await getAuthenticatedClient(req);
      
      // Verify ownership
      const { data: website, error: fetchError } = await supabase
        .from('websites')
        .select('id, user_id')
        .eq('id', websiteId)
        .eq('user_id', user.id)
        .single();
      
      if (fetchError || !website) {
        return NextResponse.json({
          success: false,
          error: 'Website not found or access denied',
        }, { status: 404 });
      }
      
      // Build update object (only include allowed fields)
      const allowedFields = ['name', 'url', 'domain', 'description', 'status'];
      const updates: any = {
        updated_at: new Date().toISOString(),
      };
      
      allowedFields.forEach(field => {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      });
      
      // Update
      const { data, error } = await supabase
        .from('websites')
        .update(updates)
        .eq('id', websiteId)
        .select()
        .single();
      
      if (error) {
        console.error(' [WEBSITE PATCH] DB error:', error);
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 500 });
      }
      
      console.log(' [WEBSITE PATCH] Updated:', websiteId);
      
      return NextResponse.json({
        success: true,
        website: data,
      });
    } catch (error: any) {
      console.error(' [WEBSITE PATCH] Error:', error);
      return NextResponse.json({
        success: false,
        error: 'Internal server error',
      }, { status: 500 });
    }
  }
);

// ==========================================
// DELETE - Delete website
// ==========================================
export const DELETE = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const websiteId = params.id;
      
      console.log('🗑️ [WEBSITE DELETE] User:', user.email, 'Website:', websiteId);
      
      //  Get authenticated client from request
      const supabase = await getAuthenticatedClient(req);
      
      // Verify ownership
      const { data: website, error: fetchError } = await supabase
        .from('websites')
        .select('id, user_id')
        .eq('id', websiteId)
        .eq('user_id', user.id)
        .single();
      
      if (fetchError || !website) {
        return NextResponse.json({
          success: false,
          error: 'Website not found or access denied',
        }, { status: 404 });
      }
      
      // Delete (cascade should handle related records)
      const { error } = await supabase
        .from('websites')
        .delete()
        .eq('id', websiteId);
      
      if (error) {
        console.error(' [WEBSITE DELETE] DB error:', error);
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 500 });
      }
      
      console.log(' [WEBSITE DELETE] Deleted:', websiteId);
      
      return NextResponse.json({
        success: true,
        message: 'Website deleted successfully',
      });
    } catch (error: any) {
      console.error(' [WEBSITE DELETE] Error:', error);
      return NextResponse.json({
        success: false,
        error: 'Internal server error',
      }, { status: 500 });
    }
  }
);