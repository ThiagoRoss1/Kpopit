// Albums catalogue — AlbumsForm defaults (vinyl cover, year sticker, card dots).
function AlbumsScreen({ go, theme, toggle, flash }) {
  const { PuffTitle, PuffSearch, FilterButton, FilterMenu, AppliedChip, AlbumCard, EmptyState } = PP;
  const [q, setQ] = React.useState(""), [artist, setArtist] = React.useState(""), [menu, setMenu] = React.useState(null);
  const list = ALBUMS.filter(a => (!artist || a.artist === artist) && (a.name + " " + a.artist).toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => b.year - a.year);
  const artists = uniq(ALBUMS.map(a => a.artist));
  return (
    <div className="pp-wrap">
      <KitNav screen="albums" go={go} theme={theme} toggle={toggle} />
      <PuffTitle title="Albums" ko="앨범" count={ALBUMS.length + " albums · " + artists.length + " artists"} />
      <div className="pp-controls">
        <PuffSearch value={q} onChange={setQ} placeholder="Search an album or artist…" ariaLabel="Search albums or artists" />
        <FilterButton label={artist || "Artist"} minWidth="104px" active={!!artist} open={menu === "a"} onClick={() => setMenu(menu ? null : "a")}>
          <FilterMenu open={menu === "a"} title="ARTIST" onSelect={v => { setArtist(v); setMenu(null); }} options={[{ label: "All artists", value: "", selected: !artist, count: ALBUMS.length }, ...artists.map(x => ({ label: x, value: x, selected: artist === x, count: ALBUMS.filter(a => a.artist === x).length }))]} />
        </FilterButton>
      </div>
      <div className="pp-applied-row"><span>{list.length} albums</span>{artist ? <AppliedChip label={artist} onRemove={() => setArtist("")} /> : null}</div>
      {list.length ? <section aria-label="Albums catalogue" className="pp-grid">{list.map((a, i) => <AlbumCard key={a.id} index={i} name={a.name} artist={a.artist} type={a.type} year={a.year} img={a.img} onClick={() => flash("Album page is outside this kit.")} />)}</section>
        : <EmptyState kind="empty" title="No albums found." onAction={() => { setQ(""); setArtist(""); }} cta="Clear search & filters" />}
      <KitFooter right="Sample catalogue" />
    </div>
  );
}
window.AlbumsScreen = AlbumsScreen;
