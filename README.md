# 🚀 OneDrive Explorer CLI

> OneDrive kurumsal hesabınız için basit ve etkili bir komut satırı aracı.

OneDrive Explorer, Microsoft Graph API kullanarak OneDrive Business hesabınızdaki dosyaları listelemenizi ve aramanızı sağlar.

## ✨ Temel Özellikler

- **Dosya Listeleme**: Belirtilen bir klasör veya ana dizindeki dosyaları ve klasörleri listeler.
- **Dosya Arama**: Anahtar kelime ile dosyaları arar.

## 🛠️ Kurulum

### Gereksinimler
- Node.js v14.0.0 veya üzeri
- npm
- OneDrive Business hesabı
- Microsoft Graph API `accessToken` ve `driveId`

### Kurulum Adımları

1.  **Projeyi klonlayın:**
    ```bash
    git clone https://github.com/your-username/onedrive-explorer.git
    cd onedrive-explorer
    ```

2.  **Bağımlılıkları yükleyin:**
    ```bash
    npm install
    ```

3.  **Yapılandırmayı güncelleyin:**
    Projenin ana dizininde bulunan `config.js` dosyasını açın ve kendi bilgilerinizi girin.

## ⚙️ Yapılandırma

`config.js` dosyası projenin çalışması için kritik öneme sahiptir.

```javascript
// config.js
const config = {
  // Microsoft Graph API'den alınan geçerli bir Access Token.
  // Bu token'ın 'Files.ReadWrite.All', 'Sites.Read.All' ve 'User.Read' gibi izinlere sahip olması gerekir.
  accessToken: "PASTE_YOUR_ACCESS_TOKEN_HERE",

  // OneDrive'ınızın Drive ID'si.
  // Graph Explorer (https://developer.microsoft.com/en-us/graph/graph-explorer) üzerinden
  // https://graph.microsoft.com/v1.0/me/drive sorgusu ile elde edilebilir.
  driveId: "PASTE_YOUR_DRIVE_ID_HERE",
  
  // Diğer ayarlar...
};

module.exports = config;
```

**ÖNEMLİ:** `accessToken` süresi dolabilir. Eğer `Insufficient privileges` gibi hatalar alıyorsanız, token'ınızı yenilemeniz gerekir.

## 🎯 Kullanım

Proje, `node cli.js` komutu ile çalıştırılır.

### Komutlar

- **Dosyaları Listeleme:**
  ```bash
  # Ana dizini listeler
  node cli.js list

  # Belirli bir klasör ID'sini listeler
  node cli.js list --folderId FOLDER_ID
  ```

- **Dosya Arama:**
  ```bash
  # "rapor" kelimesini içeren dosyaları arar
  node cli.js search "rapor"
  ```

- **Yardım:**
  ```bash
  node cli.js --help
  ```

## ⚠️ Bilinen Sorunlar

Bu proje geliştirme aşamasındadır ve bazı bilinen sorunları vardır:

1.  **Yetkilendirme Hataları**: `accessToken` geçerli değilse veya yeterli yetkilere sahip değilse, `Insufficient privileges` hatası alabilirsiniz. Token'ınızın güncel ve doğru kapsamlara sahip olduğundan emin olun.
2.  **Arama Hataları**: Microsoft Graph API, bazı özel karakterler içeren veya boş arama sorgularında `A potentially dangerous Request.Path` hatası döndürebilir.
3.  **İnteraktif Mod**: İnteraktif mod (`interactive` komutu) şu anda bozuktur ve `inquirer.prompt is not a function` hatası vermektedir. Bu özellik gelecek versiyonlarda düzeltilecektir.

## 🤝 Katkıda Bulunma

Katkılarınız için açığım! Lütfen bir pull request açmaktan çekinmeyin.

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

---

### 🚀 Hemen başlayın:

```bash
npm install
node cli.js interactive
```

**Şıkır şıkır dosya yönetiminin tadını çıkarın!** 🎉 