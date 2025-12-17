import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Crear escuelas de ejemplo
  // Nota: Los nombres deben coincidir con los slugs en la URL (duotricks, lacentral)
  const escuela1 = await prisma.escuela.upsert({
    where: { id: 'escuela-1' },
    update: {
      nombre: 'Duo Tricks',
      direccion: 'Av. Principal 123',
      telefono: '+5491112345678',
      email: 'info@duotricks.com',
      activa: true,
    },
    create: {
      id: 'escuela-1',
      nombre: 'Duo Tricks',
      direccion: 'Av. Principal 123',
      telefono: '+5491112345678',
      email: 'info@duotricks.com',
      activa: true,
    },
  })

  const escuela2 = await prisma.escuela.upsert({
    where: { id: 'escuela-2' },
    update: {
      nombre: 'La Central',
      direccion: 'Calle Secundaria 456',
      telefono: '+5491198765432',
      email: 'contacto@lacentral.com',
      activa: true,
    },
    create: {
      id: 'escuela-2',
      nombre: 'La Central',
      direccion: 'Calle Secundaria 456',
      telefono: '+5491198765432',
      email: 'contacto@lacentral.com',
      activa: true,
    },
  })

  // Crear usuarios de ejemplo
  const hashedPasswordAdmin = await bcrypt.hash('password123', 10)
  const hashedPasswordUser = await bcrypt.hash('123456', 10)
  const hashedPasswordProfesor = await bcrypt.hash('profesor123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@almanaque.com' },
    update: {},
    create: {
      email: 'admin@almanaque.com',
      name: 'Administrador',
      password: hashedPasswordAdmin,
      role: 'ADMIN',
      emailVerified: true,
    },
  })

  const usuario = await prisma.user.upsert({
    where: { email: 'lsainzveron@gmail.com' },
    update: {
      role: 'ADMIN', // Actualizar a ADMIN para poder crear clases
    },
    create: {
      email: 'lsainzveron@gmail.com',
      name: 'Usuario Test',
      password: hashedPasswordUser,
      role: 'ADMIN',
      emailVerified: true,
    },
  })

  // Crear usuario profesor
  const profesorUser = await prisma.user.upsert({
    where: { email: 'maria@danza.com' },
    update: {},
    create: {
      email: 'maria@danza.com',
      name: 'María González',
      password: hashedPasswordProfesor,
      role: 'PROFESOR',
      emailVerified: true,
      escuelaId: escuela1.id,
    },
  })

  const profesor1 = await prisma.profesor.upsert({
    where: { email: 'maria@danza.com' },
    update: {},
    create: {
      name: 'María González',
      email: 'maria@danza.com',
      phone: '+5491112345678',
      bio: 'Profesora de danza contemporánea con 10 años de experiencia',
    },
  })

  const profesor2 = await prisma.profesor.upsert({
    where: { email: 'juan@danza.com' },
    update: {},
    create: {
      name: 'Juan Pérez',
      email: 'juan@danza.com',
      phone: '+5491198765432',
      bio: 'Instructor de hip hop y danza urbana',
    },
  })

  // Crear clases de ejemplo (recurrentes semanales)
  // diaSemana: 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado
  const clases = [
    {
      titulo: 'Danza Contemporánea - Principiantes',
      descripcion: 'Clase introductoria a la danza contemporánea',
      diaSemana: 1, // Lunes
      horaInicio: '18:00',
      horaFin: '19:30',
      nivel: 'PRINCIPIANTE' as const,
      estilo: 'CONTEMPORANEO' as const,
      lugar: 'Duo Tricks',
      capacidad: 20,
      profesorId: profesor1.id,
      escuelaId: escuela1.id,
    },
    {
      titulo: 'Hip Hop - Intermedio',
      descripcion: 'Clase de hip hop para nivel intermedio',
      diaSemana: 3, // Miércoles
      horaInicio: '19:00',
      horaFin: '20:30',
      nivel: 'INTERMEDIO' as const,
      estilo: 'HIP_HOP' as const,
      lugar: 'La Central',
      capacidad: 15,
      profesorId: profesor2.id,
      escuelaId: escuela2.id,
    },
    {
      titulo: 'Jazz - Avanzado',
      descripcion: 'Clase de jazz para bailarines avanzados',
      diaSemana: 5, // Viernes
      horaInicio: '20:00',
      horaFin: '21:30',
      nivel: 'AVANZADO' as const,
      estilo: 'JAZZ' as const,
      lugar: 'Duo Tricks',
      capacidad: 12,
      profesorId: profesor1.id,
      escuelaId: escuela1.id,
    },
  ]

  // Eliminar clases existentes para evitar duplicados
  await prisma.clase.deleteMany({})

  // Crear nuevas clases
  for (const clase of clases) {
    await prisma.clase.create({
      data: clase,
    })
  }

  console.log('Seed completado!')
  console.log('Escuelas creadas:')
  console.log(`  - ${escuela1.nombre}`)
  console.log(`  - ${escuela2.nombre}`)
  console.log('Usuarios creados:')
  console.log('  - admin@almanaque.com / password123 (ADMIN)')
  console.log('  - lsainzveron@gmail.com / 123456 (ADMIN)')
  console.log('  - maria@danza.com / profesor123 (PROFESOR)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

