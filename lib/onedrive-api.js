const axios = require('axios');
const fs = require('fs');

class OneDriveAPI {
  constructor() {
    this.accessToken = process.env.ACCESS_TOKEN;
    this.refreshToken = process.env.REFRESH_TOKEN;
    this.driveId = process.env.DRIVE_ID;
    this.clientId = process.env.CLIENT_ID;
    this.tenantId = process.env.TENANT_ID;
    this.configName = process.env.RCLONE_CONFIG_NAME;
    this.baseUrl = 'https://graph.microsoft.com/v1.0';
    this.tokenExpiry = null;
    this.lastRefreshTime = 0; // Son yenileme zamanı
    
    // Token süresini kontrol et
    this.checkTokenExpiry();
  }

  /**
   * Token süresini kontrol et ve gerekirse yenile
   */
  checkTokenExpiry() {
    try {
      if (!this.accessToken) return;
      
      // JWT token'ı decode et
      const parts = this.accessToken.split('.');
      if (parts.length !== 3) return;
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      this.tokenExpiry = new Date(payload.exp * 1000);
      
      // Token 10 dakika içinde sona eriyorsa yenile
      const now = new Date();
      const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
      
      if (this.tokenExpiry <= tenMinutesFromNow) {
        // Son yenilemeden bu yana en az 30 saniye geçmiş olmalı
        const now = Date.now();
        if (now - this.lastRefreshTime > 30000) {
          console.log('⚠️ Token süresi dolmak üzere, rclone\'dan güncel token alınıyor...');
          this.refreshTokenFromRclone();
        }
      }
    } catch (error) {
      console.warn('⚠️ Token süresi kontrol edilemedi:', error.message);
    }
  }

  /**
   * Rclone'dan güncel token'ı al ve .env dosyasını güncelle
   */
  async refreshTokenFromRclone() {
    try {
      // Yenileme zamanını kaydet
      this.lastRefreshTime = Date.now();
      
      const { execSync } = require('child_process');
      const configOutput = execSync('rclone config dump', { encoding: 'utf8' });
      const config = JSON.parse(configOutput);
      
      // Mevcut config ismini kullanarak güncel token'ı al
      const configName = this.configName || 'sy-1'; // Varsayılan olarak sy-1
      
      if (config[configName] && config[configName].token) {
        const tokenData = JSON.parse(config[configName].token);
        
        // Yeni token'ları güncelle
        this.accessToken = tokenData.access_token;
        this.refreshToken = tokenData.refresh_token;
        
        // Process environment'ını da güncelle
        process.env.ACCESS_TOKEN = tokenData.access_token;
        process.env.REFRESH_TOKEN = tokenData.refresh_token;
        
        // .env dosyasını güncelle
        this.updateEnvFile({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          driveId: this.driveId,
          clientId: this.clientId,
          tenantId: this.tenantId,
          configName: configName,
          expiry: tokenData.expiry
        });
        
        console.log('✅ Token başarıyla yenilendi!');
        
        // Yeni token süresi kontrolü
        this.checkTokenExpiry();
        
        return true;
      } else {
        throw new Error(`Rclone config'inde "${configName}" bulunamadı`);
      }
    } catch (error) {
      console.error('❌ Token yenileme hatası:', error.message);
      return false;
    }
  }

  /**
   * .env dosyasını güncelle
   */
  updateEnvFile(envData) {
    try {
      const envContent = `# OneDrive Business hesap bilgileri (rclone config dump ile otomatik oluşturuldu)
# ACCESS_TOKEN ve REFRESH_TOKEN alanlarına SADECE JWT (noktalı, uzun string) yazılır.
ACCESS_TOKEN=${envData.accessToken}
REFRESH_TOKEN=${envData.refreshToken}
DRIVE_ID=${envData.driveId}
CLIENT_ID=${envData.clientId || 'token-icinde-bulunamadi'}
TENANT_ID=${envData.tenantId || 'token-icinde-bulunamadi'}
RCLONE_CONFIG_NAME=${envData.configName}

# Token bitiş tarihi: ${envData.expiry || 'Bilinmiyor'}
# Son güncelleme: ${new Date().toISOString()}
`;
      fs.writeFileSync('.env', envContent);
      console.log('✅ .env dosyası güncellendi.');
    } catch (error) {
      console.error('❌ .env dosyası güncellenirken hata:', error.message);
    }
  }

  /**
   * API çağrısı yap ve hata durumunda token yenile
   */
  async makeApiCall(url, options = {}) {
    try {
      const response = await axios({
        url,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      return response;
    } catch (error) {
      // 401 Unauthorized hatası varsa token yenile
      if (error.response?.status === 401) {
        // Son yenilemeden bu yana en az 30 saniye geçmiş olmalı
        const now = Date.now();
        if (now - this.lastRefreshTime > 30000) {
          console.log('🔄 Token geçersiz, yenileniyor...');
          const refreshed = await this.refreshTokenFromRclone();
          
          if (refreshed) {
            // Token yenilenirse tekrar dene
            const retryResponse = await axios({
              url,
              headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers
              },
              ...options
            });
            return retryResponse;
          }
        } else {
          console.log('⚠️ Token yakın zamanda yenilendi, tekrar denenmeyecek');
        }
      }
      throw error;
    }
  }

  /**
   * Drive alan bilgilerini al
   */
  async getDriveInfo() {
    try {
      const url = `${this.baseUrl}/me/drive`;
      const response = await this.makeApiCall(url);
      const quota = response.data.quota;
      return {
        total: quota?.total || 0,
        used: quota?.used || 0,
        remaining: quota?.remaining || 0
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * JWT token'dan kullanıcı e-posta adını çıkar
   */
  getEmailFromToken() {
    try {
      if (!this.accessToken) return 'Bilinmiyor';
      
      // JWT token'ı decode et
      const parts = this.accessToken.split('.');
      if (parts.length !== 3) return 'Bilinmiyor';
      
      // Payload'ı decode et
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // E-posta bilgisini bul
      const email = payload.upn || payload.preferred_username || payload.email || payload.name;
      
      return email || 'Bilinmiyor';
    } catch (error) {
      return 'Bilinmiyor';
    }
  }

  /**
   * .env dosyasından rclone config ismini al
   */
  getEmailFromRcloneConfig() {
    try {
      // Önce .env dosyasından config ismini almaya çalış
      if (process.env.RCLONE_CONFIG_NAME) {
        return process.env.RCLONE_CONFIG_NAME;
      }
      
      // Fallback: rclone config dump ile ilk OneDrive config'ini bul
      const { execSync } = require('child_process');
      const configOutput = execSync('rclone config dump', { encoding: 'utf8' });
      const config = JSON.parse(configOutput);
      
      // sy-1, sy-2, sy-3 gibi OneDrive konfigürasyonlarını bul
      const oneDriveConfigs = Object.entries(config)
        .filter(([, config]) => config.type === 'onedrive')
        .map(([name, config]) => ({ name, config }));
      
      if (oneDriveConfigs.length > 0) {
        // İlk OneDrive konfigürasyonunu kullan
        const config = oneDriveConfigs[0];
        return config.name; // sy-1, sy-2 gibi
      }
      
      return 'Bilinmiyor';
    } catch (error) {
      return 'Bilinmiyor';
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Dosya arama
   */
  async searchFiles(query, type = null, limit = 50) {
    try {
      let url = `${this.baseUrl}/me/drive/root/search(q='${encodeURIComponent(query)}')`;
      const response = await this.makeApiCall(url);
      let items = response.data.value || [];
      if (type) {
        const archiveTypes = ['zip', 'tar', 'tar.gz', 'gz', 'rar'];
        if (type === 'folder') {
          items = items.filter(item => item.folder);
        } else if (type === 'archive') {
          items = items.filter(item => {
            if (item.folder) return false;
            const ext = require('./utils').getFileExtension(item.name);
            return archiveTypes.includes(ext);
          });
        } else if (archiveTypes.includes(type)) {
          items = items.filter(item => {
            if (item.folder) return false;
            const ext = require('./utils').getFileExtension(item.name);
            return ext === type;
          });
        } else {
          items = items.filter(item => {
            if (item.folder) return false;
            return item.name.toLowerCase().endsWith(type.toLowerCase());
          });
        }
      }
      return {
        total: items.length,
        items: items.slice(0, limit)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Klasör içeriği listele
   */
  async listFolder(folderId = 'root', limit = 50) {
    try {
      const url = `${this.baseUrl}/me/drive/items/${folderId}/children`;
      const response = await this.makeApiCall(url);
      const items = response.data.value || [];
      // Eklenme tarihine göre azalan sırala (en yeni en üstte)
      items.sort((a, b) => {
        const aTime = new Date(a.createdDateTime).getTime();
        const bTime = new Date(b.createdDateTime).getTime();
        return bTime - aTime;
      });
      return {
        total: items.length,
        items: items.slice(0, limit)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Gelişmiş arama (sadece basit filtreleme ile)
   */
  async advancedSearch(options) {
    // Sadece query ve fileType destekliyoruz, diğerleri için ek geliştirme gerekir
    return this.searchFiles(options.query, options.fileType, options.pageSize || 50);
  }

  /**
   * Dosya bilgisi getir
   */
  async getFileInfo(fileId) {
    try {
      const url = `${this.baseUrl}/me/drive/items/${fileId}`;
      const response = await this.makeApiCall(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Görüntüleme linki oluştur
   */
  async createViewLink(fileId) {
    try {
      const url = `${this.baseUrl}/me/drive/items/${fileId}/createLink`;
      const response = await this.makeApiCall(url, {
        method: 'POST',
        data: { type: 'view' }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Paylaşım linki oluştur
   */
  async createShareLink(fileId, permission = 'view') {
    try {
      const url = `${this.baseUrl}/me/drive/items/${fileId}/createLink`;
      const response = await this.makeApiCall(url, {
        method: 'POST',
        data: { type: permission === 'write' ? 'edit' : 'view' }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Dosya indir
   */
  async downloadFile(fileId, fileName) {
    const fs = require('fs');
    const path = require('path');
    const Utils = require('./utils');
    try {
      const url = `${this.baseUrl}/me/drive/items/${fileId}/content`;
      const response = await this.makeApiCall(url, {
        responseType: 'stream'
      });
      const safeName = Utils.sanitizeFileName(fileName);
      const filePath = path.join(process.cwd(), safeName);
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      return filePath;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Dosya önizleme linki al
   */
  async getFilePreview(fileId) {
    try {
      const url = `${this.baseUrl}/me/drive/items/${fileId}`;
      const response = await this.makeApiCall(url);
      
      // Dosya bilgisinden web URL'i al
      if (response.data.webUrl) {
        return {
          getUrl: response.data.webUrl
        };
      } else {
        throw new Error('Dosya için önizleme URL\'i bulunamadı');
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = OneDriveAPI; 