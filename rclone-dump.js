#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const { exec } = require('child_process');

function question(prompt) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

function decodeJWT(token) {
    try {
        const payload = Buffer.from(token.split('.')[1], 'base64').toString();
        return JSON.parse(payload);
    } catch (error) {
        return null;
    }
}

function getRcloneConfig() {
    return new Promise((resolve, reject) => {
        // Doğrudan rclone config dump kullan (daha güncel token'ları alır)
        exec('rclone config dump', (error, stdout, stderr) => {
            if (error) {
                return reject(new Error(`'rclone config dump' komutu çalıştırılamadı. rclone kurulu ve PATH'te olmalı. Hata: ${stderr}`));
            }
            
            try {
                const config = JSON.parse(stdout);
                resolve(config);
            } catch (e) {
                reject(new Error(`Rclone config çıktısı ayrıştırılamadı: ${e.message}`));
            }
        });
    });
}


function findOneDriveSections(sections) {
    return Object.entries(sections)
        .filter(([, config]) => config.type === 'onedrive' && config.token && config.drive_id)
        .map(([name, config]) => ({ name, config }));
}

function refreshTokenAndRetry() {
    try {
        console.log('🔄 Rclone ile token yenileniyor...');
        const { execSync } = require('child_process');
        
        // Seçilen konfigürasyon ismini al (global değişkenden)
        const configName = global.selectedConfigName || 'sy-1';
        
        // Rclone about komutu ile token'ı yenile
        execSync(`rclone about ${configName}:`, { stdio: 'inherit' });
        console.log('✅ Token başarıyla yenilendi!');
        
        // Yeni token'ı al ve parse et
        const configOutput = execSync('rclone config dump', { encoding: 'utf8' });
        const config = JSON.parse(configOutput);
        
        if (config[configName] && config[configName].token) {
            const tokenData = JSON.parse(config[configName].token);
            const { access_token, refresh_token, expiry } = tokenData;
            
            const jwtPayload = decodeJWT(access_token);
            const clientId = jwtPayload?.appid;
            const tenantId = jwtPayload?.tid;
            
            console.log('🔄 Yenilenen token bilgileri kontrol ediliyor...');
            const now = new Date();
            const tokenExpiry = new Date(jwtPayload.exp * 1000);
            const timeUntilExpiry = tokenExpiry.getTime() - now.getTime();
            const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));
            
            console.log(`🕐 Yeni token süresi: ${minutesUntilExpiry} dakika`);
            
            return { accessToken: access_token, refreshToken: refresh_token, clientId, tenantId, expiry };
        } else {
            throw new Error(`Yenilenmiş token ${configName} konfigürasyonunda bulunamadı`);
        }
    } catch (error) {
        throw new Error(`Token yenileme başarısız: ${error.message}`);
    }
}

function parseTokenInfo(token) {
    try {
        // Token zaten obje ise JSON.parse yapmaya gerek yok
        let tokenData;
        if (typeof token === 'object' && token !== null) {
            tokenData = token;
        } else if (typeof token === 'string') {
            tokenData = JSON.parse(token);
        } else {
            throw new Error('Token geçersiz format');
        }

        const { access_token, refresh_token, expiry } = tokenData;
        if (!access_token || !refresh_token) throw new Error('Token verisinde access_token veya refresh_token eksik.');

        const jwtPayload = decodeJWT(access_token);
        const clientId = jwtPayload?.appid;
        const tenantId = jwtPayload?.tid;

        if (!clientId || !tenantId) {
            console.warn("⚠️ Uyarı: Access token içinden Client ID veya Tenant ID alınamadı.");
        }

        // Token süresini kontrol et
        const now = new Date();
        const tokenExpiry = new Date(jwtPayload.exp * 1000);
        const timeUntilExpiry = tokenExpiry.getTime() - now.getTime();
        const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));

        console.log(`🕐 Token süresi: ${minutesUntilExpiry} dakika sonra dolacak`);
        
        if (timeUntilExpiry <= 0) {
            console.warn("⚠️ Uyarı: Token süresi dolmuş! Otomatik yenileme yapılıyor...");
            return refreshTokenAndRetry();
        } else if (minutesUntilExpiry < 10) {
            console.warn("⚠️ Uyarı: Token 10 dakika içinde dolacak! Otomatik yenileme yapılıyor...");
            return refreshTokenAndRetry();
        }

        return { accessToken: access_token, refreshToken: refresh_token, clientId, tenantId, expiry };
    } catch (error) {
        throw new Error(`Token ayrıştırılamadı: ${error.message}`);
    }
}

function createEnvFile(envData) {
    const envContent = `# OneDrive Business hesap bilgileri (rclone config dump ile otomatik oluşturuldu)
# ACCESS_TOKEN ve REFRESH_TOKEN alanlarına SADECE JWT (noktalı, uzun string) yazılır.
ACCESS_TOKEN=${envData.accessToken}
REFRESH_TOKEN=${envData.refreshToken}
DRIVE_ID=${envData.driveId}
CLIENT_ID=${envData.clientId || 'token-icinde-bulunamadi'}
TENANT_ID=${envData.tenantId || 'token-icinde-bulunamadi'}
RCLONE_CONFIG_NAME=${envData.configName}

# Token bitiş tarihi: ${envData.expiry || 'Bilinmiyor'}
# Oluşturulma zamanı: ${new Date().toISOString()}
`;
    fs.writeFileSync('.env', envContent);
    console.log('✅ .env dosyası başarıyla oluşturuldu.');
}

async function main() {
    console.log("🚀 OneDrive Explorer Kurulumu (rclone config dump ile)");
    console.log('======================================================\n');

    try {
        console.log("🔍 'rclone config dump' ile konfigürasyonlar alınıyor...");
        const rcloneConfig = await getRcloneConfig();
        
        console.log('✅ rclone konfigürasyonu başarıyla yüklendi.');
        const oneDriveSections = findOneDriveSections(rcloneConfig);

        if (oneDriveSections.length === 0) {
            throw new Error("'rclone config dump' çıktısında geçerli bir OneDrive konfigürasyonu bulunamadı.");
        }

        let selectedSection;
        if (oneDriveSections.length === 1) {
            selectedSection = oneDriveSections[0];
            global.selectedConfigName = selectedSection.name; // Global değişkende sakla
            console.log(`✅ Sadece bir OneDrive konfigürasyonu bulundu: [${selectedSection.name}]`);
        } else {
            console.log('\n🔍 Birden fazla OneDrive konfigürasyonu bulundu. Lütfen birini seçin:');
            oneDriveSections.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));
            
            const choice = await question(`\nKullanmak istediğiniz konfigürasyonun numarasını girin (1-${oneDriveSections.length}): `);
            const index = parseInt(choice.trim()) - 1;
            
            if (index >= 0 && index < oneDriveSections.length) {
                selectedSection = oneDriveSections[index];
                global.selectedConfigName = selectedSection.name; // Global değişkende sakla
                console.log(`✅ Seçilen konfigürasyon: [${selectedSection.name}]`);
            } else {
                throw new Error('Geçersiz seçim. Kurulum iptal edildi.');
            }
        }

        console.log('🔍 Token bilgileri ayrıştırılıyor...');
        const tokenInfo = parseTokenInfo(selectedSection.config.token);
        
        console.log('✅ Token bilgileri başarıyla ayrıştırıldı.');
        console.log(`   - Client ID: ${tokenInfo.clientId || 'Bulunamadı'}`);
        console.log(`   - Tenant ID: ${tokenInfo.tenantId || 'Bulunamadı'}`);
        console.log(`   - Token bitiş tarihi: ${tokenInfo.expiry || 'Bilinmiyor'}`);

        const envData = { ...tokenInfo, driveId: selectedSection.config.drive_id, configName: selectedSection.name };

        if (fs.existsSync('.env')) {
            const backupPath = `.env.backup.${Date.now()}`;
            fs.copyFileSync('.env', backupPath);
            console.log(`📦 Mevcut .env dosyası yedeklendi: ${backupPath}`);
        }

        createEnvFile(envData);

        console.log('\n🎉 Kurulum tamamlandı!');
        console.log('Artık onedrive-explorer komutlarını kullanabilirsiniz.');
        console.log('\nÖrnek: node onedrive-explorer.js drive-info\n');

    } catch (error) {
        console.error(`\n❌ Kurulum sırasında bir hata oluştu: ${error.message}`);
        process.exit(1);
    }
}

main(); 