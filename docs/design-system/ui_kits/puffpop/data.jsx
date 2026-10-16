// Sample data for the Puff Pop UI kit. Idol list = IdolsFormV2 sample; profiles = IdolPagePersona14 RAW.
const PP = window.KpopItDesignSystem_07fd81;
const AS = "../../assets/";
const IDOLS = [
  ["sakura","Sakura","LE SSERAFIM",["jp"],1], ["kazuha","Kazuha","LE SSERAFIM",["jp"],0], ["karina","Karina","aespa",["kr"],1], ["winter","Winter","aespa",["kr"],0],
  ["chaewon","Kim Chaewon","LE SSERAFIM",["kr"],1], ["yunjin","Huh Yunjin","LE SSERAFIM",["kr","us"],0], ["giselle","Giselle","aespa",["jp","kr"],0], ["eunchae","Hong Eunchae","LE SSERAFIM",["kr"],1],
  ["ningning","NingNing","aespa",["cn"],0], ["sana","Sana","TWICE",["jp"],1], ["tzuyu","Tzuyu","TWICE",["tw"],0], ["wonyoung","Wonyoung","IVE",["kr"],1],
  ["yeji","Yeji","ITZY",["kr"],0], ["lisa","Lisa","BLACKPINK",["th"],1], ["rose","Rosé","BLACKPINK",["nz","kr"],0], ["ahyeon","Ahyeon","BABYMONSTER",["kr"],1],
  ["hanni","Hanni","NewJeans",["vn","au"],0], ["yuqi","Yuqi","i-dle",["cn"],1], ["moka","Moka","ILLIT",["jp"],0], ["gehlee","Gehlee","UNIS",["ph"],0],
  ["taeyeon","Taeyeon","Girls' Generation",["kr"],1], ["chuu","Chuu",null,["kr"],0], ["jeonsomi","Jeon Somi",null,["ca","nl","kr"],1], ["yena","Yena",null,["kr"],0], ["chungha","Chungha",null,["kr"],1]
].map(([id, name, group, nat, album]) => ({ id, name, group, nat, album: !!album, img: "https://cdn.kpopit.net/images/idols/" + id + ".webp" }));
const COMPANY = { "LE SSERAFIM": "Source Music", aespa: "SM Entertainment", TWICE: "JYP Entertainment", IVE: "Starship", ITZY: "JYP Entertainment", BLACKPINK: "YG Entertainment", BABYMONSTER: "YG Entertainment", NewJeans: "ADOR", "i-dle": "Cube Entertainment", ILLIT: "Belift Lab", UNIS: "F&F Entertainment", "Girls' Generation": "SM Entertainment", chuu: "ATRP", jeonsomi: "The Black Label", yena: "Yuehua", chungha: "MORE VISION" };
IDOLS.forEach(d => { d.company = COMPANY[d.group] || COMPANY[d.id] || ""; d.groupLabel = d.group || "Soloist"; });
const NAT = { kr: "South Korea", jp: "Japan", cn: "China", tw: "Taiwan", th: "Thailand", nz: "New Zealand", vn: "Vietnam", au: "Australia", ph: "Philippines", ca: "Canada", nl: "Netherlands", us: "United States" };
const flag = n => AS + "flags/" + n + ".svg";

const G = {
  "LE SSERAFIM": { ko: "르 세라핌", gen: 4, members: 5, fandom: "FEARNOT", parent: "HYBE", label: "Source Music" },
  aespa: { ko: "에스파", gen: 4, members: 4, fandom: "MY", parent: "SM Entertainment", label: "SM Entertainment" },
  IVE: { ko: "아이브", gen: 4, members: 6, fandom: "DIVE", parent: "Kakao Entertainment", label: "Starship Entertainment" },
  BLACKPINK: { ko: "블랙핑크", gen: 3, members: 4, fandom: "BLINK", parent: "YG Entertainment", label: "YG Entertainment" },
  NewJeans: { ko: "뉴진스", gen: 4, members: 5, fandom: "Bunnies/Tokki", parent: "HYBE", label: "ADOR" }
};
const MON = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const FL = { Japanese: "jp", "South Korean": "kr", Thai: "th", Vietnamese: "vn", Australian: "au" }, N3 = { Japanese: "JPN", "South Korean": "KOR", Thai: "THA", Vietnamese: "VNM", Australian: "AUS" };
const ord = n => { const s = ["th","st","nd","rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const PROFILES = [
  [2,"sakura","Sakura","Miyawaki Sakura","1998-03-19",163,"Vocalist, Rapper, Dancer","Japanese",2018,"LE SSERAFIM",2022,[["IZ*ONE",2018,2021]],""],
  [4,"kazuha","Kazuha","Nakamura Kazuha","2003-08-09",170,"Sub-Vocalist, Rapper, Dancer","Japanese",2022,"LE SSERAFIM",2022,[],""],
  [6,"karina","Karina","Yu Ji-min","2000-04-11",168,"Leader, Main Dancer, Lead Rapper, Sub-Vocalist, Visual","South Korean",2020,"aespa",2020,[["GOT the beat",2022,2023]],""],
  [8,"winter","Winter","Kim Min-jeong","2001-01-01",163,"Lead Vocalist, Lead Dancer","South Korean",2020,"aespa",2020,[["GOT the beat",2022,2023]],""],
  [22,"wonyoung","Wonyoung","Jang Won-young","2004-08-31",173,"Vocalist, Dancer, Visual","South Korean",2018,"IVE",2021,[["IZ*ONE",2018,2021]],""],
  [28,"lisa","Lisa","Lalisa Manobal","1997-03-27",167,"Main Dancer, Lead Rapper, Sub-Vocalist, Maknae","Thai",2016,"BLACKPINK",2016,[],"LLOUD"],
  [69,"hanni","Hanni","Hanni Phạm","2004-10-06",162,"Vocalist","Vietnamese, Australian",2022,"NewJeans",2022,[],""]
].map(([id, slug, name, real, birth, height, pos, nat, debut, group, since, past, co]) => {
  const g = G[group], b = new Date(birth + "T00:00:00"), now = new Date();
  let age = now.getFullYear() - b.getFullYear(); if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age--;
  const nats = nat.split(", "), list = IDOLS.find(x => x.id === slug);
  return { id, slug, name, real, age, height, debut, since, group, groupKo: g.ko, fandom: g.fandom, parent: g.parent, label: g.label, idolCo: co || "N/A",
    img: list ? list.img : "https://cdn.kpopit.net/images/idols/" + slug + ".webp",
    birthLong: MON[b.getMonth()] + " " + b.getDate() + ", " + b.getFullYear(), positions: pos.split(", "),
    nats: nats.map(n => ({ label: n, src: flag(FL[n]), code: N3[n] })), natText: nat, natKey: nats.length > 1 ? "NATIONALITIES" : "NATIONALITY",
    groupLine: ord(g.gen) + " gen · " + g.members + " members · " + g.fandom, past: past.map(p => ({ group: p[0], years: p[1] + "–" + p[2], s: p[1] })),
    no: "Nº " + ("00" + id).slice(-3) };
});
const PROFILE = Object.fromEntries(PROFILES.map(p => [p.slug, p]));

const ALBUMS = [
  ["After Like","IVE","Single",2022,"after_like"], ["FEARLESS","LE SSERAFIM","Mini",2022,"fearless"], ["ANTIFRAGILE","LE SSERAFIM","Mini",2022,"antifragile"],
  ["UNFORGIVEN","LE SSERAFIM","Studio",2023,"unforgiven"], ["Savage","aespa","Mini",2021,"savage"], ["MY WORLD","aespa","Mini",2023,"my_world"],
  ["Armageddon","aespa","Studio",2024,"armageddon"], ["Gee","Girls' Generation","Mini",2009,"gee"], ["Strawberry Rush","Chuu","Mini",2024,"strawberry_rush"]
].map(([name, artist, type, year, s]) => ({ id: s, name, artist, type, year, img: "https://cdn.kpopit.net/images/albums/" + s + ".webp" }));
const uniq = a => [...new Set(a)];
Object.assign(window, { PP, AS, IDOLS, NAT, flag, PROFILE, PROFILES, ALBUMS, uniq });
