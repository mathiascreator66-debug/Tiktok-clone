const PROMPTS = [
  "Filmez un marché près de chez vous en 15 secondes",
  "Montrez votre plat préféré du jour",
  "Une danse traditionnelle ou moderne — à vous !",
  "Dites bonjour dans votre langue maternelle",
  "Un conseil pour les jeunes entrepreneurs africains",
  "Capturez le coucher de soleil où vous êtes",
  "Votre artiste africain du moment — pourquoi ?",
  "Un geste de solidarité filmé aujourd’hui",
];

export function voixDuJourForDate(d = new Date()) {
  const day = Math.floor(d.getTime() / 86_400_000);
  const prompt = PROMPTS[day % PROMPTS.length];
  return {
    date: d.toISOString().slice(0, 10),
    prompt,
    hashtag: "voixdujour",
    badge: "Voix du jour",
  };
}
