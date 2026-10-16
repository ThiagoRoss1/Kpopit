// Stats modal — Modal title "Stats..." from PixelatedMode; content rows are representative (StatsContent not in reference source).
function StatsModal({ onClose }) {
  const { ModalShell, InfoRow, PressButton } = KP;
  const ic = (f) => <img src={`../../assets/icons/${f}.svg`} width="20" height="20" alt="" style={{ filter: "invert(1)" }} />;
  return (
    <ModalShell eyebrow="Your stats" title="Stats..." onClose={onClose} footer={<PressButton variant="outline" onClick={onClose}>Transfer data</PressButton>}>
      <InfoRow icon={<img src="../../assets/icons/fire-fill.svg" width="20" height="20" alt="" />} title="Current streak">5 days in a row. Come back tomorrow!</InfoRow>
      <InfoRow icon={ic("trophy")} title="Albums found">23 of 25 daily albums</InfoRow>
      <InfoRow icon={ic("target")} title="Average attempts">3.4 guesses per album</InfoRow>
    </ModalShell>
  );
}
Object.assign(window, { StatsModal });
