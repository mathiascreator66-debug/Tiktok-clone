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
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AfriVoixSeed/1.0)" },
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
    "https://picsum.photos/seed/afrivoix1/720/1280.jpg",
    path.join(storiesDir, "story_demo.jpg")
  );
  await downloadIfNeeded(
    "https://picsum.photos/seed/afrivoix2/720/1280.jpg",
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

  // Migrate legacy ClipTok demo emails → AfriVoix
  const emailMap: [string, string][] = [
    ["demo@cliptok.local", "demo@afrivoix.local"],
    ["alice@cliptok.local", "alice@afrivoix.local"],
    ["bob@cliptok.local", "bob@afrivoix.local"],
    ["charlie@cliptok.local", "charlie@afrivoix.local"],
  ];
  for (const [oldEmail, newEmail] of emailMap) {
    const old = await prisma.user.findUnique({ where: { email: oldEmail } });
    if (old) {
      const clash = await prisma.user.findUnique({ where: { email: newEmail } });
      if (!clash) {
        await prisma.user.update({
          where: { email: oldEmail },
          data: { email: newEmail },
        });
      }
    }
  }


  const demo = await prisma.user.upsert({
    where: { email: "demo@afrivoix.local" },
    update: {
      bio: "Compte démo AfriVoix 🎬 — fil, stories, DMs, solde démo et monétisation. Bio jusqu’à 250 caractères.",
      displayName: "Démo",
      balanceCents: 1000,
    },
    create: {
      email: "demo@afrivoix.local",
      username: "demo",
      passwordHash,
      bio: "Compte démo AfriVoix 🎬 — fil, stories, DMs, solde démo et monétisation. Bio jusqu’à 250 caractères.",
      displayName: "Démo",
      balanceCents: 1000,
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: "alice@afrivoix.local" },
    update: {
      bio: "Créatrice de contenus · voyage & lifestyle. Liens dans la bio ✨",
      displayName: "Alice",
      balanceCents: 500,
    },
    create: {
      email: "alice@afrivoix.local",
      username: "alice",
      passwordHash,
      bio: "Créatrice de contenus · voyage & lifestyle. Liens dans la bio ✨",
      displayName: "Alice",
      balanceCents: 500,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@afrivoix.local" },
    update: {
      bio: "Fan de cinéma open source 🎞️",
      displayName: "Bob",
    },
    create: {
      email: "bob@afrivoix.local",
      username: "bob",
      passwordHash,
      bio: "Fan de cinéma open source 🎞️",
      displayName: "Bob",
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: "charlie@afrivoix.local" },
    update: {
      bio: "Nouveau sur AfriVoix — suggestions & demandes",
      displayName: "Charlie",
    },
    create: {
      email: "charlie@afrivoix.local",
      username: "charlie",
      passwordHash,
      bio: "Nouveau sur AfriVoix — suggestions & demandes",
      displayName: "Charlie",
    },
  });

  
  const admin = await prisma.user.upsert({
    where: { email: "admin@afrivoix.local" },
    update: {
      bio: "Administrateur AfriVoix",
      displayName: "Admin",
      isAdmin: true,
      isModerator: true,
      isVerified: true,
      accountStatus: "ACTIVE",
      country: "SN",
      language: "fr",
    },
    create: {
      email: "admin@afrivoix.local",
      username: "admin",
      passwordHash,
      bio: "Administrateur AfriVoix",
      displayName: "Admin",
      isAdmin: true,
      isModerator: true,
      isVerified: true,
      accountStatus: "ACTIVE",
      country: "SN",
      language: "fr",
      balanceCents: 0,
    },
  });
  void admin;

  await prisma.adminAction.deleteMany({});
  await prisma.helpTicket.deleteMany({});
  await prisma.videoHashtag.deleteMany({});
  await prisma.hashtag.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.watchEvent.deleteMany({});
  await prisma.bookmark.deleteMany({});
  await prisma.notInterested.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.profileLink.deleteMany({});
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
  const sounds = [
    "Son original — @demo",
    "Summer vibes — AfriVoix Sounds",
    "Piano émotion — AfriVoix Sounds",
    "Son original — @demo",
    "Lofi night — AfriVoix Sounds",
  ];
  for (let i = 0; i < SAMPLES.length; i++) {
    const s = SAMPLES[i];
    await prisma.video.create({
      data: {
        caption: s.caption,
        videoUrl: `/uploads/${s.file}`,
        userId: authors[i].id,
        soundName: sounds[i],
        pinnedAt: i === 0 ? new Date() : null,
      },
    });
  }

  await prisma.profileLink.createMany({
    data: [
      {
        userId: demo.id,
        url: "https://github.com",
        label: "GitHub",
        sortOrder: 0,
      },
      {
        userId: demo.id,
        url: "https://afrivoix.local",
        label: "AfriVoix",
        sortOrder: 1,
      },
      {
        userId: alice.id,
        url: "https://example.com/alice",
        label: "Portfolio",
        sortOrder: 0,
      },
    ],
  });

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


  // Hashtags from captions
  const allVideos = await prisma.video.findMany();
  for (const v of allVideos) {
    const re = /#([A-Za-z0-9_\u00C0-\u024F]{1,50})/g;
    const names = new Set<string>();
    let m;
    while ((m = re.exec(v.caption)) !== null) names.add(m[1].toLowerCase());
    for (const name of names) {
      const tag = await prisma.hashtag.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      await prisma.videoHashtag.create({
        data: { videoId: v.id, hashtagId: tag.id },
      });
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

  const videosAfter = await prisma.video.findMany({ orderBy: { createdAt: "asc" } });
  if (videosAfter[0]) {
    await prisma.bookmark.create({
      data: { userId: alice.id, videoId: videosAfter[0].id },
    });
    await prisma.bookmark.create({
      data: { userId: bob.id, videoId: videosAfter[0].id },
    });
  }
  if (videosAfter[1]) {
    await prisma.bookmark.create({
      data: { userId: demo.id, videoId: videosAfter[1].id },
    });
  }

  const now = Date.now();
  if (videosAfter[1]) {
    await prisma.watchEvent.create({
      data: {
        userId: demo.id,
        videoId: videosAfter[1].id,
        watchedAt: new Date(now - 60 * 60 * 1000),
      },
    });
  }
  if (videosAfter[2]) {
    await prisma.watchEvent.create({
      data: {
        userId: demo.id,
        videoId: videosAfter[2].id,
        watchedAt: new Date(now - 26 * 60 * 60 * 1000),
      },
    });
  }
  if (videosAfter[3]) {
    await prisma.watchEvent.create({
      data: {
        userId: demo.id,
        videoId: videosAfter[3].id,
        watchedAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
      },
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
    { senderId: alice.id, body: "Salut Démo ! Bienvenue sur AfriVoix 👋", minutesAgo: 120 },
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

  // Portefeuille démo : solde déjà sur user.demo (1000 cents) + historique
  await prisma.transaction.create({
    data: {
      userId: demo.id,
      type: "credit",
      amountCents: 1000,
      meta: JSON.stringify({
        demo: true,
        note: "Solde initial démo — crédits virtuels",
        source: "seed",
      }),
    },
  });
  await prisma.transaction.create({
    data: {
      userId: alice.id,
      type: "credit",
      amountCents: 500,
      meta: JSON.stringify({
        demo: true,
        note: "Solde initial démo — crédits virtuels",
        source: "seed",
      }),
    },
  });

  console.log("\nSeed terminé !");
  console.log("Comptes démo (mot de passe: demo1234):");
  console.log("  - demo@afrivoix.local / demo");
  console.log("  - alice@afrivoix.local / alice");
  console.log("  - bob@afrivoix.local / bob");
  console.log("  - charlie@afrivoix.local / charlie");
  console.log("  - admin@afrivoix.local / admin (isAdmin)");
  console.log(`${SAMPLES.length} vidéos, commentaires filés, stories, follows + DMs créés.`);
  console.log("Portefeuille démo: demo=10,00 € · alice=5,00 € (crédits virtuels).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
