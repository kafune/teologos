import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const seedEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@teologos.app';
  const seedPassword = process.env.SEED_ADMIN_PASSWORD ?? 'SenhaF0rte!';
  const seedName = process.env.SEED_ADMIN_NAME ?? 'Administrador';

  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: seedEmail },
    update: {
      role: 'ADMIN',
    },
    create: {
      email: seedEmail,
      passwordHash,
      name: seedName,
      role: 'ADMIN',
    },
  });

  console.log(
    `Usuário seed criado/atualizado: ${user.email}. Senha padrão: ${seedPassword}`,
  );

  const defaultAgents = [
    { id: 'agostinho', name: 'Santo Agostinho', tradition: 'Patrística' },
    { id: 'aquinas', name: 'Tomás de Aquino', tradition: 'Escolástica' },
    { id: 'calvino', name: 'João Calvino', tradition: 'Reforma' },
  ];

  for (const agent of defaultAgents) {
    await prisma.agent.upsert({
      where: { id: agent.id },
      update: {
        name: agent.name,
        tradition: agent.tradition,
      },
      create: agent,
    });
  }

  console.log('Agentes padrão garantidos no banco de dados.');
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
