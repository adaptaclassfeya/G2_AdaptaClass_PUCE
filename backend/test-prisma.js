require('dotenv').config();
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

(async () => {
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('sslmode', 'require');
  console.log('Trying:', url.toString().replace(/:[^@]*@/, ':****@'));
  const adapter = new PrismaPg({ connectionString: url.toString() });
  const prisma = new PrismaClient({ adapter });
  try {
    await prisma.$connect();
    const u = await prisma.user.findFirst({ select: { id: true, email: true } });
    console.log('OK first user:', u);
  } catch (e) {
    console.error('FAIL', e.name, e.code, e.message?.slice(0,200));
  } finally {
    await prisma.$disconnect();
  }
})();
