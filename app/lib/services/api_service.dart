import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Update this with your FastAPI backend URL
  static const String baseUrl = 'http://localhost:8000';

  Future<Map<String, dynamic>> submitReport({
    required String assetId,
    required double lat,
    required double lon,
    required List<String> mediaUrls,
    String? comment,
  }) async {
    final url = Uri.parse('$baseUrl/api/v1/reports');

    final body = jsonEncode({
      'asset_id': assetId,
      'lat': lat,
      'lon': lon,
      'media_urls': mediaUrls,
      'comment': comment ?? '',
    });

    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body,
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to submit report: ${response.statusCode} - ${response.body}');
    }
  }
}
