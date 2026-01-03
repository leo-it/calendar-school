// Script para generar iconos PNG válidos para PWA
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const createIcon = async (size, outputPath) => {
  // Crear un ícono con fondo del color primario (#6366f1) y texto "A"
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#6366f1" rx="${size * 0.2}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${Math.floor(size * 0.5)}" 
            font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">A</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .png()
    .resize(size, size)
    .toFile(outputPath);
  
  console.log(`✅ Creado ${outputPath} (${size}x${size})`);
};

(async () => {
  try {
    const publicDir = path.join(__dirname, '../public');
    
    // Asegurar que el directorio public existe
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    await createIcon(192, path.join(publicDir, 'icon-192x192.png'));
    await createIcon(512, path.join(publicDir, 'icon-512x512.png'));
    
    console.log('\n✅ Iconos generados exitosamente');
    console.log('📱 Los iconos están listos para la PWA');
    console.log('💡 Nota: Estos son iconos básicos. Para producción, considera crear iconos personalizados con tu logo.');
  } catch (error) {
    console.error('❌ Error al generar iconos:', error);
    process.exit(1);
  }
})();
