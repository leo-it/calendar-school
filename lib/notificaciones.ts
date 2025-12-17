import { prisma } from './prisma'

export async function enviarNotificaciones(claseId: string) {
  // Obtener todas las subscripciones a esta clase
  const subscriptions = await prisma.claseSubscription.findMany({
    where: { claseId },
    include: {
      user: true,
      clase: {
        include: {
          profesor: true,
        },
      },
    },
  })

  for (const sub of subscriptions) {
    const mensaje = `Nueva actualización en la clase "${sub.clase.titulo}" con ${sub.clase.profesor.name} el ${new Date(sub.clase.fecha).toLocaleDateString('es-ES')} a las ${sub.clase.horaInicio}`

    // Crear registro de notificación
    await prisma.notificacion.create({
      data: {
        userId: sub.userId,
        tipo: 'EMAIL', // Por defecto email, se puede cambiar según preferencias del usuario
        mensaje,
      },
    })

    // Aquí se integraría con servicios de email/WhatsApp
    // Por ejemplo:
    // await enviarEmail(sub.user.email, mensaje)
    // await enviarWhatsApp(sub.user.phone, mensaje)
  }
}

// Función para enviar email (requiere configuración SMTP)
export async function enviarEmail(email: string, mensaje: string) {
  // Implementar con nodemailer o similar
  console.log(`Enviando email a ${email}: ${mensaje}`)
}

// Función para enviar WhatsApp (requiere API de WhatsApp)
export async function enviarWhatsApp(phone: string, mensaje: string) {
  // Implementar con API de WhatsApp Business
  console.log(`Enviando WhatsApp a ${phone}: ${mensaje}`)
}



