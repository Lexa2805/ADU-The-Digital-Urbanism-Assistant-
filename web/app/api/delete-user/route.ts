import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * API Route pentru ștergerea utilizatorilor
 * Folosește Supabase Admin API pentru a șterge un user din Auth
 * Trigger-ul din baza de date va șterge automat profilul și datele asociate
 */
export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Initialize Supabase Admin Client cu Service Role Key
    // IMPORTANT: Service Role Key permite operații admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Șterge utilizatorul din Supabase Auth
    // Trigger-ul din DB va șterge automat:
    // - Profilul din profiles
    // - Cererile din requests
    // - Documentele din documents
    // - Mesajele din chat_messages
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
