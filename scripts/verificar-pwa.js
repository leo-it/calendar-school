// Script para verificar que la PWA está correctamente configurada
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración PWA...\n');

// 1. Verificar manifest.json
const manifestPath = path.join(__dirname, '../public/manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('✅ manifest.json existe');
  console.log('   - Name:', manifest.name);
  console.log('   - Start URL:', manifest.start_url);
  console.log('   - Display:', manifest.display);
  console.log('   - Icons:', manifest.icons.length, 'iconos definidos');
} else {
  console.log('❌ manifest.json NO existe');
}

// 2. Verificar service worker
const swPath = path.join(__dirname, '../public/sw.js');
if (fs.existsSync(swPath)) {
  console.log('✅ sw.js existe');
} else {
  console.log('❌ sw.js NO existe');
}

// 3. Verificar iconos
const icon192 = path.join(__dirname, '../public/icon-192x192.png');
const icon512 = path.join(__dirname, '../public/icon-512x512.png');

const checkIcon = (iconPath, name) => {
  if (fs.existsSync(iconPath)) {
    const stats = fs.statSync(iconPath);
    const buffer = fs.readFileSync(iconPath);
    const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    
    if (isPNG) {
      console.log(`✅ ${name} existe y es PNG válido (${(stats.size / 1024).toFixed(2)} KB)`);
      return true;
    } else {
      console.log(`⚠️  ${name} existe pero NO es un PNG válido (es un placeholder)`);
      return false;
    }
  } else {
    console.log(`❌ ${name} NO existe`);
    return false;
  }
};

const icon192Valid = checkIcon(icon192, 'icon-192x192.png');
const icon512Valid = checkIcon(icon512, 'icon-512x512.png');

console.log('\n📋 Resumen:');
console.log('Para que la PWA sea instalable necesitas:');
console.log('  ✅ manifest.json válido');
console.log('  ✅ sw.js accesible');
console.log('  ✅ Iconos PNG válidos (192x192 y 512x512)');

if (!icon192Valid || !icon512Valid) {
  console.log('\n⚠️  PROBLEMA DETECTADO: Los iconos son placeholders');
  console.log('   Necesitas crear iconos reales para que la PWA sea instalable.');
  console.log('   Herramientas recomendadas:');
  console.log('   - https://github.com/onderceylan/pwa-asset-generator');
  console.log('   - https://realfavicongenerator.net/');
}

