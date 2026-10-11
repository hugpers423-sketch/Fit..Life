import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Crear usuario administrador
  const user = await prisma.user.create({
    data: {
      email: 'admin@nutriflow.com',
      name: 'Administrador NutriFlow',
    },
  })
  console.log(`✅ Usuario creado: ${user.email}`)

  // 2. Crear perfil del usuario
  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      birthDate: new Date('1990-01-15'),
      gender: 'Masculino',
      heightCm: 175,
      weightKg: 75,
      activityLevel: 'Moderado',
      goal: 'Mantener peso',
    },
  })
  console.log(`✅ Perfil creado: ${profile.id}`)

  // 3. Crear algunas comidas de prueba
  const meals = await prisma.meal.createMany({
    data: [
      {
        userId: user.id,
        type: 'Desayuno',
        scheduledAt: new Date(),
        calories: 450,
        proteinG: 20,
        carbsG: 50,
        fatG: 15,
        healthVerdict: 'Saludable',
        healthAnalysis: 'Buena opción balanceada',
      },
      {
        userId: user.id,
        type: 'Comida',
        scheduledAt: new Date(),
        calories: 700,
        proteinG: 40,
        carbsG: 80,
        fatG: 25,
        healthVerdict: 'Normal',
        healthAnalysis: 'Porción adecuada',
      },
      {
        userId: user.id,
        type: 'Cena',
        scheduledAt: new Date(),
        calories: 300,
        proteinG: 25,
        carbsG: 20,
        fatG: 10,
        healthVerdict: 'Saludable',
        healthAnalysis: 'Cena ligera',
      },
    ],
  })
  console.log(`✅ Comidas creadas: ${meals.count} registros`)

  console.log('\n🌱 Seed completado exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })