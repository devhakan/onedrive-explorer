# 🚀 OneDrive Explorer CLI

> **OneDrive kurumsal hesabınız için şıkır şıkır bir CLI aracı!**

OneDrive Explorer, Microsoft Graph API kullanarak OneDrive Business hesabınızdaki dosyaları arama, görüntüleme linkleri oluşturma ve indirme işlemlerini kolaylıkla yapmanızı sağlayan güçlü bir komut satırı aracıdır.

## ✨ Özellikler

### 🔍 **Güçlü Arama Yetenekleri**
- Hızlı dosya arama
- Gelişmiş arama filtreleri (dosya türü, tarih, boyut)
- İçerik tabanlı arama
- Regex desteği

### 🔗 **Link Yönetimi**
- Görüntüleme linkleri oluşturma
- Paylaşım linkleri oluşturma
- Farklı izin seviyelerinde paylaşım
- Organizasyon içi/herkese açık paylaşım seçenekleri

### ⬇️ **Dosya İndirme**
- Tek dosya indirme
- Toplu indirme desteği
- İndirme ilerlemesi takibi
- Otomatik klasör oluşturma

### 🎮 **Kullanıcı Dostu Arayüz**
- İnteraktif menüler
- Renkli çıktılar
- Tablo formatında dosya listeleme
- Emoji destekli görsel arayüz

### 📊 **Bilgi Görüntüleme**
- Detaylı dosya bilgileri
- Kullanıcı profili
- Drive quota bilgisi
- Dosya meta verileri

## 🛠️ Kurulum

### Gereksinimler
- Node.js 14.0.0 veya üzeri
- npm veya yarn paket yöneticisi
- OneDrive Business hesabı
- Microsoft Graph API access token

### Kurulum Adımları

1. **Projeyi klonlayın:**
```bash
git clone <repository-url>
cd onedrive-explorer
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **Global olarak kurun (opsiyonel):**
```bash
npm install -g .
```

4. **Yapılandırmayı güncelleyin:**
`config.js` dosyasında OneDrive access token ve diğer bilgileri güncelleyin.

## ⚙️ Yapılandırma

`config.js` dosyasını düzenleyerek aşağıdaki ayarları yapılandırabilirsiniz:

```javascript
const config = {
  // OneDrive access token (rclone'dan alınan)
  accessToken: "your_access_token_here",
  
  // Drive ID
  driveId: "your_drive_id_here",
  
  // İndirme klasörü
  downloadPath: "./downloads",
  
  // Sayfalama ayarları
  pageSize: 50,
  
  // Desteklenen dosya türleri
  supportedFileTypes: ['pdf', 'docx', 'xlsx', ...],
};
```

### rclone Token'ını Kullanma

Eğer rclone yapılandırmanız varsa, `rclone config show` komutuyla token bilgilerinizi alabilirsiniz:

```bash
rclone config show your_onedrive_remote
```

## 🎯 Kullanım

### Komut Satırı Kullanımı

#### Temel Komutlar

```bash
# Yardım menüsü
onedrive-explorer --help

# Kullanıcı profili
onedrive-explorer profile

# Dosya arama
onedrive-explorer search "meeting notes"

# Gelişmiş arama
onedrive-explorer advanced-search

# Klasör listeleme
onedrive-explorer list

# İnteraktif mod
onedrive-explorer interactive
```

#### Arama Örnekleri

```bash
# Basit arama
onedrive-explorer search "budget"

# Dosya türü ile arama
onedrive-explorer search "presentation" --type pptx

# Sonuç sayısını sınırlama
onedrive-explorer search "report" --limit 10

# Kısa komut kullanımı
ode s "contract" -t pdf -l 20
```

### İnteraktif Mod

En kolay kullanım şekli interaktif moddur:

```bash
onedrive-explorer interactive
```

Bu mod size aşağıdaki seçenekleri sunar:
- 🔍 **Dosya Ara**: Hızlı arama yapın
- 🔎 **Gelişmiş Arama**: Detaylı filtrelemeli arama
- 📁 **Klasör Listele**: Klasör içeriklerini görüntüleyin
- 👤 **Profil Bilgileri**: Hesap ve drive bilgilerinizi görün

### Dosya İşlemleri

Bir dosya seçtikten sonra yapabileceğiniz işlemler:

- **📊 Dosya Bilgileri**: Detaylı meta veri görüntüleme
- **🔗 Görüntüleme Linki**: Sadece görüntüleme için link oluşturma
- **🔗 Paylaşım Linki**: Düzenleme yetkili link oluşturma
- **⬇️ Dosyayı İndir**: Yerel bilgisayara indirme
- **👁️ Tarayıcıda Aç**: Web tarayıcısında açma

## 📚 API Referansı

### OneDriveAPI Sınıfı

Ana API sınıfının önemli metodları:

```javascript
const api = new OneDriveAPI();

// Kullanıcı bilgileri
await api.getUserInfo();

// Dosya arama
await api.searchFiles(query, fileType, pageSize);

// Gelişmiş arama
await api.advancedSearch(options);

// Klasör listeleme
await api.listFolder(folderId, pageSize);

// Link oluşturma
await api.createViewLink(fileId);
await api.createShareLink(fileId, permission, scope);

// Dosya indirme
await api.downloadFile(fileId, fileName, downloadPath);

// Dosya bilgileri
await api.getFileInfo(fileId);
```

### Gelişmiş Arama Seçenekleri

```javascript
const searchOptions = {
  query: 'arama terimi',
  fileType: 'pdf',                    // Dosya uzantısı
  modifiedAfter: '2024-01-01',        // Bu tarihten sonra
  modifiedBefore: '2024-12-31',       // Bu tarihten önce
  sizeMin: 1024,                      // Minimum boyut (bytes)
  sizeMax: 10485760,                  // Maksimum boyut (bytes)
  pageSize: 50                        // Sayfa boyutu
};
```

## 🔧 Özelleştirme

### Dosya Simgeleri

`OneDriveAPI.getFileIcon()` metodunu düzenleyerek dosya türleri için farklı simgeler ekleyebilirsiniz:

```javascript
static getFileIcon(fileName) {
  const extension = this.getFileType(fileName);
  const icons = {
    pdf: '📄',
    docx: '📝',
    xlsx: '📊',
    // Yeni simgeler ekleyin...
  };
  return icons[extension] || '📄';
}
```

### İndirme Klasörü

İndirme klasörünü değiştirmek için `config.js` dosyasındaki `downloadPath` değerini güncelleyin:

```javascript
downloadPath: "~/Documents/OneDrive-Downloads"
```

### Sayfa Boyutu

Varsayılan sayfa boyutunu değiştirmek için:

```javascript
pageSize: 100  // Daha fazla sonuç
```

## 🛡️ Güvenlik

### Token Güvenliği

- Access token'ınızı güvenli tutun
- Token'ı version control sistemine yüklemeyin
- Düzenli olarak token'ı yenileyin
- Refresh token'ı kullanarak otomatik yenileme yapın

### İzinler

Bu araç aşağıdaki Microsoft Graph izinlerini kullanır:
- `Files.Read`: Dosya okuma
- `Files.Read.All`: Tüm dosyaları okuma
- `Files.ReadWrite`: Dosya okuma/yazma
- `Files.ReadWrite.All`: Tüm dosyalara okuma/yazma
- `Sites.Read.All`: Site okuma

## 🐛 Sorun Giderme

### Yaygın Hatalar

**Token Geçersiz:**
```
❌ 401 Unauthorized
```
**Çözüm:** Access token'ınızı yenileyin veya refresh token kullanarak yeni token alın.

**Dosya Bulunamadı:**
```
❌ 404 Not Found
```
**Çözüm:** Dosya ID'sini kontrol edin veya dosyanın silinip silinmediğini kontrol edin.

**İzin Hatası:**
```
❌ 403 Forbidden
```
**Çözüm:** Gerekli Graph API izinlerinin verildiğinden emin olun.

### Debug Modu

Detaylı hata mesajları için:

```bash
DEBUG=* onedrive-explorer search "test"
```

### Log Dosyaları

Hata logları `./logs/` klasöründe saklanır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add some amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📋 Yapılacaklar

- [ ] Refresh token otomatik yenileme
- [ ] Toplu dosya indirme
- [ ] Dosya yükleme özelliği
- [ ] Klasör oluşturma/silme
- [ ] Dosya paylaşım yönetimi
- [ ] Export/import özelliği
- [ ] Dosya önizleme
- [ ] Arama geçmişi
- [ ] Favori dosyalar
- [ ] Dosya etiketleme

## 📄 Lisans

MIT License - Detaylar için `LICENSE` dosyasına bakın.

## 👨‍💻 Geliştirici

**Hakan Özdemir**
- 📧 Email: hakan.ozdemir@uskudar.edu.tr
- 🐙 GitHub: [@hakanozdmr]

## 🙏 Teşekkürler

- Microsoft Graph API ekibine
- Node.js topluluğuna
- Açık kaynak katkıda bulunanlara

---

### 🚀 Hemen başlayın:

```bash
npm install
onedrive-explorer interactive
```

**Şıkır şıkır dosya yönetiminin tadını çıkarın!** 🎉 