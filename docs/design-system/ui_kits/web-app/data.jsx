// Shared data + helpers for the KpopIt web-app UI kit.
// Covers and idol photos load from the CDN: https://cdn.kpopit.net/images/{albums|idols}/<name>.webp
const KP = window.KpopItDesignSystem_07fd81;
const IMG = "https://cdn.kpopit.net/images/";
const album = (f) => IMG + "albums/" + encodeURIComponent(f) + ".webp";
const idol = (f) => IMG + "idols/" + encodeURIComponent(f) + ".webp";
const ALBUMS = [
  { title: "After Like", subtitle: "IVE", file: "after_like", year: 2022 },
  { title: "2 : LOVE", subtitle: "STAYC", file: "2_love" },
  { title: "Ad Mare", subtitle: "NMIXX", file: "ad_mare" },
  { title: "2", subtitle: "(G)I-DLE", file: "2" },
  { title: "&TWICE", subtitle: "TWICE", file: "&twice" },
  { title: "[12:00]", subtitle: "LOONA", file: "[12_00]" },
  { title: "[#]", subtitle: "LOONA", file: "[hash]" },
  { title: "[&]", subtitle: "LOONA", file: "[&]" },
  { title: "[+ +]", subtitle: "LOONA", file: "[+_+]" },
  { title: "224", subtitle: "KISS OF LIFE", file: "224" },
  { title: "A Montage Of ( )", subtitle: "VIVIZ", file: "a_montage_of" },
  { title: "Against The World", subtitle: "Kep1er", file: "against_the_world" },
  { title: "2NE1", subtitle: "2NE1", file: "2ne1" },
  { title: "2NE1 2nd Mini Album", subtitle: "2NE1", file: "2ne1_2nd_mini_album" },
].map((a) => ({ ...a, coverSrc: album(a.file) }));
const ANSWER = ALBUMS[0];
const YESTERDAY = ALBUMS[1];

// Pixelates a real cover: draw at (size/block) px, upscale with smoothing off.
const imgCache = {};
function loadImg(src) {
  if (!imgCache[src]) imgCache[src] = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  return imgCache[src];
}
function PixelCover({ src, block = 40, size = 360, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    let live = true;
    loadImg(src).then((img) => {
      const c = ref.current; if (!live || !c || !img) return;
      const n = Math.max(1, Math.round(size / Math.max(1, block)));
      const t = document.createElement("canvas"); t.width = n; t.height = n;
      t.getContext("2d").drawImage(img, 0, 0, n, n);
      c.width = size; c.height = size;
      const ctx = c.getContext("2d"); ctx.imageSmoothingEnabled = block <= 1;
      ctx.drawImage(t, 0, 0, size, size);
    });
    return () => { live = false; };
  }, [src, block, size]);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block", background: "#1c1c1c", ...style }} />;
}
const BLOCKS = [48, 36, 28, 22, 16, 12, 9, 6, 4];

Object.assign(window, { KP, ALBUMS, ANSWER, YESTERDAY, PixelCover, BLOCKS, idol, album });
