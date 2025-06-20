const config = {
  // === Zorunlu Ayarlar ===
  
  // Microsoft Graph API için rclone gibi bir araçla oluşturulmuş 'clientId'.
  // Genellikle genel bir değerdir.
  clientId: "b15665d9-eda6-4092-8539-0eec376afd59", // rclone varsayılan public client ID'si

  // Microsoft Graph API'den alınan ve 'Files.Read.All', 'Sites.Read.All' gibi
  // gerekli izinlere sahip olan erişim belirteci (access token).
  accessToken: "BURAYA_ERISIM_TOKENINIZI_YAPISTIRIN",

  // Erişim belirtecinin süresi dolduğunda yeni bir tane almak için kullanılan
  // yenileme belirteci (refresh token).
  refreshToken: "BURAYA_YENILEME_TOKENINIZI_YAPISTIRIN",

  // Sorgulanacak OneDrive hesabının 'driveId' değeri.
  // Graph Explorer (https://developer.microsoft.com/en-us/graph/graph-explorer) üzerinden
  // 'https://graph.microsoft.com/v1.0/me/drive' sorgusu ile elde edilebilir.
  driveId: "BURAYA_DRIVE_ID_YAPISTIRIN",

  // Drive türü: 'business' veya 'personal'
  driveType: "business",

  // === Opsiyonel Ayarlar ===

  // Token'ın son geçerlilik tarihi (UTC formatında).
  // !! UYARI: Bu değer, token yenileme işlemi sırasında program tarafından
  // !! otomatik olarak güncellenir. İlk kurulum dışında manuel olarak
  // !! değiştirmeniz önerilmez.
  tokenExpiry: "2025-01-01T00:00:00Z",

  // İndirilecek dosyaların kaydedileceği varsayılan klasör.
  downloadPath: "./downloads",
  
  // Liste ve arama sonuçlarında sayfa başına gösterilecek öğe sayısı.
  pageSize: 50,
  
  // Microsoft Graph API temel URL'si. Genellikle değiştirilmesine gerek yoktur.
  graphApiBase: "https://graph.microsoft.com/v1.0",
};

module.exports = config; 