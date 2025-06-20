const OneDriveAPI = require('../lib/onedrive-api');
const Utils = require('../lib/utils');

/**
 * OneDrive Explorer API - Temel Kullanım Örnekleri
 */

async function basicUsageExamples() {
  const api = new OneDriveAPI();
  
  Utils.printHeader('OneDrive Explorer - Temel Kullanım Örnekleri');
  
  try {
    // 1. Kullanıcı bilgilerini al
    Utils.info('1. Kullanıcı bilgileri alınıyor...');
    const userInfo = await api.getUserInfo();
    console.log(`👤 Kullanıcı: ${userInfo.displayName} (${userInfo.mail})`);
    
    // 2. Drive bilgilerini al
    Utils.info('2. Drive bilgileri alınıyor...');
    const driveInfo = await api.getDriveInfo();
    console.log(`💾 Drive: ${driveInfo.name}`);
    console.log(`📊 Toplam Alan: ${Utils.formatFileSize(driveInfo.quota?.total || 0)}`);
    console.log(`📦 Kullanılan: ${Utils.formatFileSize(driveInfo.quota?.used || 0)}`);
    
    // 3. Kök klasör içeriğini listele
    Utils.info('3. Kök klasör içeriği listeleniyor...');
    const rootContents = await api.listFolder('root', 10);
    console.log(`📁 Bulunan öğe sayısı: ${rootContents.total}`);
    
    rootContents.items.forEach(item => {
      const icon = Utils.getFileIcon(item.name, !!item.folder);
      const size = item.folder ? '-' : Utils.formatFileSize(item.size || 0);
      console.log(`  ${icon} ${item.name} (${size})`);
    });
    
    // 4. Dosya arama
    Utils.info('4. "presentation" kelimesi aranıyor...');
    const searchResults = await api.searchFiles('presentation', null, 5);
    console.log(`🔍 Bulunan dosya sayısı: ${searchResults.total}`);
    
    searchResults.items.forEach(item => {
      const icon = Utils.getFileIcon(item.name);
      const size = Utils.formatFileSize(item.size || 0);
      const modified = Utils.timeAgo(item.lastModifiedDateTime);
      console.log(`  ${icon} ${item.name} (${size}, ${modified})`);
    });
    
    // 5. Belirli dosya türlerinde arama
    Utils.info('5. PDF dosyaları aranıyor...');
    const pdfResults = await api.searchFiles('', 'pdf', 5);
    console.log(`📄 Bulunan PDF sayısı: ${pdfResults.total}`);
    
    // 6. Gelişmiş arama örneği
    Utils.info('6. Gelişmiş arama yapılıyor...');
    const advancedResults = await api.advancedSearch({
      query: 'report',
      fileType: 'docx',
      pageSize: 3
    });
    console.log(`📝 Bulunan Word dosyası sayısı: ${advancedResults.total}`);
    
    // 7. İlk dosya için görüntüleme linki oluştur
    if (searchResults.items.length > 0) {
      const firstFile = searchResults.items[0];
      Utils.info(`7. "${firstFile.name}" için görüntüleme linki oluşturuluyor...`);
      
      try {
        const viewLink = await api.createViewLink(firstFile.id);
        console.log(`🔗 Görüntüleme Linki: ${viewLink.link.webUrl}`);
      } catch (linkError) {
        Utils.warning('Görüntüleme linki oluşturulamadı: ' + linkError.message);
      }
    }
    
    // 8. Dosya bilgilerini detaylı göster
    if (searchResults.items.length > 0) {
      const firstFile = searchResults.items[0];
      Utils.info(`8. "${firstFile.name}" dosya bilgileri alınıyor...`);
      
      const fileInfo = await api.getFileInfo(firstFile.id);
      console.log(`📄 Ad: ${fileInfo.name}`);
      console.log(`📊 Boyut: ${Utils.formatFileSize(fileInfo.size || 0)}`);
      console.log(`📅 Oluşturulma: ${Utils.formatDate(fileInfo.createdDateTime)}`);
      console.log(`📅 Değiştirilme: ${Utils.formatDate(fileInfo.lastModifiedDateTime)}`);
      console.log(`👤 Oluşturan: ${fileInfo.createdBy?.user?.displayName || 'Bilinmiyor'}`);
    }
    
    Utils.success('Tüm örnekler başarıyla çalıştırıldı!');
    
  } catch (error) {
    Utils.error(`Örnek çalıştırılırken hata oluştu: ${error.message}`);
    console.error(error);
  }
}

/**
 * Arama örnekleri
 */
async function searchExamples() {
  const api = new OneDriveAPI();
  
  Utils.printHeader('Arama Örnekleri');
  
  const searchQueries = [
    { query: 'meeting', description: 'Meeting kelimesi geçen dosyalar' },
    { query: 'budget', description: 'Budget kelimesi geçen dosyalar' },
    { query: 'contract', description: 'Contract kelimesi geçen dosyalar' },
    { query: '2024', description: '2024 geçen dosyalar' }
  ];
  
  for (const search of searchQueries) {
    try {
      Utils.info(`"${search.query}" aranıyor - ${search.description}`);
      const results = await api.searchFiles(search.query, null, 3);
      
      if (results.total > 0) {
        results.items.forEach(item => {
          const icon = Utils.getFileIcon(item.name, !!item.folder);
          const size = item.folder ? 'Klasör' : Utils.formatFileSize(item.size || 0);
          console.log(`  ${icon} ${item.name} (${size})`);
        });
      } else {
        console.log(`  🤷‍♂️ Hiç sonuç bulunamadı`);
      }
      
      console.log(''); // Boş satır
      
    } catch (error) {
      Utils.error(`"${search.query}" araması başarısız: ${error.message}`);
    }
  }
}

/**
 * Dosya türü örnekleri
 */
async function fileTypeExamples() {
  const api = new OneDriveAPI();
  
  Utils.printHeader('Dosya Türü Arama Örnekleri');
  
  const fileTypes = [
    { type: 'pdf', name: 'PDF Dosyaları', emoji: '📄' },
    { type: 'docx', name: 'Word Dosyaları', emoji: '📝' },
    { type: 'xlsx', name: 'Excel Dosyaları', emoji: '📊' },
    { type: 'pptx', name: 'PowerPoint Dosyaları', emoji: '📊' },
    { type: 'jpg', name: 'JPEG Resimleri', emoji: '🖼️' }
  ];
  
  for (const fileType of fileTypes) {
    try {
      Utils.info(`${fileType.emoji} ${fileType.name} aranıyor...`);
      const results = await api.searchFiles('', fileType.type, 5);
      
      console.log(`  Bulunan: ${results.total} dosya`);
      
      if (results.total > 0) {
        results.items.slice(0, 3).forEach(item => {
          const size = Utils.formatFileSize(item.size || 0);
          const modified = Utils.timeAgo(item.lastModifiedDateTime);
          console.log(`    • ${item.name} (${size}, ${modified})`);
        });
      }
      
      console.log('');
      
    } catch (error) {
      Utils.error(`${fileType.name} araması başarısız: ${error.message}`);
    }
  }
}

// Eğer dosya doğrudan çalıştırılıyorsa örnekleri çalıştır
if (require.main === module) {
  (async () => {
    console.log('🚀 OneDrive Explorer - Örnek Uygulamalar\n');
    
    // Token kontrolü
    const api = new OneDriveAPI();
    if (!api.isTokenValid()) {
      Utils.warning('Access token süresi dolmuş olabilir!');
      console.log('');
    }
    
    try {
      await basicUsageExamples();
      console.log('\n' + '='.repeat(50) + '\n');
      
      await searchExamples();
      console.log('\n' + '='.repeat(50) + '\n');
      
      await fileTypeExamples();
      
      Utils.success('Tüm örnekler tamamlandı!');
      
    } catch (error) {
      Utils.error(`Ana hata: ${error.message}`);
      process.exit(1);
    }
  })();
}

module.exports = {
  basicUsageExamples,
  searchExamples,
  fileTypeExamples
}; 