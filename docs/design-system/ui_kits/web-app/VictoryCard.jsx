// Victory card — from src/components/Pixelated/PixelatedVictory.tsx. Title text is ink (source: white on cream).
function VictoryCard({ attempts, onCollections }) {
  const { StatTile, PressButton, IconButton, Icon, RewardBanner } = KP;
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="kp-panel kp-panel--cream" style={{ maxWidth: 600, margin: "0 auto", padding: "40px 36px", animation: "kp-modal-in .4s ease both" }}>
      <p style={{ textAlign: "center", fontSize: 36, fontWeight: 700, margin: "0 0 32px" }}>Congratulations! ♪</p>
      <div style={{ position: "relative", height: 280, marginBottom: 16 }}>
        <div className="kp-ko" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 160, color: "rgba(10,10,10,.06)", letterSpacing: "-.04em", whiteSpace: "nowrap", overflow: "hidden" }}>케이팝잇</div>
        <div style={{ position: "absolute", right: 18, top: 30, width: 220, height: 220, zIndex: 1 }}>
          <div className="kp-vinyl is-spinning"><div className="kp-vinyl__spin"><div className="kp-vinyl__label"><PixelCover src={ANSWER.coverSrc} block={1} size={240} /></div></div><div className="kp-vinyl__light" /><div className="kp-vinyl__hole" /></div>
        </div>
        <div style={{ position: "absolute", left: 30, top: 8, zIndex: 2, padding: 8, borderRadius: 14, background: "#1c1c1c", transform: "rotate(-3deg)", boxShadow: "0 8px 22px rgba(10,10,10,.25),0 0 0 2px rgba(10,10,10,.6)" }}>
          <div style={{ position: "relative", width: 230, height: 230, borderRadius: 8, overflow: "hidden" }}>
            <img src={ANSWER.coverSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", left: 12, right: 12, bottom: 10, color: "#fff", textShadow: "1px 2px 4px rgba(0,0,0,1)" }}>
              <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, textTransform: "uppercase" }}>{ANSWER.title}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, textTransform: "uppercase", fontStyle: "italic" }}>{ANSWER.subtitle}</div>
            </div>
          </div>
        </div>
      </div>
      <p style={{ textAlign: "center", font: "var(--type-hand-lg)", margin: "0 0 16px" }}>You were the <b style={{ color: "var(--text-pink)" }}>24th</b> fan to guess the album!</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, borderRadius: 18, background: "linear-gradient(135deg,var(--cream),#e4d2cc)", border: "2px solid var(--ink)", boxShadow: "var(--offset-lg)", padding: "16px 20px", margin: "16px 0 32px" }}>
        <span style={{ textAlign: "center", fontSize: 24, fontWeight: 700 }}>Yesterday's Album</span>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative", width: 136, height: 104, flex: "none" }}>
            <div style={{ position: "absolute", right: 0, top: 10, width: 84, height: 84 }}><div className="kp-vinyl is-spinning"><div className="kp-vinyl__spin"><div className="kp-vinyl__label"><img src={YESTERDAY.coverSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div></div><div className="kp-vinyl__light" /><div className="kp-vinyl__hole" /></div></div>
            <div style={{ position: "absolute", left: 0, top: 4, width: 96, height: 96, padding: 4, borderRadius: 9, background: "#1c1c1c", transform: "rotate(-3deg)", boxShadow: "0 5px 14px rgba(10,10,10,.25)", zIndex: 1 }}><div style={{ width: "100%", height: "100%", borderRadius: 6, overflow: "hidden" }}><img src={YESTERDAY.coverSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div></div>
          </div>
          <div style={{ minWidth: 0 }}><div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{YESTERDAY.title}</div><div style={{ fontSize: 14, marginTop: 4, color: "var(--text-muted)" }}>{YESTERDAY.subtitle}</div></div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        <StatTile icon="../../assets/icons/target.svg" value={attempts} label={attempts === 1 ? "Attempt" : "Attempts"} />
        <StatTile icon="../../assets/icons/ranking-fill.svg" value={24} label="Position" />
        <StatTile icon="../../assets/icons/trending-up.svg" value="91.40" label="Score" />
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}><RewardBanner isNew linkLabel="View your collections" href="#" /></div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
        <div className="kp-tilt-l"><PressButton size="lg" iconStart={<Icon name="copy" size={16} />} onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied!" : "Share Results"}</PressButton></div>
        <div className="kp-tilt-r"><IconButton variant="circle" label="Share on X"><img src="../../assets/icons/x-logo.svg" width="28" height="28" alt="" /></IconButton></div>
      </div>
      <div style={{ textAlign: "center", marginTop: 20 }}><button onClick={onCollections} className="kp-reward__link" style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "inherit", color: "var(--text-pink)" }}>Open Collections <Icon name="arrow-right" size={14} /></button></div>
    </div>
  );
}
Object.assign(window, { VictoryCard });
