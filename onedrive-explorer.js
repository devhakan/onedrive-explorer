#!/usr/bin/env node

// .env dosyasını yükle
require('dotenv').config();

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const { table } = require('table');
const moment = require('moment');
const open = require('open');
const OneDriveAPI = require('./lib/onedrive-api');
const Utils = require('./lib/utils');

// Moment.js Türkçe dil desteği
moment.locale('tr');

const api = new OneDriveAPI();

// CLI bilgileri
program
  .name('onedrive-explorer')
  .description('🚀 OneDrive Kurumsal Hesap Explorer - Dosya arama, listeleme ve indirme!')
  .version('1.0.0');

/**
 * Drive bilgilerini göster (hesap teyiti için)
 */
program
  .command('drive-info')
  .alias('di')
  .description('💾 Drive bilgilerini göster (hesap teyiti)')
  .action(async () => {
    const spinner = ora('Alan bilgileri getiriliyor...').start();
    try {
      const driveInfo = await api.getDriveInfo();
      const email = api.getEmailFromToken();
      const configName = api.getEmailFromRcloneConfig();
      spinner.succeed('✅ Bilgiler alındı!');
      console.log('\n' + chalk.blue.bold('💾 DRIVE BİLGİLERİ'));
      console.log(chalk.cyan(`📧 Hesap: ${email}`));
      console.log(chalk.cyan(`🔧 Config: ${configName}`));
      console.log(chalk.cyan(`💽 Toplam Alan: ${Utils.formatFileSize(driveInfo.total)}`));
      console.log(chalk.cyan(`📦 Kullanılan Alan: ${Utils.formatFileSize(driveInfo.used)}`));
      console.log(chalk.cyan(`🆓 Boş Alan: ${Utils.formatFileSize(driveInfo.remaining)}`));
      console.log(chalk.green('\n✅ Doğru hesaba bağlanmış görünüyorsunuz!'));
    } catch (error) {
      spinner.fail('❌ Hata oluştu!');
      console.error(chalk.red(error.message));
      console.log(chalk.yellow('\n💡 Token\'ınızın geçerli olduğundan emin olun.'));
    }
  });

/**
 * Dosya arama
 */
program
  .command('search <query>')
  .alias('s')
  .description('🔍 Dosya ve klasör adında arama yap (maksimum 10 sonuç)')
  .option('-q, --quiet', 'Sadece sonuçları göster, interaktif menü gösterme')
  .action(async (query, options) => {
    const spinner = ora(`"${query}" için arama yapılıyor...`).start();
    try {
      const results = await api.searchFiles(query, null, 10);
      spinner.succeed(`✅ ${results.total} sonuç bulundu!`);
      if (results.items.length === 0) {
        console.log(chalk.yellow('🤷‍♂️ Hiç dosya veya klasör bulunamadı.'));
        return;
      }
      displayFileTable(results.items);
      
      // Quiet mode ise interaktif menü gösterme
      if (!options.quiet) {
        await showFileMenu(results.items, [], true);
      }
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
            { name: '⬅️ GERİ', value: 'back' },
            { name: 'Tümü', value: null },
            { name: '📁 Klasörler', value: 'folder' },
            { name: '🗜️ Arşivler (.tar, .tar.gz, .zip, .rar)', value: 'archive' },
            { name: '📄 PDF', value: 'pdf' },
            { name: '📝 Word (docx)', value: 'docx' },
            { name: '📊 Excel (xlsx)', value: 'xlsx' },
            { name: '📊 PowerPoint (pptx)', value: 'pptx' },
            { name: '🖼️ Resimler (jpg, png)', value: 'jpg' },
            { name: '🎬 Videolar (mp4)', value: 'mp4' }
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
              { name: '💾 Drive Bilgileri', value: 'driveInfo' },
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
    const icon = item.folder ? '📁' : Utils.getFileIcon(item.name);
    const size = item.folder ? '-' : Utils.formatFileSize(item.size || 0);
    const modified = moment(item.lastModifiedDateTime).fromNow();
    const type = item.folder ? 'Klasör' : Utils.getFileCategory(item.name).toUpperCase();
    
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
 * Dosya menüsünü göster (klasör geçmişi ile)
 */
async function showFileMenu(items, history = [], isSearchResult = false) {
  if (items.length === 0) return;
  
  // Dosya seçenekleri
  let choices = [
    ...items.map((item, index) => ({
      name: `${item.folder ? '📁' : Utils.getFileIcon(item.name)} ${item.name}`,
      value: index
    }))
  ];
  
  // Geçmiş varsa "GERİ" seçeneği, arama sonucuysa "Ana Menüye Dön" seçeneği
  if (history.length > 0) {
    choices = [
      { name: '⬅️ GERİ', value: 'back' },
      ...choices
    ];
  } else if (isSearchResult) {
    choices = [
      { name: '🏠 Ana Menüye Dön', value: 'main-menu' },
      ...choices
    ];
  }
  
  const { selectedFile } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedFile',
      message: '📝 Bir dosya seçin:',
      choices: choices
    }
  ]);
  
  if (selectedFile === 'back') {
    // Önceki klasöre geri dön
    const previousFolder = history.pop();
    if (previousFolder) {
      const spinner = ora('Önceki klasöre dönülüyor...').start();
      try {
        const results = await api.listFolder(previousFolder.id);
        spinner.succeed('✅ Önceki klasöre dönüldü!');
        
        if (results.items.length > 0) {
          displayFileTable(results.items);
          await showFileMenu(results.items, history);
        } else {
          console.log(chalk.yellow('📂 Klasör boş.'));
        }
      } catch (error) {
        spinner.fail('❌ Önceki klasöre dönülemedi!');
        console.error(chalk.red(error.message));
      }
    }
    return;
  }
  
  if (selectedFile === 'main-menu') {
    // Ana menüye dön
    console.log(chalk.green('🏠 Ana menüye dönülüyor...'));
    return 'main-menu';
  }
  
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
        // Geçmişe mevcut klasörü ekle
        const newHistory = [...history, { id: file.id, name: file.name }];
        await showFileMenu(results.items, newHistory);
      } else {
        console.log(chalk.yellow('📂 Klasör boş.'));
        // Boş klasörde de geçmişi koru
        const newHistory = [...history, { id: file.id, name: file.name }];
        await showFileMenu(results.items, newHistory);
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
        { name: '⬅️ GERİ', value: 'back' },
        { name: '📊 Dosya Bilgileri', value: 'info' },
        { name: '🔗 Görüntüleme Linki Oluştur', value: 'viewLink' },
        { name: '🔗 Paylaşım Linki Oluştur', value: 'shareLink' },
        { name: '⬇️ Dosyayı İndir', value: 'download' },
        { name: '👁️ Tarayıcıda Aç', value: 'preview' }
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
        
      case 'shareLink':
        const { permission } = await inquirer.prompt([
          {
            type: 'list',
            name: 'permission',
            message: '🔐 Paylaşım yetkisi:',
            choices: [
              { name: '⬅️ GERİ', value: 'back' },
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
  console.log(chalk.cyan(`📊 Boyut: ${Utils.formatFileSize(file.size || 0)}`));
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
      const searchPrompt = await inquirer.prompt([
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
            { name: '⬅️ GERİ', value: 'back' },
            { name: 'Tümü', value: null },
            { name: '📁 Klasörler', value: 'folder' },
            { name: '🗜️ Arşivler (.tar, .tar.gz, .zip, .rar)', value: 'archive' },
            { name: '📄 PDF', value: 'pdf' },
            { name: '📝 Word (docx)', value: 'docx' },
            { name: '📊 Excel (xlsx)', value: 'xlsx' },
            { name: '📊 PowerPoint (pptx)', value: 'pptx' },
            { name: '🖼️ Resimler (jpg, png)', value: 'jpg' },
            { name: '🎬 Videolar (mp4)', value: 'mp4' }
          ]
        },
        {
          type: 'number',
          name: 'limit',
          message: '🔢 Maksimum sonuç:',
          default: 50
        }
      ]);
      
      if (searchPrompt.fileType === 'back') {
        return; // Ana menüye geri dön
      }
      
      const spinner = ora(`"${searchPrompt.query}" için arama yapılıyor...`).start();
      try {
        const results = await api.searchFiles(searchPrompt.query, searchPrompt.fileType, searchPrompt.limit);
        spinner.succeed(`✅ ${results.total} dosya bulundu!`);
        
        if (results.items.length > 0) {
          displayFileTable(results.items);
          const menuResult = await showFileMenu(results.items, [], true);
          if (menuResult === 'main-menu') {
            return; // Ana menüye dön
          }
        } else {
          console.log(chalk.yellow('🤷‍♂️ Hiç dosya bulunamadı.'));
        }
      } catch (error) {
        spinner.fail('❌ Arama başarısız!');
        throw error;
      }
      break;
      
    case 'advancedSearch':
      const advancedPrompt = await inquirer.prompt([
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
            { name: '⬅️ GERİ', value: 'back' },
            { name: 'Tümü', value: null },
            { name: '📁 Klasörler', value: 'folder' },
            { name: '🗜️ Arşivler (.tar, .tar.gz, .zip, .rar)', value: 'archive' },
            { name: '📄 PDF', value: 'pdf' },
            { name: '📝 Word (docx)', value: 'docx' },
            { name: '📊 Excel (xlsx)', value: 'xlsx' },
            { name: '📊 PowerPoint (pptx)', value: 'pptx' },
            { name: '🖼️ Resimler (jpg, png)', value: 'jpg' },
            { name: '🎬 Videolar (mp4)', value: 'mp4' }
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
      
      if (advancedPrompt.fileType === 'back') {
        return; // Ana menüye geri dön
      }
      
      const advancedSpinner = ora('Gelişmiş arama yapılıyor...').start();
      try {
        const searchOptions = {
          query: advancedPrompt.query,
          fileType: advancedPrompt.fileType,
          modifiedAfter: advancedPrompt.modifiedAfter || null,
          pageSize: advancedPrompt.limit
        };
        
        const results = await api.advancedSearch(searchOptions);
        advancedSpinner.succeed(`✅ ${results.total} dosya bulundu!`);
        
        if (results.items.length > 0) {
          displayFileTable(results.items);
          const menuResult = await showFileMenu(results.items, [], true);
          if (menuResult === 'main-menu') {
            return; // Ana menüye dön
          }
        } else {
          console.log(chalk.yellow('🤷‍♂️ Arama kriterlerinize uygun dosya bulunamadı.'));
        }
      } catch (error) {
        advancedSpinner.fail('❌ Arama başarısız!');
        throw error;
      }
      break;
      
    case 'list':
      const listPrompt = await inquirer.prompt([
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
        },
        {
          type: 'confirm',
          name: 'continue',
          message: '📂 Klasörü listele?',
          default: true
        }
      ]);
      
      if (!listPrompt.continue) {
        return; // Ana menüye geri dön
      }
      
      const listSpinner = ora('Klasör içeriği getiriliyor...').start();
      try {
        const results = await api.listFolder(listPrompt.folderId === 'root' ? 'root' : listPrompt.folderId, listPrompt.listLimit);
        listSpinner.succeed(`✅ ${results.total} öğe listelendi!`);
        
        if (results.items.length > 0) {
          displayFileTable(results.items);
          await showFileMenu(results.items, []);
        } else {
          console.log(chalk.yellow('📂 Klasör boş.'));
        }
      } catch (error) {
        listSpinner.fail('❌ Listeleme başarısız!');
        throw error;
      }
      break;
      
    case 'driveInfo':
      const driveSpinner = ora('Alan bilgileri getiriliyor...').start();
      try {
        const driveInfo = await api.getDriveInfo();
        const email = api.getEmailFromToken();
        const configName = api.getEmailFromRcloneConfig();
        driveSpinner.succeed('✅ Bilgiler alındı!');
        console.log('\n' + chalk.blue.bold('💾 DRIVE BİLGİLERİ'));
        console.log(chalk.cyan(`📧 Hesap: ${email}`));
        console.log(chalk.cyan(`🔧 Config: ${configName}`));
        console.log(chalk.cyan(`💽 Toplam Alan: ${Utils.formatFileSize(driveInfo.total)}`));
        console.log(chalk.cyan(`📦 Kullanılan Alan: ${Utils.formatFileSize(driveInfo.used)}`));
        console.log(chalk.cyan(`🆓 Boş Alan: ${Utils.formatFileSize(driveInfo.remaining)}`));
        console.log(chalk.green('\n✅ Doğru hesaba bağlanmış görünüyorsunuz!'));
      } catch (error) {
        driveSpinner.fail('❌ Hata oluştu!');
        console.error(chalk.red(error.message));
      }
      break;
  }
}

// Hata yakalama
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ Beklenmeyen hata:'), error.message);
  process.exit(1);
});

// Token kontrol kaldırıldı - otomatik refresh token ile hallediliyor
// Hoşgeldin mesajı
if (process.argv.length === 2) {
  console.log(chalk.blue.bold('\n🚀 OneDrive Explorer\'a Hoşgeldiniz!\n'));
  console.log(chalk.green('📖 Kullanım için: onedrive-explorer --help'));
  console.log(chalk.green('🎮 İnteraktif mod: onedrive-explorer interactive\n'));
}

// CLI'yi başlat
program.parse(); 