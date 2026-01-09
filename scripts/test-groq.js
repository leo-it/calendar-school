// Script para probar la conexión con Groq
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente
let API_KEY = process.env.GROQ_API_KEY;

if (!API_KEY) {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      for (const line of envLines) {
        const match = line.match(/^GROQ_API_KEY=(.+)$/);
        if (match) {
          API_KEY = match[1].trim().replace(/^["']|["']$/g, '');
          break;
        }
      }
    }
  } catch (e) {
    console.error('No se pudo leer .env.local:', e.message);
  }
}

if (!API_KEY) {
  console.error('❌ GROQ_API_KEY no está configurada');
  console.log('\n💡 Para obtener una API key gratis:');
  console.log('   1. Ve a https://console.groq.com');
  console.log('   2. Inicia sesión');
  console.log('   3. Crea una API key');
  console.log('   4. Agrega GROQ_API_KEY=tu_key_aqui a .env.local');
  process.exit(1);
}

console.log('🔑 API Key encontrada (longitud:', API_KEY.length, ')');
console.log('🌐 Probando conexión con Groq...\n');

const groq = new Groq({
  apiKey: API_KEY,
});

async function testGroq() {
  try {
    console.log('📤 Enviando mensaje de prueba...');
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente útil. Responde brevemente.',
        },
        {
          role: 'user',
          content: 'Hola, ¿puedes responder?',
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (response) {
      console.log('✅ ¡Conexión exitosa con Groq!');
      console.log('📥 Respuesta:', response);
      console.log('\n🎉 Todo funciona correctamente. Puedes usar el chatbot ahora.');
    } else {
      console.error('❌ No se recibió respuesta');
      console.log('Respuesta completa:', JSON.stringify(completion, null, 2));
    }
  } catch (error) {
    console.error('❌ Error al conectar con Groq:');
    console.error('Mensaje:', error.message);
    console.error('Status:', error.status || error.statusCode);
    
    if (error.status === 401 || error.message?.includes('API key')) {
      console.log('\n💡 La API key parece ser inválida.');
      console.log('   Verifica que:');
      console.log('   1. La API key esté correctamente copiada');
      console.log('   2. No tenga espacios extra');
      console.log('   3. Esté en .env.local como GROQ_API_KEY=tu_key');
    } else if (error.status === 429) {
      console.log('\n💡 Has alcanzado el límite de uso.');
      console.log('   Espera un momento y vuelve a intentar.');
    } else {
      console.error('\n💡 Error completo:', error);
    }
    process.exit(1);
  }
}

testGroq();

