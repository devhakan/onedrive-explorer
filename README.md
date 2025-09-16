# 🚀 OneDrive Explorer

Modern ve kullanıcı dostu OneDrive Business hesap explorer'ı. Rclone tabanlı, otomatik token yönetimi ile.

## ✨ Özellikler

- 🔍 **Akıllı Arama** - Dosya ve klasörlerde hızlı arama
- 📁 **Klasör Gezinti** - İnteraktif klasör tarama
- 📊 **Detaylı Bilgi** - Dosya boyutları, tarihleri ve metadata
- 🔗 **Link Oluşturma** - Paylaşım ve görüntüleme linkleri
- ⬇️ **Dosya İndirme** - Doğrudan dosya indirme
- 🎮 **İnteraktif Mod** - Menü tabanlı kullanım
- 🔄 **Otomatik Token Yenileme** - Sorunsuz erişim

## 📋 Gereksinimler

- **Node.js** (v14 veya üzeri)
- **rclone** ([İndir](https://rclone.org/downloads/))
- **OneDrive Business** hesabı

## 🚀 Kurulum

### 1. Projeyi İndirin
```bash
git clone <repo-url>
cd onedrive-explorer
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Rclone Konfigürasyonu
OneDrive hesabınızı rclone ile yapılandırın:
```bash
rclone config
```

Yapılandırma sırasında:
- **Storage türü:** Microsoft OneDrive seçin
- **Client ID/Secret:** Varsayılan değerleri kullanabilirsiniz
- **Hesap türü:** OneDrive Business seçin
- **Yetkilendirme:** Tarayıcıda Microsoft hesabınızla giriş yapın

## 🎯 Kullanım

### İlk Kurulum
Rclone konfigürasyonunuzdan otomatik `.env` dosyası oluşturun:
```bash
node rclone-dump.js
```

Bu komut:
- Mevcut OneDrive hesaplarınızı listeler
- Seçtiğiniz hesabın token bilgilerini alır
- `.env` dosyasını otomatik oluşturur
- **Token süresi dolmuşsa otomatik yeniler**

### Ana Komutlar

#### 💾 Hesap Bilgileri
```bash
node onedrive-explorer.js drive-info
```

#### 🔍 Dosya Arama
```bash
# Basit arama
node onedrive-explorer.js search "dosya_adi"

# Pipe ile kullanım (interaktif olmayan)
node onedrive-explorer.js search "dosya_adi" --quiet | head -20
```

#### 📁 Klasör Listeleme
```bash
# Kök klasör
node onedrive-explorer.js list

# Belirli klasör (klasör ID ile)
node onedrive-explorer.js list KLASOR_ID
```

#### 🎮 İnteraktif Mod
```bash
node onedrive-explorer.js interactive
```

#### 🔎 Gelişmiş Arama
```bash
node onedrive-explorer.js advanced-search
```

## 📖 Komut Detayları

### Arama Seçenekleri
- **--quiet (-q):** Sadece sonuçları göster, menü gösterme
- Dosya türü filtreleme (PDF, Word, Excel, vb.)
- Tarih aralığı filtreleme
- Boyut sınırlandırması

### Dosya İşlemleri
- 📊 Detaylı dosya bilgileri
- 🔗 Görüntüleme linki oluşturma
- 🔗 Paylaşım linki oluşturma (okuma/yazma)
- ⬇️ Dosya indirme
- 👁️ Tarayıcıda önizleme

## 🔧 Token Yönetimi

### Otomatik Yenileme
Script, token durumunu otomatik kontrol eder:
- Token süresi dolmuşsa → otomatik yeniler
- 10 dakika içinde dolacaksa → otomatik yeniler
- Rclone'un kendi yenileme mekanizmasını kullanır

### Manuel Yenileme
Gerekirse token'ları manuel yenileyebilirsiniz:
```bash
# Tüm hesapların token'larını yenile
rclone about hesap-adi:

# Sonra .env dosyasını güncelle
node rclone-dump.js
```

## 📁 Proje Yapısı

```
onedrive-explorer/
├── onedrive-explorer.js           # Ana uygulama
├── rclone-dump.js                 # Token yönetimi ve kurulum
├── lib/
│   ├── onedrive-api.js            # OneDrive API wrapper
│   └── utils.js                   # Yardımcı fonksiyonlar
├── examples/
│   └── basic-usage.js             # Örnek kullanım
├── package.json                   # Proje bağımlılıkları
└── README.md
```

## 🚨 Sorun Giderme

### Token Hatası
```bash
# 1. Token'ları yenile
rclone about hesap-adi:

# 2. .env dosyasını güncelle
node rclone-dump.js
```

### Hesap Bulunamadı
```bash
# Rclone konfigürasyonunu kontrol et
rclone config show

# Yeni hesap ekle
rclone config
```

### Bağlantı Hatası
- İnternet bağlantınızı kontrol edin
- Rclone'un güncel olduğundan emin olun
- Microsoft hesabınızın aktif olduğunu kontrol edin

## 🔒 Güvenlik

- Token bilgileri sadece lokal `.env` dosyasında saklanır
- Microsoft'un resmi OAuth2 akışı kullanılır
- Hassas bilgiler repository'de yer almaz

## 📝 Lisans

MIT License

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📞 Destek



---

**⚡ Hızlı Başlangıç:**
```bash
npm install
node rclone-dump.js  # Kurulum
node onedrive-explorer.js interactive  # Kullanım
```