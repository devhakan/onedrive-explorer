#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer').default;
const chalk = require('chalk');
const ora = require('ora');
const { table } = require('table');
const moment = require('moment');
const open = require('open');
const OneDriveAPI = require('./lib/onedrive-api');

// Moment.js Türkçe dil desteği
moment.locale('tr');

const api = new OneDriveAPI();

// CLI bilgileri
program
  .name('onedrive-explorer')
  .description('🚀 OneDrive Kurumsal Hesap Explorer - Şıkır şıkır dosya yönetimi!')
  .version('1.0.0');

/**
 * Kullanıcı bilgilerini göster
 */
program
  .command('profile')
  .alias('p')
  .description('👤 Kullanıcı profil bilgilerini göster')
  .action(async () => {
    const spinner = ora('Kullanıcı bilgileri getiriliyor...').start();
    
    try {
      const [userInfo, driveInfo] = await Promise.all([
        api.getUserInfo(),
        api.getDriveInfo()
      ]);
      
      spinner.succeed('✅ Bilgiler başarıyla alındı!');
      
      console.log('\n' + chalk.blue.bold('👤 KULLANICI BİLGİLERİ'));
      console.log(chalk.green(`📧 Email: ${userInfo.mail || userInfo.userPrincipalName}`));
      console.log(chalk.green(`👨‍💼 Ad Soyad: ${userInfo.displayName}`));
      console.log(chalk.green(`🏢 Şirket: ${userInfo.companyName || 'Belirtilmemiş'}`));
      console.log(chalk.green(`📱 Telefon: ${userInfo.mobilePhone || 'Belirtilmemiş'}`));
      
      console.log('\n' + chalk.blue.bold('💾 DRIVE BİLGİLERİ'));
      console.log(chalk.cyan(`📁 Drive Adı: ${driveInfo.name}`));
      console.log(chalk.cyan(`📊 Tip: ${driveInfo.driveType}`));
      console.log(chalk.cyan(`💽 Toplam Alan: ${OneDriveAPI.formatFileSize(driveInfo.quota?.total || 0)}`));
      console.log(chalk.cyan(`📦 Kullanılan Alan: ${OneDriveAPI.formatFileSize(driveInfo.quota?.used || 0)}`));
      console.log(chalk.cyan(`🆓 Boş Alan: ${OneDriveAPI.formatFileSize((driveInfo.quota?.total || 0) - (driveInfo.quota?.used || 0))}`));
      
    } catch (error) {
      spinner.fail('❌ Hata oluştu!');
      console.error(chalk.red(error.message));
    }
  });

/**
 * Dosya arama
 */
program
  .command('search <query>')
  .alias('s')
  .description('🔍 Dosyalarda arama yap')
  .option('-t, --type <type>', 'Dosya türü filtresi (pdf, docx, xlsx, vb.)')
  .option('-l, --limit <number>', 'Sonuç sayısı limiti', '50')
  .action(async (query, options) => {
    const spinner = ora(`"${query}" için arama yapılıyor...`).start();
    
    try {
      const results = await api.searchFiles(query, options.type, parseInt(options.limit));
      
      spinner.succeed(`✅ ${results.total} dosya bulundu!`);
      
      if (results.items.length === 0) {
        console.log(chalk.yellow('🤷‍♂️ Hiç dosya bulunamadı.'));
        return;
      }
      
      displayFileTable(results.items);
      
      // İnteraktif seçim menüsü
      await showFileMenu(results.items);
      
    } catch (error) {
      spinner.fail('❌ Arama başarısız!');
      console.error(chalk.red(error.message));
    }
  });

/**
 * Gelişmiş arama
 */
program
  .command('advanced-search')
  .alias('as')
  .description('🔎 Gelişmiş arama seçenekleri')
  .action(async () => {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'query',
          message: '🔍 Arama terimi:',
          validate: input => input.length > 0 || 'Arama terimi gerekli!'
        },
        {
          type: 'list',
          name: 'fileType',
          message: '📁 Dosya türü:',
          choices: [
            { name: 'Tümü', value: null },
            { name: '📄 PDF', value: 'pdf' },
            { name: '📝 Word (docx)', value: 'docx' },
            { name: '📊 Excel (xlsx)', value: 'xlsx' },
            { name: '📊 PowerPoint (pptx)', value: 'pptx' },
            { name: '🖼️ Resimler (jpg, png)', value: 'jpg' },
            { name: '🎬 Videolar (mp4)', value: 'mp4' },
            { name: '🗜️ Arşivler (zip)', value: 'zip' }
          ]
        },
        {
          type: 'input',
          name: 'modifiedAfter',
          message: '📅 Bu tarihten sonra değiştirilmiş (YYYY-MM-DD) [opsiyonel]:',
          validate: input => !input || moment(input, 'YYYY-MM-DD', true).isValid() || 'Geçerli tarih formatı: YYYY-MM-DD'
        },
        {
          type: 'number',
          name: 'limit',
          message: '🔢 Maksimum sonuç sayısı:',
          default: 50,
          validate: input => input > 0 || 'Pozitif sayı girin!'
        }
      ]);
      
      const spinner = ora('Gelişmiş arama yapılıyor...').start();
      
      const searchOptions = {
        query: answers.query,
        fileType: answers.fileType,
        modifiedAfter: answers.modifiedAfter || null,
        pageSize: answers.limit
      };
      
      const results = await api.advancedSearch(searchOptions);
      
      spinner.succeed(`✅ ${results.total} dosya bulundu!`);
      
      if (results.items.length === 0) {
        console.log(chalk.yellow('🤷‍♂️ Arama kriterlerinize uygun dosya bulunamadı.'));
        return;
      }
      
      displayFileTable(results.items);
      await showFileMenu(results.items);
      
    } catch (error) {
      console.error(chalk.red(`❌ Hata: ${error.message}`));
    }
  });

/**
 * Klasör içeriğini listele
 */
program
  .command('list [folderId]')
  .alias('ls')
  .description('📁 Klasör içeriğini listele (varsayılan: kök klasör)')
  .option('-l, --limit <number>', 'Sonuç sayısı limiti', '50')
  .action(async (folderId = 'root', options) => {
    const spinner = ora('Klasör içeriği getiriliyor...').start();
    
    try {
      const results = await api.listFolder(folderId, parseInt(options.limit));
      
      spinner.succeed(`✅ ${results.total} öğe listelendi!`);
      
      if (results.items.length === 0) {
        console.log(chalk.yellow('📂 Klasör boş.'));
        return;
      }
      
      displayFileTable(results.items);
      await showFileMenu(results.items);
      
    } catch (error) {
      spinner.fail('❌ Listeleme başarısız!');
      console.error(chalk.red(error.message));
    }
  });

/**
 * İnteraktif mod
 */
program
  .command('interactive')
  .alias('i')
  .description('🎮 İnteraktif mod - Menü tabanlı kullanım')
  .action(async () => {
    console.log(chalk.blue.bold('\n🚀 OneDrive Explorer - İnteraktif Mod\n'));
    
    while (true) {
      try {
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: '🎯 Ne yapmak istiyorsunuz?',
            choices: [
              { name: '🔍 Dosya Ara', value: 'search' },
              { name: '🔎 Gelişmiş Arama', value: 'advancedSearch' },
              { name: '📁 Klasör Listele', value: 'list' },
              { name: '👤 Profil Bilgileri', value: 'profile' },
              { name: '🚪 Çıkış', value: 'exit' }
            ]
          }
        ]);
        
        if (action === 'exit') {
          console.log(chalk.green('\n👋 Görüşürüz! OneDrive Explorer kapatılıyor...'));
          break;
        }
        
        await executeInteractiveAction(action);
        
      } catch (error) {
        console.error(chalk.red(`❌ Hata: ${error.message}`));
      }
    }
  });

/**
 * Dosya tablosunu görüntüle
 */
function displayFileTable(items) {
  const tableData = [
    [
      chalk.bold('📄 Dosya'),
      chalk.bold('📊 Boyut'),
      chalk.bold('📅 Değiştirilme'),
      chalk.bold('📁 Tür')
    ]
  ];
  
  items.forEach(item => {
    const icon = item.folder ? '📁' : OneDriveAPI.getFileIcon(item.name);
    const size = item.folder ? '-' : OneDriveAPI.formatFileSize(item.size || 0);
    const modified = moment(item.lastModifiedDateTime).fromNow();
    const type = item.folder ? 'Klasör' : OneDriveAPI.getFileType(item.name).toUpperCase();
    
    tableData.push([
      `${icon} ${item.name}`,
      size,
      modified,
      type
    ]);
  });
  
  console.log('\n' + table(tableData, {
    border: {
      topBody: '─',
      topJoin: '┬',
      topLeft: '┌',
      topRight: '┐',
      bottomBody: '─',
      bottomJoin: '┴',
      bottomLeft: '└',
      bottomRight: '┘',
      bodyLeft: '│',
      bodyRight: '│',
      bodyJoin: '│',
      joinBody: '─',
      joinLeft: '├',
      joinRight: '┤',
      joinJoin: '┼'
    }
  }));
}

/**
 * Dosya menüsünü göster
 */
async function showFileMenu(items) {
  if (items.length === 0) return;
  
  const { selectedFile } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedFile',
      message: '📝 Bir dosya seçin:',
      choices: [
        ...items.map((item, index) => ({
          name: `${item.folder ? '📁' : OneDriveAPI.getFileIcon(item.name)} ${item.name}`,
          value: index
        })),
        { name: '🔙 Geri', value: -1 }
      ]
    }
  ]);
  
  if (selectedFile === -1) return;
  
  const file = items[selectedFile];
  
  if (file.folder) {
    // Klasör seçildi, içeriğini listele
    const spinner = ora('Klasör içeriği getiriliyor...').start();
    try {
      const results = await api.listFolder(file.id);
      spinner.succeed('✅ Klasör içeriği alındı!');
      
      if (results.items.length > 0) {
        displayFileTable(results.items);
        await showFileMenu(results.items);
      } else {
        console.log(chalk.yellow('📂 Klasör boş.'));
      }
    } catch (error) {
      spinner.fail('❌ Klasör açılamadı!');
      console.error(chalk.red(error.message));
    }
  } else {
    // Dosya seçildi, işlem menüsünü göster
    await showFileActionMenu(file);
  }
}

/**
 * Dosya işlem menüsünü göster
 */
async function showFileActionMenu(file) {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: `📄 "${file.name}" için ne yapmak istiyorsunuz?`,
      choices: [
        { name: '📊 Dosya Bilgileri', value: 'info' },
        { name: '🔗 Görüntüleme Linki Oluştur', value: 'viewLink' },
        { name: '🎬 Önizleme Linki Oluştur (Herkes)', value: 'previewLink' },
        { name: '🔗 Paylaşım Linki Oluştur', value: 'shareLink' },
        { name: '⬇️ Dosyayı İndir', value: 'download' },
        { name: '👁️ Tarayıcıda Aç', value: 'preview' },
        { name: '🔙 Geri', value: 'back' }
      ]
    }
  ]);
  
  const spinner = ora();
  
  try {
    switch (action) {
      case 'info':
        spinner.start('Dosya bilgileri getiriliyor...');
        const fileInfo = await api.getFileInfo(file.id);
        spinner.succeed('✅ Dosya bilgileri alındı!');
        displayFileInfo(fileInfo);
        break;
        
      case 'viewLink':
        spinner.start('Görüntüleme linki oluşturuluyor...');
        const viewLink = await api.createViewLink(file.id);
        spinner.succeed('✅ Görüntüleme linki oluşturuldu!');
        console.log(chalk.green(`\n🔗 Görüntüleme Linki:\n${viewLink.link.webUrl}\n`));
        break;
        
      case 'previewLink':
        spinner.start('Önizleme linki oluşturuluyor...');
        try {
          const previewInfo = await api.getPreviewInfo(file.id);
          spinner.succeed('✅ Önizleme linki oluşturuldu!');
          
          console.log(chalk.green('\n🎬 ÖNİZLEME LİNKİ OLUŞTURULDU!'));
          console.log(chalk.cyan(`📄 Dosya: ${previewInfo.fileName}`));
          console.log(chalk.cyan(`📊 Boyut: ${OneDriveAPI.formatFileSize(previewInfo.fileSize)}`));
          console.log(chalk.cyan(`📁 Tür: ${previewInfo.fileType.toUpperCase()}`));
          
          if (previewInfo.embedUrl) {
            const linkTitle = previewInfo.linkType === 'anonymous' ? '🌐 Herkes İçin Önizleme Linki' : '🔗 Organizasyon İçi Link';
            console.log(chalk.green(`\n${linkTitle}:`));
            console.log(chalk.white(`${previewInfo.embedUrl}`));
          }
          
          if (previewInfo.previewUrl) {
            console.log(chalk.green(`\n🎬 Direkt Önizleme:`));
            console.log(chalk.white(`${previewInfo.previewUrl}`));
          }
          
          if (previewInfo.mimeType) {
            console.log(chalk.yellow(`\n📄 MIME Türü: ${previewInfo.mimeType}`));
            
            // Dosya türüne göre bilgi ver
            if (previewInfo.mimeType.includes('video')) {
              console.log(chalk.blue('🎬 Bu link video player ile açılacak'));
            } else if (previewInfo.mimeType.includes('pdf')) {
              console.log(chalk.blue('📄 Bu link PDF viewer ile açılacak'));
            } else if (previewInfo.mimeType.includes('word') || previewInfo.mimeType.includes('document')) {
              console.log(chalk.blue('📝 Bu link Office Online ile açılacak'));
            } else if (previewInfo.mimeType.includes('sheet') || previewInfo.mimeType.includes('excel')) {
              console.log(chalk.blue('📊 Bu link Excel Online ile açılacak'));
            } else if (previewInfo.mimeType.includes('presentation') || previewInfo.mimeType.includes('powerpoint')) {
              console.log(chalk.blue('📊 Bu link PowerPoint Online ile açılacak'));
            } else {
              console.log(chalk.blue('🌐 Bu link tarayıcıda açılacak'));
            }
          }
          
          if (previewInfo.linkType === 'anonymous') {
            console.log(chalk.yellow('\n⏰ Bu link geçici olup, yaklaşık 1 saat geçerlidir.'));
            console.log(chalk.yellow('🌐 Link herkes tarafından erişilebilir (anonymous).'));
          } else {
            console.log(chalk.yellow('\n🏢 Bu link sadece organizasyon üyeleri tarafından erişilebilir.'));
          }
          console.log('');
        } catch (linkError) {
          spinner.fail('❌ Önizleme linki oluşturulamadı!');
          console.log(chalk.red(`Hata: ${linkError.message}`));
          console.log(chalk.yellow('\n💡 Alternatif olarak normal görüntüleme linki deneyin.'));
        }
        break;
        
      case 'shareLink':
        const { permission } = await inquirer.prompt([
          {
            type: 'list',
            name: 'permission',
            message: '🔐 Paylaşım yetkisi:',
            choices: [
              { name: '👁️ Sadece Görüntüleme', value: 'read' },
              { name: '✏️ Düzenleme', value: 'write' }
            ]
          }
        ]);
        
        spinner.start('Paylaşım linki oluşturuluyor...');
        const shareLink = await api.createShareLink(file.id, permission);
        spinner.succeed('✅ Paylaşım linki oluşturuldu!');
        console.log(chalk.green(`\n🔗 Paylaşım Linki:\n${shareLink.link.webUrl}\n`));
        break;
        
      case 'download':
        spinner.start(`"${file.name}" indiriliyor...`);
        const filePath = await api.downloadFile(file.id, file.name);
        spinner.succeed('✅ Dosya başarıyla indirildi!');
        console.log(chalk.green(`\n📁 İndirilme Konumu: ${filePath}\n`));
        break;
        
      case 'preview':
        spinner.start('Önizleme linki alınıyor...');
        try {
          const previewData = await api.getFilePreview(file.id);
          spinner.succeed('✅ Önizleme hazır!');
          console.log(chalk.green('\n🌐 Tarayıcıda açılıyor...\n'));
          await open(previewData.getUrl);
        } catch (previewError) {
          spinner.warn('⚠️ Önizleme desteklenmiyor, görüntüleme linki oluşturuluyor...');
          const viewLink = await api.createViewLink(file.id);
          console.log(chalk.green('\n🌐 Tarayıcıda açılıyor...\n'));
          await open(viewLink.link.webUrl);
        }
        break;
        
      case 'back':
        return;
    }
    
    // İşlem sonrası tekrar menüyü göster
    if (action !== 'back') {
      const { continueAction } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAction',
          message: '🔄 Başka bir işlem yapmak istiyor musunuz?',
          default: false
        }
      ]);
      
      if (continueAction) {
        await showFileActionMenu(file);
      }
    }
    
  } catch (error) {
    spinner.fail('❌ İşlem başarısız!');
    console.error(chalk.red(error.message));
  }
}

/**
 * Dosya bilgilerini görüntüle
 */
function displayFileInfo(file) {
  console.log('\n' + chalk.blue.bold('📊 DOSYA BİLGİLERİ'));
  console.log(chalk.cyan(`📄 Ad: ${file.name}`));
  console.log(chalk.cyan(`📊 Boyut: ${OneDriveAPI.formatFileSize(file.size || 0)}`));
  console.log(chalk.cyan(`📅 Oluşturulma: ${moment(file.createdDateTime).format('DD.MM.YYYY HH:mm')}`));
  console.log(chalk.cyan(`📅 Değiştirilme: ${moment(file.lastModifiedDateTime).format('DD.MM.YYYY HH:mm')}`));
  console.log(chalk.cyan(`👤 Oluşturan: ${file.createdBy?.user?.displayName || 'Bilinmiyor'}`));
  console.log(chalk.cyan(`👤 Değiştiren: ${file.lastModifiedBy?.user?.displayName || 'Bilinmiyor'}`));
  console.log(chalk.cyan(`🔗 Web URL: ${file.webUrl}`));
  
  if (file.file?.mimeType) {
    console.log(chalk.cyan(`📄 MIME Türü: ${file.file.mimeType}`));
  }
  
  if (file.file?.hashes) {
    console.log(chalk.cyan(`🔐 SHA1 Hash: ${file.file.hashes.sha1Hash || 'Yok'}`));
  }
  
  console.log('');
}

/**
 * İnteraktif aksiyonları çalıştır
 */
async function executeInteractiveAction(action) {
  switch (action) {
    case 'search':
      const { query, fileType, limit } = await inquirer.prompt([
        {
          type: 'input',
          name: 'query',
          message: '🔍 Arama terimi:',
          validate: input => input.length > 0 || 'Arama terimi gerekli!'
        },
        {
          type: 'list',
          name: 'fileType',
          message: '📁 Dosya türü filtresi:',
          choices: [
            { name: 'Tümü', value: null },
            ...['pdf', 'docx', 'xlsx', 'pptx', 'jpg', 'mp4', 'zip'].map(type => ({
              name: type.toUpperCase(),
              value: type
            }))
          ]
        },
        {
          type: 'number',
          name: 'limit',
          message: '🔢 Maksimum sonuç:',
          default: 50
        }
      ]);
      
      const spinner = ora(`"${query}" için arama yapılıyor...`).start();
      try {
        const results = await api.searchFiles(query, fileType, limit);
        spinner.succeed(`✅ ${results.total} dosya bulundu!`);
        
        if (results.items.length > 0) {
          displayFileTable(results.items);
          await showFileMenu(results.items);
        } else {
          console.log(chalk.yellow('🤷‍♂️ Hiç dosya bulunamadı.'));
        }
      } catch (error) {
        spinner.fail('❌ Arama başarısız!');
        throw error;
      }
      break;
      
    case 'advancedSearch':
      // Gelişmiş arama komutunu çalıştır
      await program.parseAsync(['node', 'cli.js', 'advanced-search']);
      break;
      
    case 'list':
      const { folderId, listLimit } = await inquirer.prompt([
        {
          type: 'input',
          name: 'folderId',
          message: '📁 Klasör ID (boş bırakın = kök klasör):',
          default: 'root'
        },
        {
          type: 'number',
          name: 'listLimit',
          message: '🔢 Maksimum öğe sayısı:',
          default: 50
        }
      ]);
      
      const listSpinner = ora('Klasör içeriği getiriliyor...').start();
      try {
        const results = await api.listFolder(folderId === 'root' ? 'root' : folderId, listLimit);
        listSpinner.succeed(`✅ ${results.total} öğe listelendi!`);
        
        if (results.items.length > 0) {
          displayFileTable(results.items);
          await showFileMenu(results.items);
        } else {
          console.log(chalk.yellow('📂 Klasör boş.'));
        }
      } catch (error) {
        listSpinner.fail('❌ Listeleme başarısız!');
        throw error;
      }
      break;
      
    case 'profile':
      // Profil komutunu çalıştır
      await program.parseAsync(['node', 'cli.js', 'profile']);
      break;
  }
}

// Hata yakalama
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ Beklenmeyen hata:'), error.message);
  process.exit(1);
});

// Token geçerlilik kontrolü
if (!api.isTokenValid()) {
  console.log(chalk.yellow('⚠️ Uyarı: Access token süresi dolmuş olabilir. Yeni token almanız gerekebilir.'));
}

// Hoşgeldin mesajı
if (process.argv.length === 2) {
  console.log(chalk.blue.bold('\n🚀 OneDrive Explorer\'a Hoşgeldiniz!\n'));
  console.log(chalk.green('📖 Kullanım için: onedrive-explorer --help'));
  console.log(chalk.green('🎮 İnteraktif mod: onedrive-explorer interactive\n'));
}

// CLI'yi başlat
program.parse(); 