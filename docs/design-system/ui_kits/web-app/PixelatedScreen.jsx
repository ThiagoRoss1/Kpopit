// Pixelated mode — recreated from src/pages/PixelatedMode/PixelatedMode.tsx (lg layout + mobile stack).
function PixelStage({ guesses, ended }) {
  const block = ended ? 4 : BLOCKS[Math.min(guesses, BLOCKS.length - 1)];
  const { WashiTape } = KP;
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 520, height: 470, margin: "0 auto" }}>
      <div style={{ position: "absolute", left: 120, top: 16, width: 360, height: 360, zIndex: 1 }}>
        <div className="kp-vinyl is-spinning">
          <div className="kp-vinyl__spin"><div className="kp-vinyl__label"><PixelCover src={ANSWER.coverSrc} block={Math.max(1, block / 2)} size={160} /></div></div>
          <div className="kp-vinyl__light" /><div className="kp-vinyl__hole" />
        </div>
      </div>
      <div className="kp-sleeve" style={{ position: "absolute", left: 0, top: 8, width: 360, height: 400, transform: "rotate(-4deg)", zIndex: 2 }}>
        <div className="kp-sleeve__inner">
          <WashiTape className="kp-sleeve__tape kp-sleeve__tape--l" angle={-34.8} width="22%" />
          <WashiTape className="kp-sleeve__tape kp-sleeve__tape--r" angle={34.8} width="22%" />
          <div className="kp-sleeve__cover">
            <PixelCover src={ANSWER.coverSrc} block={block} />
            {!ended && guesses === 0 && <div className="kp-sleeve__q">?</div>}
            <span className="kp-sleeve__corner kp-sleeve__corner--tl" /><span className="kp-sleeve__corner kp-sleeve__corner--tr" />
            <span className="kp-sleeve__corner kp-sleeve__corner--bl" /><span className="kp-sleeve__corner kp-sleeve__corner--br" />
          </div>
        </div>
        <div className="kp-sleeve__note" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>Guess the album</div>
      </div>
    </div>
  );
}

function PixelatedScreen({ onOpenStats, onWin, guesses, setGuesses, won }) {
  const { Wordmark, IconButton, Icon, SearchField, GuessRow, HintSleeve } = KP;
  const used = guesses.map((g) => g.title);
  const submit = (v) => {
    const pick = typeof v === "string" ? ALBUMS.find((a) => v.toLowerCase().startsWith(a.title.toLowerCase())) : v;
    if (!pick || used.includes(pick.title)) return;
    const correct = pick.title === ANSWER.title;
    setGuesses([{ ...pick, correct, fresh: true }, ...guesses.map((g) => ({ ...g, fresh: false }))]);
    if (correct) setTimeout(onWin, 2400);
  };
  const n = guesses.length;
  return (
    <div className="pm-wrap">
      <div className="pm-left">
        <PixelStage guesses={n} ended={won} />
        {!won && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
            <HintSleeve key={"y" + Math.max(0, 3 - n)} index="01" label="Release Year" korean="발매년도" value={String(ANSWER.year)} tone="year" remaining={Math.max(0, 3 - n)} />
            <HintSleeve key={"a" + Math.max(0, 6 - n)} index="02" label="Artist" korean="아티스트" value={ANSWER.subtitle} tone="artist" remaining={Math.max(0, 6 - n)} />
          </div>
        )}
      </div>
      <div className="pm-right">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 24 }}>
          <Wordmark first="Pixel" second="It" size="md" />
          <IconButton variant="pink" label="Your stats" onClick={onOpenStats}><Icon name="chart" size={22} /></IconButton>
        </div>
        {!won && <p style={{ textAlign: "center", margin: "0 0 4px", fontSize: 16, color: "var(--text-muted)" }}>Guess today's album...</p>}
        {!won && <div style={{ marginBottom: 12 }}><SearchField suggestions={ALBUMS.filter((a) => !used.includes(a.title))} onSubmit={submit} placeholder="Type an album or group…" /></div>}
        <p style={{ textAlign: "center", margin: "0 0 28px", fontSize: 16 }}>
          <b style={{ color: "var(--text-pink)" }}>{23 + (won ? 1 : 0)}</b> <span style={{ color: "var(--text-muted)" }}>people already found today's album</span>
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {guesses.map((g, i) => (
            <GuessRow key={g.title} title={g.title} subtitle={g.subtitle} coverSrc={g.coverSrc} correct={g.correct} tilt={(guesses.length - i) % 2 ? "left" : "right"} animate={g.fresh} />
          ))}
        </div>
        {!won && (
          <p style={{ textAlign: "center", marginTop: 56, font: "var(--type-hand-lg)" }}>
            <span style={{ color: "var(--text-muted)" }}>Yesterday's album was</span> <b style={{ color: "var(--text-pink)" }}>{YESTERDAY.title}</b>
          </p>
        )}
      </div>
    </div>
  );
}
Object.assign(window, { PixelatedScreen });
