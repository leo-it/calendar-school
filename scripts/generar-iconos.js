// Script para generar iconos PNG válidos para PWA
const fs = require('fs');
const path = require('path');

// Crear un PNG simple pero válido (1x1 pixel rojo, luego escalado)
// Usaremos un PNG base64 válido de 192x192 y 512x512

// PNG 192x192 - Ícono simple con fondo azul y texto "A"
const createPNG = (size) => {
  // PNG header + IHDR + IDAT mínimo válido
  // Esto crea un PNG válido aunque sea simple
  const width = size;
  const height = size;
  
  // PNG signature
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // Para simplificar, vamos a crear un PNG usando un método más directo
  // Usaremos un PNG base64 válido de un cuadrado de color sólido
  
  // PNG de 192x192 con fondo #6366f1 (color primario de la app)
  // Este es un PNG válido pero simple
  const base64PNG = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
  
  // Para tamaños reales, necesitaríamos una librería como sharp o canvas
  // Por ahora, crearemos PNGs válidos pero simples
  
  return Buffer.from(base64PNG, 'base64');
};

// Intentar usar sharp si está disponible, sino crear PNGs simples
try {
  const sharp = require('sharp');
  
  const createIcon = async (size, outputPath) => {
    // Crear un ícono con fondo del color primario y texto
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="#6366f1"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" 
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
    await createIcon(192, path.join(__dirname, '../public/icon-192x192.png'));
    await createIcon(512, path.join(__dirname, '../public/icon-512x512.png'));
    console.log('\n✅ Iconos generados exitosamente');
    console.log('⚠️  Nota: Estos son iconos temporales. Para producción, crea iconos personalizados.');
  })();
  
} catch (e) {
  console.log('⚠️  Sharp no está instalado. Creando PNGs simples...');
  console.log('   Para iconos mejores, instala: npm install sharp');
  console.log('   O usa: https://realfavicongenerator.net/');
  
  // Crear PNGs simples pero válidos
  const icon192 = createPNG(192);
  const icon512 = createPNG(512);
  
  fs.writeFileSync(path.join(__dirname, '../public/icon-192x192.png'), icon192);
  fs.writeFileSync(path.join(__dirname, '../public/icon-512x512.png'), icon512);
  
  console.log('✅ Iconos placeholder creados (necesitas reemplazarlos con iconos reales)');
}

