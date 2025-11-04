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
    update: {},
    create: {
      email: seedEmail,
      passwordHash,
      name: seedName,
    },
  });

  console.log(
    `Usuário seed criado/atualizado: ${user.email}. Senha padrão: ${seedPassword}`,
  );
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
