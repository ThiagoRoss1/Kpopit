// Collections — from src/pages/Collection/Collections.tsx + components/CollectionCard.tsx.
const COLLECTIONS = [
  { id: 1, label: "Album 1", name: "KpopIt Album", desc: "Stickers of every idol you guess in Classic, Blurry and Pixelated. Win a mode to collect today's idol.", owned: 29, total: 40, hue: 340, cover: idol("yujin") },
  { id: 2, label: "Album 2", name: "Girl Groups 4th Gen", desc: "Fourth-generation girl groups, one page per group. Complete a page to unlock its group photo.", owned: 6, total: 48, hue: 290, cover: "https://cdn.kpopit.net/images/groups/lesserafim.webp?v=1" },
];

function CollectionCard({ c, onOpen }) {
  const { Cap, Pill, PressButton, Icon, ProgressBar } = KP;
  const pct = Math.round((c.owned / c.total) * 100);
  return (
    <section className="kp-panel kp-panel--feature cl-card">
      <button onClick={onOpen} className="cl-cover" style={{ background: `linear-gradient(180deg, transparent 45%, rgba(10,10,10,.75)), url("${c.cover}") center/cover, oklch(0.5 0.15 ${c.hue})` }} aria-label={`Open ${c.name}`}>
        <span className="kp-themed__spine" />
        <span className="kp-mono" style={{ fontSize: 13, color: "#fff", padding: 10, textAlign: "left" }}>{c.name}</span>
      </button>
      <div className="cl-body">
        <p style={{ margin: 0, fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: ".08em" }}>{c.label}</p>
        <h2 className="kp-mono" style={{ margin: "8px 0 0", fontSize: "clamp(22px,3.4vw,34px)", lineHeight: 1.08, fontWeight: 400 }}>{c.name}</h2>
        <p className="kp-ko" style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>케이팝잇 ● 앨범 {c.id}</p>
        <p style={{ margin: "12px 0 0", maxWidth: 460, fontSize: 14, lineHeight: 1.5, color: "var(--text-muted)" }}>{c.desc}</p>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, paddingTop: 16, marginTop: "auto" }}>
          <PressButton onClick={onOpen} iconEnd={<Icon name="arrow-right" size={16} />}>Open album</PressButton>
          <Pill>{c.total} stickers</Pill><Pill>{pct}% complete</Pill>
        </div>
      </div>
      <div style={{ alignSelf: "center", width: 220, maxWidth: "100%" }}>
        <div className="kp-panel kp-panel--sunken">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 4 }}>
            <span style={{ font: "var(--type-stat-xl)", color: "var(--neon-pink)" }}>{pct}%</span>
            <Cap tone="muted">{c.owned}/{c.total} stickers</Cap>
          </div>
          <div style={{ marginTop: 10 }}><ProgressBar value={pct} /></div>
        </div>
      </div>
    </section>
  );
}

function CollectionsScreen({ night, setNight, toast }) {
  const { IconButton, Icon, ThemedCard } = KP;
  const total = COLLECTIONS.reduce((s, c) => s + c.total, 0);
  const rule = night ? "rgba(255,255,255,.22)" : "var(--ink)";
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "26px 24px 72px", position: "relative" }}>
      <header>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, borderBottom: `1.5px solid ${rule}`, paddingBottom: 8 }}>
          <span className="kp-cap kp-cap--muted">Kpopit Collections</span><span className="kp-cap kp-cap--pink">Vol. I · Est. 2026</span>
        </div>
        <div className="cl-head">
          <h1 className="kp-mono" style={{ margin: 0, fontWeight: 400, fontSize: "clamp(44px,8vw,84px)", lineHeight: .9 }}>Collections<span style={{ color: "var(--neon-pink)" }}>.</span></h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 16, color: "var(--text-muted)" }}>{total} stickers to collect</span>
            <IconButton variant="toggle" label="Visual effects" onClick={() => toast("Visual effects panel")}><Icon name="sliders" size={18} /></IconButton>
            <IconButton variant="toggle" label="Light/night mode" onClick={() => setNight(!night)}><Icon name={night ? "moon" : "sun"} /></IconButton>
          </div>
        </div>
        <div style={{ marginTop: 10, borderBottom: `4px double ${rule}` }} />
      </header>
      {COLLECTIONS.map((c) => <CollectionCard key={c.id} c={c} onOpen={() => toast(`Opening ${c.name}… (album flip-book not in this kit)`)} />)}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24, padding: "16px 0" }}>
        <span style={{ fontWeight: 700, fontSize: 30 }}>Coming Soon!</span>
        <ThemedCard title="KpopIt Seasonal" cap="Seasonal" hue={0} description="Seasonal album will be a seasonal themed collection of stickers, featuring special seasonal designs and limited edition cards. Obtain them by opening packs, combining cards, playing games and doing activities across KpopIt!" />
      </div>
    </div>
  );
}
Object.assign(window, { CollectionsScreen });
