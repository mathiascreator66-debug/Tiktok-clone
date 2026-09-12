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

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function main() {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const storiesDir = path.join(uploadsDir, "stories");
  await mkdir(uploadsDir, { recursive: true });
  await mkdir(storiesDir, { recursive: true });

  console.log("Téléchargement des vidéos démo...");
  for (const s of SAMPLES) {
    await downloadIfNeeded(s.url, path.join(uploadsDir, s.file));
  }

  console.log("Téléchargement des stories démo...");
  await downloadIfNeeded(
    "https://picsum.photos/seed/cliptok1/720/1280.jpg",
    path.join(storiesDir, "story_demo.jpg")
  );
  await downloadIfNeeded(
    "https://picsum.photos/seed/cliptok2/720/1280.jpg",
    path.join(storiesDir, "story_alice.jpg")
  );
  const storyDemoVideo = path.join(storiesDir, "story_demo_video.mp4");
  try {
    await access(storyDemoVideo);
  } catch {
    const { copyFile } = await import("fs/promises");
    await copyFile(path.join(uploadsDir, "demo1.mp4"), storyDemoVideo);
    console.log("  OK story_demo_video.mp4 (copie demo1)");
  }

  const passwordHash = await bcrypt.hash("demo1234", 12);

  const demo = await prisma.user.upsert({
    where: { email: "demo@cliptok.local" },
    update: {
      bio: "Compte démo ClipTok 🎬",
      displayName: "Démo",
    },
    create: {
      email: "demo@cliptok.local",
      username: "demo",
      passwordHash,
      bio: "Compte démo ClipTok 🎬",
      displayName: "Démo",
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: "alice@cliptok.local" },
    update: {
      bio: "Créatrice de contenus · voyage & lifestyle",
      displayName: "Alice",
    },
    create: {
      email: "alice@cliptok.local",
      username: "alice",
      passwordHash,
      bio: "Créatrice de contenus · voyage & lifestyle",
      displayName: "Alice",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@cliptok.local" },
    update: {
      bio: "Fan de cinéma open source 🎞️",
      displayName: "Bob",
    },
    create: {
      email: "bob@cliptok.local",
      username: "bob",
      passwordHash,
      bio: "Fan de cinéma open source 🎞️",
      displayName: "Bob",
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: "charlie@cliptok.local" },
    update: {
      bio: "Nouveau sur ClipTok — suggestions & demandes",
      displayName: "Charlie",
    },
    create: {
      email: "charlie@cliptok.local",
      username: "charlie",
      passwordHash,
      bio: "Nouveau sur ClipTok — suggestions & demandes",
      displayName: "Charlie",
    },
  });

  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.storyView.deleteMany({});
  await prisma.story.deleteMany({});
  await prisma.follow.deleteMany({});
  await prisma.commentLike.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.like.deleteMany({});
  await prisma.repost.deleteMany({});
  await prisma.video.deleteMany({});

  // Follows: demo ↔ alice (mutual), demo → bob, alice → bob, charlie → demo (demande)
  const follows: [string, string][] = [
    [demo.id, alice.id],
    [alice.id, demo.id],
    [demo.id, bob.id],
    [alice.id, bob.id],
    [charlie.id, demo.id],
  ];
  for (const [followerId, followingId] of follows) {
    await prisma.follow.create({ data: { followerId, followingId } });
  }

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

  // Ensure comments upload dir + demo image for image comments
  const commentsDir = path.join(uploadsDir, "comments");
  await mkdir(commentsDir, { recursive: true });
  const commentImg = path.join(commentsDir, "seed_map.jpg");
  try {
    await access(commentImg);
  } catch {
    try {
      const { copyFile } = await import("fs/promises");
      await copyFile(path.join(storiesDir, "story_demo.jpg"), commentImg);
      console.log("  OK seed_map.jpg (copie story)");
    } catch {
      console.log("  (pas d'image commentaire démo)");
    }
  }

  const videos = await prisma.video.findMany({ orderBy: { createdAt: "asc" } });
  if (videos[0]) {
    await prisma.like.create({
      data: { userId: alice.id, videoId: videos[0].id },
    });
    const c1 = await prisma.comment.create({
      data: {
        content: "Trop stylé ! 👏",
        userId: bob.id,
        videoId: videos[0].id,
      },
    });
    const c1r = await prisma.comment.create({
      data: {
        content: "@bob Merci ! Content que ça te plaise 🔥",
        userId: demo.id,
        videoId: videos[0].id,
        parentId: c1.id,
      },
    });
    await prisma.comment.create({
      data: {
        content: "Carrément d'accord avec Bob",
        userId: alice.id,
        videoId: videos[0].id,
        parentId: c1.id,
      },
    });
    await prisma.commentLike.create({
      data: { userId: alice.id, commentId: c1.id },
    });
    await prisma.commentLike.create({
      data: { userId: demo.id, commentId: c1.id },
    });
    await prisma.commentLike.create({
      data: { userId: bob.id, commentId: c1r.id },
    });
    await prisma.repost.create({
      data: { userId: bob.id, videoId: videos[0].id },
    });
  }
  if (videos[1]) {
    await prisma.like.create({
      data: { userId: bob.id, videoId: videos[1].id },
    });
    await prisma.like.create({
      data: { userId: demo.id, videoId: videos[1].id },
    });
    const c2 = await prisma.comment.create({
      data: {
        content: "J'adore cette vidéo ❤️",
        userId: alice.id,
        videoId: videos[1].id,
      },
    });
    await prisma.comment.create({
      data: {
        content: "Regarde où j'étais 📍",
        userId: bob.id,
        videoId: videos[1].id,
        imageUrl: "/uploads/comments/seed_map.jpg",
      },
    });
    await prisma.comment.create({
      data: {
        content: "@alice Same here 😍",
        userId: charlie.id,
        videoId: videos[1].id,
        parentId: c2.id,
      },
    });
    await prisma.commentLike.create({
      data: { userId: bob.id, commentId: c2.id },
    });
    await prisma.commentLike.create({
      data: { userId: demo.id, commentId: c2.id },
    });
    await prisma.commentLike.create({
      data: { userId: charlie.id, commentId: c2.id },
    });
  }

  // Stories (expire in 24h)
  const storyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.story.create({
    data: {
      userId: demo.id,
      mediaUrl: "/uploads/stories/story_demo.jpg",
      caption: "Bonne vibes aujourd'hui ✨",
      expiresAt: storyExpires,
    },
  });
  await prisma.story.create({
    data: {
      userId: alice.id,
      mediaUrl: "/uploads/stories/story_alice.jpg",
      caption: "En route ✈️",
      expiresAt: storyExpires,
    },
  });
  await prisma.story.create({
    data: {
      userId: alice.id,
      mediaUrl: "/uploads/stories/story_demo_video.mp4",
      caption: "Petit clip story 🎬",
      expiresAt: storyExpires,
    },
  });

  // DM threads
  async function seedThread(
    u1: { id: string },
    u2: { id: string },
    msgs: { senderId: string; body: string; minutesAgo: number; read?: boolean }[]
  ) {
    const [a, b] = orderedPair(u1.id, u2.id);
    const conv = await prisma.conversation.create({
      data: { participantAId: a, participantBId: b },
    });
    for (const m of msgs) {
      const createdAt = new Date(Date.now() - m.minutesAgo * 60_000);
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: m.senderId,
          body: m.body,
          createdAt,
          readAt: m.read === false ? null : new Date(createdAt.getTime() + 30_000),
        },
      });
    }
    const last = msgs.reduce((acc, m) => Math.min(acc, m.minutesAgo), Infinity);
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date(Date.now() - last * 60_000) },
    });
  }

  await seedThread(demo, alice, [
    { senderId: alice.id, body: "Salut Démo ! Bienvenue sur ClipTok 👋", minutesAgo: 120 },
    { senderId: demo.id, body: "Merci Alice ! Les vidéos sont top.", minutesAgo: 90 },
    { senderId: alice.id, body: "N'hésite pas à me follow back ✨", minutesAgo: 45 },
    { senderId: demo.id, body: "Déjà fait 😄", minutesAgo: 30, read: false },
  ]);

  await seedThread(demo, bob, [
    { senderId: bob.id, body: "Tu as vu le extrait Sintel ?", minutesAgo: 200 },
    { senderId: demo.id, body: "Oui, trop beau 🗡️", minutesAgo: 180 },
    { senderId: bob.id, body: "Je republie ça ce soir.", minutesAgo: 10, read: false },
  ]);

  // Demande: charlie message demo (demo does not follow charlie)
  await seedThread(demo, charlie, [
    {
      senderId: charlie.id,
      body: "Hey ! Je viens de m'inscrire, on peut échanger ?",
      minutesAgo: 5,
      read: false,
    },
  ]);

  console.log("\nSeed terminé !");
  console.log("Comptes démo (mot de passe: demo1234):");
  console.log("  - demo@cliptok.local / demo");
  console.log("  - alice@cliptok.local / alice");
  console.log("  - bob@cliptok.local / bob");
  console.log("  - charlie@cliptok.local / charlie");
  console.log(`${SAMPLES.length} vidéos, commentaires filés, stories, follows + DMs créés.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
