import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdir, writeFile, access } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

const SAMPLES = [
  {
    url: "https://download.samplelib.com/mp4/sample-5s.mp4",
    file: "demo1.mp4",
    caption: "Petit aperçu de 5 secondes ✨ #demo",
  },
  {
    url: "https://download.samplelib.com/mp4/sample-10s.mp4",
    file: "demo2.mp4",
    caption: "Ambiance chill 🎬 #clip",
  },
  {
    url: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
    file: "demo3.mp4",
    caption: "Big Buck Bunny fait son apparition 🐰",
  },
  {
    url: "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4",
    file: "demo4.mp4",
    caption: "Méduses sous-marines 🪼 #nature",
  },
  {
    url: "https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4",
    file: "demo5.mp4",
    caption: "Extrait Sintel — open movie 🗡️",
  },
];

async function downloadIfNeeded(url: string, dest: string) {
  try {
    await access(dest);
    console.log(`  déjà présent: ${path.basename(dest)}`);
    return;
  } catch {
    // download
  }
  console.log(`  téléchargement: ${path.basename(dest)}...`);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ClipTokSeed/1.0)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Échec téléchargement ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`  OK (${(buf.length / 1024 / 1024).toFixed(1)} Mo)`);
}

async function main() {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  console.log("Téléchargement des vidéos démo...");
  for (const s of SAMPLES) {
    await downloadIfNeeded(s.url, path.join(uploadsDir, s.file));
  }

  const passwordHash = await bcrypt.hash("demo1234", 12);

  const demo = await prisma.user.upsert({
    where: { email: "demo@cliptok.local" },
    update: {},
    create: {
      email: "demo@cliptok.local",
      username: "demo",
      passwordHash,
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: "alice@cliptok.local" },
    update: {},
    create: {
      email: "alice@cliptok.local",
      username: "alice",
      passwordHash,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@cliptok.local" },
    update: {},
    create: {
      email: "bob@cliptok.local",
      username: "bob",
      passwordHash,
    },
  });

  await prisma.comment.deleteMany({});
  await prisma.like.deleteMany({});
  await prisma.video.deleteMany({});

  const authors = [demo, alice, bob, demo, alice];

  for (let i = 0; i < SAMPLES.length; i++) {
    const s = SAMPLES[i];
    await prisma.video.create({
      data: {
        caption: s.caption,
        videoUrl: `/uploads/${s.file}`,
        userId: authors[i].id,
      },
    });
  }

  const videos = await prisma.video.findMany();
  if (videos[0]) {
    await prisma.like.create({
      data: { userId: alice.id, videoId: videos[0].id },
    });
    await prisma.comment.create({
      data: {
        content: "Trop stylé ! 👏",
        userId: bob.id,
        videoId: videos[0].id,
      },
    });
  }
  if (videos[1]) {
    await prisma.like.create({
      data: { userId: bob.id, videoId: videos[1].id },
    });
    await prisma.like.create({
      data: { userId: demo.id, videoId: videos[1].id },
    });
    await prisma.comment.create({
      data: {
        content: "J'adore cette vidéo ❤️",
        userId: alice.id,
        videoId: videos[1].id,
      },
    });
  }

  console.log("\nSeed terminé !");
  console.log("Comptes démo (mot de passe: demo1234):");
  console.log("  - demo@cliptok.local / demo");
  console.log("  - alice@cliptok.local / alice");
  console.log("  - bob@cliptok.local / bob");
  console.log(`${SAMPLES.length} vidéos créées.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
