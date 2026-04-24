const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const seedFaqs = [
  {
    question: 'When is rent due?',
    answer: 'Rent is due on the first day of each month unless your lease says otherwise.',
    category: 'payments',
  },
  {
    question: 'How do I submit a maintenance request?',
    answer: 'Log in to LeasePilot, open your tenant dashboard, and use Submit New Request.',
    category: 'maintenance',
  },
  {
    question: 'What should I do if there is a water leak?',
    answer: 'Submit a maintenance request immediately. If the leak is active, shut off the water source if safe to do so and include photos if possible.',
    category: 'maintenance',
  },
  {
    question: 'What counts as an emergency maintenance issue?',
    answer: 'Gas smells, smoke, sparks, flooding, major leaks, sewage backups, or security issues like broken locks should be reported immediately.',
    category: 'emergency',
  },
  {
    question: 'How soon will maintenance respond?',
    answer: 'Emergency issues are prioritized immediately. Non-emergency requests are reviewed during normal maintenance scheduling.',
    category: 'maintenance',
  },
];

async function main() {
  for (const faq of seedFaqs) {
    const existing = await prisma.faqEntry.findFirst({
      where: { question: faq.question },
    });

    if (existing) {
      await prisma.faqEntry.update({
        where: { id: existing.id },
        data: faq,
      });
    } else {
      await prisma.faqEntry.create({ data: faq });
    }
  }

  console.log(`Seeded ${seedFaqs.length} FAQ entries.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
