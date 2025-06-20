const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class OneDriveAPI {
  constructor() {
    this.baseURL = config.graphApiBase;
    this.accessToken = config.accessToken;
    this.driveId = config.driveId;
    
    // Axios instance oluştur
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Kullanıcı bilgilerini al
   */
  async getUserInfo() {
    try {
      await this.ensureValidToken();
      const response = await this.api.get('/me');
      return response.data;
    } catch (error) {
      throw new Error(`Kullanıcı bilgileri alınamadı: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Drive bilgilerini al
   */
  async getDriveInfo() {
    try {
      const response = await this.api.get(`/drives/${this.driveId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Drive bilgileri alınamadı: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Klasör içeriğini listele
   */
  async listFolder(folderId = 'root', pageSize = config.pageSize) {
    try {
      await this.ensureValidToken();
      const url = folderId === 'root' 
        ? `/drives/${this.driveId}/root/children`
        : `/drives/${this.driveId}/items/${folderId}/children`;
      
      const response = await this.api.get(url, {
        params: {
          $top: pageSize,
          $expand: 'thumbnails',
          $orderby: 'name asc'
        }
      });
      
      return {
        items: response.data.value || [],
        nextLink: response.data['@odata.nextLink'] || null,
        total: response.data.value?.length || 0
      };
    } catch (error) {
      throw new Error(`Klasör içeriği listelenemedi: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Dosya/klasör ara
   */
  async searchFiles(query, fileType = null, pageSize = config.pageSize) {
    try {
      await this.ensureValidToken();
      let searchQuery = query;
      
      // Dosya türü filtresi ekle
      if (fileType) {
        searchQuery += ` AND (name:*.${fileType})`;
      }
      
      const response = await this.api.get(`/drives/${this.driveId}/root/search(q='${encodeURIComponent(searchQuery)}')`, {
        params: {
          $top: pageSize,
          $expand: 'thumbnails',
          $orderby: 'lastModifiedDateTime desc'
        }
      });
      
      return {
        items: response.data.value || [],
        nextLink: response.data['@odata.nextLink'] || null,
        total: response.data.value?.length || 0
      };
    } catch (error) {
      throw new Error(`Arama işlemi başarısız: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Gelişmiş arama - içerik tabanlı
   */
  async advancedSearch(options = {}) {
    try {
      const {
        query = '',
        fileType = null,
        modifiedAfter = null,
        modifiedBefore = null,
        sizeMin = null,
        sizeMax = null,
        pageSize = config.pageSize
      } = options;

      let searchQuery = query;
      let filters = [];

      // Dosya türü filtresi
      if (fileType) {
        filters.push(`name:*.${fileType}`);
      }

      // Tarih filtreleri
      if (modifiedAfter) {
        filters.push(`lastModifiedDateTime:>${modifiedAfter}`);
      }
      
      if (modifiedBefore) {
        filters.push(`lastModifiedDateTime:<${modifiedBefore}`);
      }

      // Boyut filtreleri (Graph API size filter desteklemiyor, sonradan filtreleyeceğiz)
      
      if (filters.length > 0) {
        searchQuery += ` AND (${filters.join(' AND ')})`;
      }

      const response = await this.api.get(`/drives/${this.driveId}/root/search(q='${encodeURIComponent(searchQuery)}')`, {
        params: {
          $top: pageSize,
          $expand: 'thumbnails',
          $orderby: 'lastModifiedDateTime desc'
        }
      });

      let items = response.data.value || [];

      // Boyut filtresi uygula (client-side)
      if (sizeMin || sizeMax) {
        items = items.filter(item => {
          const size = item.size || 0;
          if (sizeMin && size < sizeMin) return false;
          if (sizeMax && size > sizeMax) return false;
          return true;
        });
      }

      return {
        items,
        nextLink: response.data['@odata.nextLink'] || null,
        total: items.length
      };
    } catch (error) {
      throw new Error(`Gelişmiş arama başarısız: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Dosya bilgilerini al
   */
  async getFileInfo(fileId) {
    try {
      const response = await this.api.get(`/drives/${this.driveId}/items/${fileId}`, {
        params: {
          $expand: 'thumbnails'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Dosya bilgileri alınamadı: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Dosya için görüntüleme linki oluştur
   */
  async createViewLink(fileId, permission = 'view') {
    try {
      const response = await this.api.post(`/drives/${this.driveId}/items/${fileId}/createLink`, {
        type: permission, // 'view', 'edit'
        scope: 'organization' // 'anonymous', 'organization'
      });
      return response.data;
    } catch (error) {
      throw new Error(`Görüntüleme linki oluşturulamadı: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Dosya için preview/embed linki oluştur (herkes görebilir, geçici)
   * Video, PDF, Word vb. dosyalar için uygun player ile açılır
   */
  async createPreviewLink(fileId) {
    try {
      // Anonymous embed link oluştur (herkes erişebilir)
      const response = await this.api.post(`/drives/${this.driveId}/items/${fileId}/createLink`, {
        type: 'embed', // embed tipinde link
        scope: 'anonymous' // herkese açık
      });
      return response.data;
    } catch (error) {
      throw new Error(`Önizleme linki oluşturulamadı: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Dosya preview bilgilerini al (URL + metadata)
   */
  async getPreviewInfo(fileId) {
    try {
      // Önce dosya bilgilerini al
      const fileInfo = await this.getFileInfo(fileId);
      
      // Embed link oluşturmaya çalış
      let embedLink = null;
      let previewData = null;
      
      try {
        embedLink = await this.createPreviewLink(fileId);
      } catch (embedError) {
        console.log('Embed link oluşturulamadı, normal görüntüleme linki deneniyor...');
        // Embed başarısız olursa normal view link oluştur
        embedLink = await this.createViewLink(fileId, 'view');
      }
      
      // Preview API'sini dene (opsiyonel)
      try {
        previewData = await this.getFilePreview(fileId);
      } catch (previewError) {
        // Preview desteklenmiyorsa devam et
        console.log('Preview API desteklenmiyor, sadece link oluşturuldu.');
      }

      return {
        previewUrl: previewData?.getUrl || null,
        embedUrl: embedLink.link?.webUrl || null,
        embedHtml: embedLink.link?.embedHtml || null,
        fileName: fileInfo.name,
        fileType: this.constructor.getFileType(fileInfo.name),
        fileSize: fileInfo.size,
        mimeType: fileInfo.file?.mimeType || null,
        isPreviewSupported: !!previewData?.getUrl,
        linkType: embedLink.link?.scope === 'anonymous' ? 'anonymous' : 'organization'
      };
    } catch (error) {
      throw new Error(`Önizleme bilgileri alınamadı: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Dosya için paylaşım linki oluştur
   */
  async createShareLink(fileId, permission = 'read', scope = 'organization') {
    try {
      const response = await this.api.post(`/drives/${this.driveId}/items/${fileId}/createLink`, {
        type: permission, // 'read', 'write'
        scope: scope // 'anonymous', 'organization'
      });
      return response.data;
    } catch (error) {
      throw new Error(`Paylaşım linki oluşturulamadı: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Dosya indir
   */
  async downloadFile(fileId, fileName, downloadPath = config.downloadPath) {
    try {
      // İndirme klasörünü oluştur
      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }

      // Dosya indirme URL'ini al
      const response = await this.api.get(`/drives/${this.driveId}/items/${fileId}/content`, {
        maxRedirects: 0,
        validateStatus: (status) => status === 302
      });

      const downloadUrl = response.headers.location;
      
      // Dosyayı indir
      const fileResponse = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream'
      });

      const filePath = path.join(downloadPath, fileName);
      const writer = fs.createWriteStream(filePath);

      fileResponse.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Dosya indirilemedi: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Dosya önizlemesi al
   */
  async getFilePreview(fileId) {
    try {
      const response = await this.api.post(`/drives/${this.driveId}/items/${fileId}/preview`);
      return response.data;
    } catch (error) {
      throw new Error(`Dosya önizlemesi alınamadı: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Dosya küçük resmi al
   */
  async getFileThumbnail(fileId, size = 'medium') {
    try {
      const response = await this.api.get(`/drives/${this.driveId}/items/${fileId}/thumbnails/0/${size}/content`, {
        responseType: 'arraybuffer'
      });
      return response.data;
    } catch (error) {
      throw new Error(`Küçük resim alınamadı: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Token geçerliliğini kontrol et
   */
  isTokenValid() {
    const expiry = new Date(config.tokenExpiry);
    const now = new Date();
    return expiry > now;
  }

  /**
   * Refresh token ile yeni access token al (rclone style)
   */
  async refreshAccessToken() {
    try {
      console.log('🔄 Token yenileniyor (rclone style)...');
      
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', config.refreshToken);
      params.append('client_id', config.clientId); // rclone public client_id
      // Not including client_secret because this is a public client

      const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const newToken = response.data;
      
      // rclone style config update
      const newExpiry = new Date(Date.now() + (newToken.expires_in * 1000));
      
      // Config'i güncelle
      config.accessToken = newToken.access_token;
      if (newToken.refresh_token) {
        config.refreshToken = newToken.refresh_token;
      }
      config.tokenExpiry = newExpiry.toISOString();

      // Axios instance'ı güncelle
      this.accessToken = config.accessToken;
      this.api.defaults.headers['Authorization'] = `Bearer ${this.accessToken}`;

      // Config dosyasını persist et (rclone style)
      await this.saveConfigToFile();

      console.log(`✅ Token yenilendi! Yeni expiry: ${newExpiry.toISOString()}`);
      return true;
    } catch (error) {
      console.error('❌ Token yenileme başarısız:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Config'i .env dosyasına kaydet (rclone style)
   */
  async saveConfigToFile() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // .env dosyasını oku
      const envPath = path.join(__dirname, '../.env');
      let envContent = '';
      
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // Token bilgilerini güncelle
      const updates = {
        'ONEDRIVE_ACCESS_TOKEN': config.accessToken,
        'ONEDRIVE_REFRESH_TOKEN': config.refreshToken,
        'ONEDRIVE_TOKEN_EXPIRY': config.tokenExpiry
      };
      
      Object.entries(updates).forEach(([key, value]) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}=${value}`;
        
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, newLine);
        } else {
          envContent += `\n${newLine}`;
        }
      });
      
      // .env dosyasına yaz
      fs.writeFileSync(envPath, envContent);
      console.log('💾 .env dosyası güncellendi (rclone style)');
      
    } catch (error) {
      console.warn('⚠️ .env dosyası kaydedilemedi:', error.message);
    }
  }

  /**
   * API çağrısı öncesi token kontrolü yap
   */
  async ensureValidToken() {
    if (!this.isTokenValid()) {
      console.log('⏰ Token süresi dolmuş, yenileniyor...');
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        throw new Error('Token yenilenemedi. Lütfen yeni bir token alın.');
      }
    }
  }

  /**
   * Dosya boyutunu insana okunabilir formata çevir
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Dosya türünü belirle
   */
  static getFileType(fileName) {
    const extension = path.extname(fileName).toLowerCase().substring(1);
    return extension || 'unknown';
  }

  /**
   * Dosya simgesini belirle
   */
  static getFileIcon(fileName) {
    const extension = this.getFileType(fileName);
    const icons = {
      pdf: '📄', doc: '📝', docx: '📝', txt: '📄',
      xls: '📊', xlsx: '📊', csv: '📊',
      ppt: '📊', pptx: '📊',
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', bmp: '🖼️', svg: '🖼️',
      mp4: '🎬', avi: '🎬', mkv: '🎬', mov: '🎬',
      mp3: '🎵', wav: '🎵',
      zip: '🗜️', rar: '🗜️', '7z': '🗜️', tar: '🗜️', gz: '🗜️',
      html: '🌐', js: '⚡', css: '🎨', json: '📋', xml: '📋'
    };
    return icons[extension] || '📄';
  }
}

module.exports = OneDriveAPI; 