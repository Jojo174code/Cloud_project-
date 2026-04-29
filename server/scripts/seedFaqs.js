const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const seedFaqs = [
  {
    question: 'When is rent due?',
    answer: 'Rent is due on the 1st of every month unless your signed lease states a different due date.',
    category: 'payments',
  },
  {
    question: 'How do I submit a maintenance request?',
    answer: 'Log in to LeasePilot, open the tenant dashboard, and click Submit New Request to report the issue.',
    category: 'maintenance',
  },
  {
    question: 'What counts as an emergency?',
    answer: 'Emergency issues include flooding, a gas smell, electrical sparks or smoke, sewage backup, or a broken exterior lock that affects safety or security.',
    category: 'emergency',
  },
  {
    question: 'What should I do if there is a water leak?',
    answer: 'Submit a maintenance request right away. If it is safe, shut off the water source, protect your belongings, and include photos in the request details.',
    category: 'maintenance',
  },
  {
    question: 'When is the office open?',
    answer: 'Office hours are Monday through Friday, 9 AM to 5 PM.',
    category: 'office',
  },
  {
    question: 'How can I contact management about an existing request?',
    answer: 'Open the maintenance request and use the request chat to message management directly from LeasePilot.',
    category: 'communication',
  },
  {
    question: 'How do managers review requests?',
    answer: 'Managers review AI-prioritized maintenance requests from the manager dashboard and can open each request thread for details and follow-up.',
    category: 'maintenance',
  },
  {
    question: 'How soon will maintenance respond?',
    answer: 'Emergency issues are prioritized immediately. Non-emergency requests are reviewed during normal business hours and scheduled by urgency.',
    category: 'maintenance',
  },
  {
    question: 'Can I use chat inside a maintenance request?',
    answer: 'Yes. Tenants can use the request chat to contact management and add updates after a maintenance request is created.',
    category: 'communication',
  },
];

async function upsertFaq(faq) {
  const existing = await prisma.faqEntry.findFirst({
    where: { question: faq.question },
  });

  if (existing) {
    await prisma.faqEntry.update({
      where: { id: existing.id },
      data: faq,
    });
    return 'updated';
  }

  await prisma.faqEntry.create({ data: faq });
  return 'created';
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const faq of seedFaqs) {
    const result = await upsertFaq(faq);
    if (result === 'created') {
      created += 1;
    } else {
      updated += 1;
    }
  }

  console.log(`Seeded FAQs: ${seedFaqs.length} total (${created} created, ${updated} updated).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
