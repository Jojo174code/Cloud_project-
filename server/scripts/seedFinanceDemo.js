const { PrismaClient, RentStatus, UserRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const buildDate = (year, monthIndex, day) => new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));

async function upsertUser({ full_name, email, role }) {
  const password_hash = await bcrypt.hash('Password123!', 10);
  return prisma.user.upsert({
    where: { email },
    update: { full_name, role, password_hash },
    create: { full_name, email, role, password_hash },
  });
}

async function main() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const previousMonth = month === 0 ? 11 : month - 1;
  const previousMonthYear = month === 0 ? year - 1 : year;

  const manager = await upsertUser({
    full_name: 'Maya Manager',
    email: 'manager@leasepilot.demo',
    role: UserRole.MANAGER,
  });

  const tenants = await Promise.all([
    upsertUser({ full_name: 'Avery Tenant', email: 'avery@leasepilot.demo', role: UserRole.TENANT }),
    upsertUser({ full_name: 'Jordan Tenant', email: 'jordan@leasepilot.demo', role: UserRole.TENANT }),
    upsertUser({ full_name: 'Riley Tenant', email: 'riley@leasepilot.demo', role: UserRole.TENANT }),
  ]);

  await prisma.rentPayment.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.property.deleteMany();

  const properties = await Promise.all([
    prisma.property.create({
      data: {
        name: 'North Star Flats',
        address: '101 Aurora Ave, Seattle, WA',
        monthly_rent: 2100,
      },
    }),
    prisma.property.create({
      data: {
        name: 'Harbor View Lofts',
        address: '88 Bay Street, Tacoma, WA',
        monthly_rent: 1750,
      },
    }),
  ]);

  const leases = await Promise.all([
    prisma.lease.create({
      data: {
        tenant_id: tenants[0].id,
        property_id: properties[0].id,
        rent_amount: 2100,
        due_day: 1,
        active: true,
      },
    }),
    prisma.lease.create({
      data: {
        tenant_id: tenants[1].id,
        property_id: properties[1].id,
        rent_amount: 1750,
        due_day: 5,
        active: true,
      },
    }),
    prisma.lease.create({
      data: {
        tenant_id: tenants[2].id,
        property_id: properties[0].id,
        rent_amount: 1950,
        due_day: 3,
        active: true,
      },
    }),
  ]);

  await prisma.rentPayment.createMany({
    data: [
      {
        lease_id: leases[0].id,
        amount: 2100,
        due_date: buildDate(year, month, 1),
        paid_date: buildDate(year, month, 2),
        status: RentStatus.PAID,
        method: 'Bank Transfer',
        note: 'Paid in full for current month.',
      },
      {
        lease_id: leases[0].id,
        amount: 2100,
        due_date: buildDate(previousMonthYear, previousMonth, 1),
        paid_date: buildDate(previousMonthYear, previousMonth, 1),
        status: RentStatus.PAID,
        method: 'ACH',
        note: 'Previous month settled on time.',
      },
      {
        lease_id: leases[1].id,
        amount: 1750,
        due_date: buildDate(year, month, 5),
        paid_date: null,
        status: RentStatus.PENDING,
        method: 'Manual Check',
        note: 'Tenant says payment is in progress.',
      },
      {
        lease_id: leases[1].id,
        amount: 1750,
        due_date: buildDate(previousMonthYear, previousMonth, 5),
        paid_date: null,
        status: RentStatus.LATE,
        method: 'Manual Check',
        note: 'Still outstanding from previous month.',
      },
      {
        lease_id: leases[2].id,
        amount: 900,
        due_date: buildDate(year, month, 3),
        paid_date: buildDate(year, month, 8),
        status: RentStatus.PARTIAL,
        method: 'Cash',
        note: 'Partial payment received, remainder pending.',
      },
    ],
  });

  console.log('Finance demo data seeded successfully.');
  console.log(`Manager login: ${manager.email} / Password123!`);
  console.log('Tenant logins: avery@leasepilot.demo, jordan@leasepilot.demo, riley@leasepilot.demo / Password123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
