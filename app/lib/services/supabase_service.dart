import 'dart:io';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  final SupabaseClient _client = Supabase.instance.client;

  // Auth methods
  Future<AuthResponse> signUp(String email, String password) async {
    return await _client.auth.signUp(
      email: email,
      password: password,
    );
  }

  Future<AuthResponse> signIn(String email, String password) async {
    return await _client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  User? get currentUser => _client.auth.currentUser;

  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;

  // Storage methods
  Future<String> uploadFile(File file, String userId) async {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final fileName = '$userId/$timestamp.jpg';

    await _client.storage.from('report_media').upload(
          fileName,
          file,
          fileOptions: const FileOptions(
            contentType: 'image/jpeg',
          ),
        );

    return fileName;
  }

  String getPublicUrl(String path) {
    return _client.storage.from('report_media').getPublicUrl(path);
  }
}
