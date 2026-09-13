import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_COUNTRY_PROVIDERS,
  SEED_PAYMENT_COUNTRIES,
} from "../src/lib/payments";

const prisma = new PrismaClient();

async function main() {
  for (const countryCode of SEED_PAYMENT_COUNTRIES) {
    const list = DEFAULT_COUNTRY_PROVIDERS[countryCode] || [];
    for (const item of list) {
      await prisma.paymentMethodConfig.upsert({
        where: {
          countryCode_provider: { countryCode, provider: item.provider },
        },
        create: {
          countryCode,
          provider: item.provider,
          currency: item.currency,
          enabled: true,
          metadata: JSON.stringify({ seeded: true, demo: true }),
        },
        update: { currency: item.currency, enabled: true },
      });
    }
  }
  console.log("payment configs:", await prisma.paymentMethodConfig.count());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
