import { prisma } from "./prisma";
import { createBooking, createOffer, createRequest, ensureWelcomeEntry } from "./loans";

// Sample data mirrors the client mockup 1:1 (names, quartiers, periods).
// Phenomenon chips show live counts derived from these rows — add another
// offer to the list below and the landing page updates by itself.
//
// Exported (not just run) so ephemeral demo hosts can seed at boot.
// See lib/bootstrap.ts.

const WIN = { from: "2026-09-01", to: "2027-08-31" } as const;

export async function seedDatabase(): Promise<void> {
  // Clean slate (order matters: children first).
  await prisma.ledgerEntry.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.request.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.sizeCategory.deleteMany();
  await prisma.phenomenon.deleteMany();

  for (const name of [
    "Heat wave",
    "Cold snap",
    "Heavy rain",
    "Storm",
    "Snow and ice",
    "Drought",
    "Power outage",
  ]) {
    await prisma.phenomenon.create({ data: { name } });
  }
  const phenomenonId = async (name: string): Promise<number> =>
    (await prisma.phenomenon.findUniqueOrThrow({ where: { name } })).id;

  for (const [key, label, pointsPerDay] of [
    ["small", "Small", 1],
    ["medium", "Medium", 2],
    ["large", "Large", 3],
  ] as const) {
    await prisma.sizeCategory.create({ data: { key, label, pointsPerDay } });
  }

  const userId: Record<string, number> = {};
  for (const [name, neighbourhood] of [
    ["Lea", "Oerlikon"],
    ["Marco", "Altstetten"],
    ["Aylin", "Wiedikon"],
    ["Jonas", "Seebach"],
    ["Sven", "Höngg"],
    ["Mira", "Enge"],
  ] as const) {
    const user = await prisma.user.create({
      data: {
        name,
        email: `${name.toLowerCase()}@example.org`,
        neighbourhood,
      },
    });
    userId[name] = user.id;
    await ensureWelcomeEntry(user.id);
  }

  // [title, owner, size, phenomena, window, neighbourhood, description]
  const offers: [
    string, string, string, string[], { from: string; to: string }, string, string,
  ][] = [
    ["Floor fan 40 cm", "Lea", "medium", ["Heat wave"], { from: "2027-06-01", to: "2027-08-31" }, "Oerlikon", "Quiet standing fan, three speeds. Keeps a bedroom bearable."],
    ["Portable air conditioner", "Marco", "large", ["Heat wave"], { from: "2027-06-01", to: "2027-08-31" }, "Altstetten", "Mobile unit with window kit. Cools a small room properly."],
    ["Cooler box 25 L", "Aylin", "small", ["Heat wave", "Power outage"], { from: "2027-05-01", to: "2027-08-31" }, "Wiedikon", "Keeps food and drinks cold for a weekend, no power needed."],
    ["Balcony sun sail", "Jonas", "small", ["Heat wave", "Storm"], { from: "2027-06-01", to: "2027-08-31" }, "Seebach", "Triangular shade sail with ropes. Shades a small balcony."],
    ["Fan heater 2000 W", "Sven", "medium", ["Cold snap"], { from: "2026-11-01", to: "2027-02-28" }, "Höngg", "Heats a draughty room in minutes. Thermostat included."],
    ["Electric blanket", "Mira", "medium", ["Cold snap"], { from: "2026-11-01", to: "2027-02-28" }, "Enge", "Single bed size, washable cover, timer switch."],
    ["Down sleeping bag", "Aylin", "small", ["Cold snap", "Power outage"], { from: "2026-10-01", to: "2027-03-31" }, "Hirslanden", "Comfort rated to -5°C. Packs small, good for cold flats too."],
    ["Wet and dry vacuum", "Sven", "large", ["Heavy rain"], WIN, "Höngg", "Sucks water out of cellars. Short notice pickup possible."],
    ["Dehumidifier", "Mira", "medium", ["Heavy rain"], WIN, "Enge", "Dries one room after flooding. Short notice pickup possible."],
    ["Rubber boots size 42", "Jonas", "small", ["Heavy rain", "Snow and ice"], WIN, "Seebach", "Knee-high, barely worn. For flooded streets and slush."],
    ["Sandbags, set of 10", "Marco", "medium", ["Heavy rain", "Storm"], WIN, "Altstetten", "Empty bags plus filling instructions. Short notice pickup possible."],
    ["Window storm film kit", "Lea", "small", ["Storm"], WIN, "Oerlikon", "Adhesive film plus tape. Protects two windows."],
    ["Snow shovel and grit", "Sven", "small", ["Snow and ice"], { from: "2026-12-01", to: "2027-02-28" }, "Höngg", "Aluminium shovel plus 5 kg grit for icy stairs."],
    ["Rain barrel 200 L", "Aylin", "large", ["Drought", "Heavy rain"], { from: "2027-04-01", to: "2027-08-31" }, "Wiedikon", "Collects roof runoff for dry weeks. Tap included."],
    ["Watering cans, set of 3", "Mira", "small", ["Drought"], { from: "2027-04-01", to: "2027-08-31" }, "Enge", "Three 10 L cans for balcony plants during water-saving weeks."],
    ["Power bank 25'000 mAh", "Jonas", "small", ["Power outage", "Heat wave"], WIN, "Seebach", "Charges a phone ~5 times. USB-C and USB-A cables included."],
    ["Camping stove with gas", "Lea", "small", ["Power outage"], WIN, "Oerlikon", "Single burner with one full cartridge. For cooking during outages."],
    ["LED lanterns, set of 4", "Marco", "small", ["Power outage", "Storm"], WIN, "Altstetten", "Battery lanterns, one per room. Batteries included."],
  ];

  for (const [title, owner, sizeKey, phenomena, window, neighbourhood, description] of offers) {
    await createOffer({
      ownerId: userId[owner],
      title,
      description,
      sizeKey,
      neighbourhood,
      availableFromKey: window.from,
      availableUntilKey: window.to,
      phenomenonIds: await Promise.all(phenomena.map(phenomenonId)),
    });
  }

  // [title, requester, phenomenon, neighbourhood, note, from?, to?, periodNote?]
  const requests: [
    string, string, string, string, string, (string | null)?, (string | null)?, (string | null)?,
  ][] = [
    ["Fan heater", "Lea", "Cold snap", "Hottingen", "Our flat stays cold in November.", "2026-11-14", "2026-11-21", null],
    ["Rubber boots size 40", "Marco", "Heavy rain", "Wiedikon", "Cellar flooded twice already.", null, null, "2 days, short notice"],
    ["Electric blanket", "Aylin", "Cold snap", "Altstetten", "For my grandmother's visit.", "2026-12-01", "2026-12-15", null],
    ["Sandbags, set of 10", "Jonas", "Storm", "Seebach", "Ground-floor windows.", null, null, "1 day, short notice"],
    ["LED lanterns", "Sven", "Power outage", "Höngg", "Planned grid maintenance.", "2026-11-18", "2026-11-19", null],
    ["Floor fan", "Mira", "Heat wave", "Enge", "For the next heat wave, exact days TBD.", null, null, "next heat wave"],
  ];
  for (const [title, requester, phenomenon, neighbourhood, note, from, to, periodNote] of requests) {
    await createRequest({
      requesterId: userId[requester],
      title,
      phenomenonId: await phenomenonId(phenomenon),
      neighbourhood,
      note,
      periodNote: periodNote ?? undefined,
      periodFromKey: from ?? undefined,
      periodUntilKey: to ?? undefined,
    });
  }

  // Two lived-in loans so history, dashboard and points start with content.
  // Both go through the real booking path — points move exactly as in the app.
  const dehumidifier = await prisma.offer.findFirstOrThrow({ where: { title: "Dehumidifier" } });
  await createBooking({
    offerId: dehumidifier.id,
    borrowerId: userId["Jonas"],
    fromKey: "2026-10-05",
    toKey: "2026-10-07",
  });
  const fanHeater = await prisma.offer.findFirstOrThrow({ where: { title: "Fan heater 2000 W" } });
  await createBooking({
    offerId: fanHeater.id,
    borrowerId: userId["Aylin"],
    fromKey: "2026-11-14",
    toKey: "2026-11-16",
  });
}
