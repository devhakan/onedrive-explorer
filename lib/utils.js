const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Yardımcı fonksiyonlar sınıfı
 */
class Utils {
  
  /**
   * Klasör oluştur (yoksa)
   */
  static ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Dosya boyutunu insana okunabilir formata çevir
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Tarih formatla
   */
  static formatDate(dateString, format = 'DD.MM.YYYY HH:mm') {
    const moment = require('moment');
    return moment(dateString).format(format);
  }

  /**
   * Dosya uzantısını al
   */
  static getFileExtension(fileName) {
    return path.extname(fileName).toLowerCase().substring(1);
  }

  /**
   * Dosya adını temizle (indirme için güvenli hale getir)
   */
  static sanitizeFileName(fileName) {
    // Özel karakterleri temizle
    return fileName.replace(/[<>:"/\\|?*]/g, '_').trim();
  }

  /**
   * Progress bar oluştur
   */
  static createProgressBar(total, current, barLength = 30) {
    const percentage = Math.round((current / total) * 100);
    const filledLength = Math.round((barLength * current) / total);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    return `${bar} ${percentage}% (${current}/${total})`;
  }

  /**
   * Başarı mesajı
   */
  static success(message) {
    console.log(chalk.green(`✅ ${message}`));
  }

  /**
   * Hata mesajı
   */
  static error(message) {
    console.error(chalk.red(`❌ ${message}`));
  }

  /**
   * Uyarı mesajı
   */
  static warning(message) {
    console.log(chalk.yellow(`⚠️ ${message}`));
  }

  /**
   * Bilgi mesajı
   */
  static info(message) {
    console.log(chalk.blue(`ℹ️ ${message}`));
  }

  /**
   * Başlık yazdır
   */
  static printHeader(title) {
    const line = '═'.repeat(title.length + 4);
    console.log(chalk.blue.bold(`\n${line}`));
    console.log(chalk.blue.bold(`  ${title}  `));
    console.log(chalk.blue.bold(`${line}\n`));
  }

  /**
   * Dosya türü kategorisini belirle
   */
  static getFileCategory(fileName) {
    const extension = this.getFileExtension(fileName);
    
    const categories = {
      document: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
      spreadsheet: ['xls', 'xlsx', 'csv', 'ods'],
      presentation: ['ppt', 'pptx', 'odp'],
      image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff'],
      video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
      audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
      archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
      code: ['js', 'html', 'css', 'php', 'py', 'java', 'cpp', 'c', 'ts'],
      data: ['json', 'xml', 'yaml', 'sql', 'db']
    };

    for (const [category, extensions] of Object.entries(categories)) {
      if (extensions.includes(extension)) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Kategoriye göre emoji al
   */
  static getCategoryEmoji(category) {
    const emojis = {
      document: '📄',
      spreadsheet: '📊',
      presentation: '📊',
      image: '🖼️',
      video: '🎬',
      audio: '🎵',
      archive: '🗜️',
      code: '💻',
      data: '📋',
      folder: '📁',
      other: '📄'
    };

    return emojis[category] || '📄';
  }

  /**
   * Dosya simgesi al
   */
  static getFileIcon(fileName, isFolder = false) {
    if (isFolder) {
      return this.getCategoryEmoji('folder');
    }

    const category = this.getFileCategory(fileName);
    return this.getCategoryEmoji(category);
  }

  /**
   * Zaman aralığını hesapla (örn: "2 saat önce")
   */
  static timeAgo(dateString) {
    const moment = require('moment');
    moment.locale('tr');
    return moment(dateString).fromNow();
  }

  /**
   * JSON dosyasını güvenli şekilde oku
   */
  static readJsonFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      this.error(`JSON dosyası okunamadı: ${error.message}`);
      return null;
    }
  }

  /**
   * JSON dosyasını güvenli şekilde yaz
   */
  static writeJsonFile(filePath, data) {
    try {
      this.ensureDirectory(path.dirname(filePath));
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      this.error(`JSON dosyası yazılamadı: ${error.message}`);
      return false;
    }
  }

  /**
   * Dosya var mı kontrol et
   */
  static fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  /**
   * Dosya boyutunu al
   */
  static getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Geçerli bir URL mi kontrol et
   */
  static isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Dosya adından güvenli indirme adı oluştur
   */
  static createSafeDownloadName(fileName, conflictIndex = 0) {
    const extension = path.extname(fileName);
    const baseName = path.basename(fileName, extension);
    const safeName = this.sanitizeFileName(baseName);
    
    if (conflictIndex === 0) {
      return `${safeName}${extension}`;
    }
    
    return `${safeName}_${conflictIndex}${extension}`;
  }

  /**
   * Benzersiz dosya adı oluştur (aynı isimde dosya varsa)
   */
  static getUniqueFileName(dirPath, fileName) {
    let counter = 0;
    let newFileName = fileName;
    
    while (this.fileExists(path.join(dirPath, newFileName))) {
      counter++;
      newFileName = this.createSafeDownloadName(fileName, counter);
    }
    
    return newFileName;
  }

  /**
   * Bellek kullanımını formatla
   */
  static formatMemoryUsage() {
    const usage = process.memoryUsage();
    const formatMB = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100;
    
    return {
      rss: formatMB(usage.rss),
      heapTotal: formatMB(usage.heapTotal),
      heapUsed: formatMB(usage.heapUsed),
      external: formatMB(usage.external)
    };
  }

  /**
   * CLI tablosuna renk ekle
   */
  static colorizeTableData(data, colors = {}) {
    return data.map((row, rowIndex) => {
      if (rowIndex === 0) {
        // Header row
        return row.map(cell => chalk.bold.blue(cell));
      }
      
      return row.map((cell, colIndex) => {
        const color = colors[colIndex] || 'white';
        return chalk[color](cell);
      });
    });
  }

  /**
   * Dosya türü validasyonu
   */
  static isValidFileType(fileName, allowedTypes = []) {
    if (allowedTypes.length === 0) return true;
    
    const extension = this.getFileExtension(fileName);
    return allowedTypes.includes(extension);
  }

  /**
   * Hızlı dosya boyutu karşılaştırması
   */
  static compareSizes(size1, size2) {
    if (size1 > size2) return 1;
    if (size1 < size2) return -1;
    return 0;
  }

  /**
   * Log dosyasına yaz
   */
  static log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    const logDir = './logs';
    this.ensureDirectory(logDir);
    
    const logFile = path.join(logDir, `onedrive-explorer-${new Date().toISOString().split('T')[0]}.log`);
    
    try {
      fs.appendFileSync(logFile, logMessage);
    } catch (error) {
      console.error('Log yazılamadı:', error.message);
    }
  }
}

module.exports = Utils; 