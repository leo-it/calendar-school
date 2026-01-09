// Script para probar la conectividad con la API de Gemini
const https = require('https');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente
let API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    for (const line of envLines) {
      const match = line.match(/^GEMINI_API_KEY=(.+)$/);
      if (match) {
        API_KEY = match[1].trim().replace(/^["']|["']$/g, '');
        break;
      }
    }
  } catch (e) {
    console.error('No se pudo leer .env.local');
  }
}

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY no está configurada');
  process.exit(1);
}

console.log('🔑 API Key encontrada (longitud:', API_KEY.length, ')');
console.log('🌐 Probando conectividad con la API de Gemini...\n');

const options = {
  hostname: 'generativelanguage.googleapis.com',
  port: 443,
  path: `/v1beta/models?key=${API_KEY}`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
};

const req = https.request(options, (res) => {
  console.log('📡 Estado de respuesta:', res.statusCode);
  console.log('📋 Headers:', res.headers);

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ ¡Conexión exitosa!');
      try {
        const json = JSON.parse(data);
        console.log('📦 Modelos encontrados:', json.models?.length || 0);
        if (json.models && json.models.length > 0) {
          console.log('🔍 Primeros 5 modelos:');
          json.models.slice(0, 5).forEach((m, i) => {
            console.log(`   ${i + 1}. ${m.name}`);
          });
        }
      } catch (e) {
        console.log('📄 Respuesta (primeros 500 chars):', data.substring(0, 500));
      }
    } else {
      console.log('⚠️  Respuesta con error:', res.statusCode);
      console.log('📄 Respuesta:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error de conexión:', error.message);
  console.error('🔍 Detalles:', error);
  
  if (error.code === 'ECONNREFUSED') {
    console.log('\n💡 Sugerencia: El servidor rechazó la conexión. Verifica firewall/proxy.');
  } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
    console.log('\n💡 Sugerencia: Timeout. Verifica tu conexión a internet.');
  } else if (error.code === 'ENOTFOUND') {
    console.log('\n💡 Sugerencia: No se puede resolver el DNS. Verifica tu conexión a internet.');
  } else if (error.message.includes('Socket is not connected')) {
    console.log('\n💡 Sugerencia: Problema de red durante el handshake TLS.');
    console.log('   Esto puede ser causado por:');
    console.log('   - Firewall bloqueando conexiones SSL');
    console.log('   - VPN interfiriendo con la conexión');
    console.log('   - Proxy no configurado correctamente');
  }
});

req.on('timeout', () => {
  console.error('⏱️  Timeout: La conexión tardó más de 10 segundos');
  req.destroy();
});

req.end();

