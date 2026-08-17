import React from 'react';

/**
 * Two-tone vector artwork for the dashboard tool cards.
 *
 * These are drawn to be read at 64 px inside a 96 px tile, so every shape is chunky,
 * there is no lettering, and each piece uses at most a handful of elements. Colours are
 * passed in rather than baked in, so a card's artwork always matches its accent colour.
 */
export interface ArtProps {
  /** Strong colour: outlines and focal details. */
  accent: string;
  /** Pale wash: fills. */
  tint: string;
  className?: string;
}

const Frame: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <svg viewBox="0 0 96 96" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

/** Dilution — stock beaker with a drop of solvent going in. */
export const DilutionArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <path d="M28 32h40v28a20 20 0 0 1-40 0z" fill={tint} />
    <path d="M28 52h40v8a20 20 0 0 1-40 0z" fill={accent} opacity="0.55" />
    <path d="M28 32h40v28a20 20 0 0 1-40 0z" stroke={accent} strokeWidth="4" />
    <path d="M22 32h52" stroke={accent} strokeWidth="4" />
    <path d="M48 4c0 0-7 10-7 15a7 7 0 0 0 14 0c0-5-7-15-7-15z" fill={accent} />
  </Frame>
);

/** Molarity — flask of dissolved solute. */
export const MolarityArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <path d="M41 16v18L25 66a7 7 0 0 0 6 11h34a7 7 0 0 0 6-11L55 34V16" fill={tint} />
    <path d="M31 56h34l6 10a7 7 0 0 1-6 11H31a7 7 0 0 1-6-11z" fill={accent} opacity="0.5" />
    <path d="M41 16v18L25 66a7 7 0 0 0 6 11h34a7 7 0 0 0 6-11L55 34V16" stroke={accent} strokeWidth="4" />
    <path d="M37 16h22" stroke={accent} strokeWidth="4" />
    <circle cx="41" cy="64" r="3.5" fill={accent} />
    <circle cx="54" cy="69" r="3.5" fill={accent} />
    <circle cx="49" cy="57" r="3" fill={accent} />
  </Frame>
);

/** pH — the acid-to-base scale as a stepped bar chart, with a drop of sample. */
export const PhArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <rect x="16" y="56" width="12" height="22" rx="4" fill={tint} stroke={accent} strokeWidth="3.5" />
    <rect x="32" y="46" width="12" height="32" rx="4" fill={tint} stroke={accent} strokeWidth="3.5" />
    <rect x="48" y="36" width="12" height="42" rx="4" fill={accent} />
    <rect x="64" y="26" width="12" height="52" rx="4" fill={tint} stroke={accent} strokeWidth="3.5" />
    <path d="M28 14c0 0-6 8-6 12a6 6 0 0 0 12 0c0-4-6-12-6-12z" fill={accent} />
  </Frame>
);

/** Protein concentration — cuvette in a beam of light (Beer-Lambert). */
export const ProteinArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <path d="M12 48h18" stroke={accent} strokeWidth="4" />
    <path d="M66 48h18" stroke={accent} strokeWidth="4" />
    <path d="M78 42l6 6-6 6" stroke={accent} strokeWidth="4" />
    <rect x="34" y="20" width="28" height="56" rx="6" fill={tint} stroke={accent} strokeWidth="4" />
    <path d="M34 46h28v24a6 6 0 0 1-6 6H40a6 6 0 0 1-6-6z" fill={accent} opacity="0.55" />
  </Frame>
);

/** Percent solution — the percent sign, with a measured beaker. */
export const PercentArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <circle cx="32" cy="30" r="12" fill={tint} stroke={accent} strokeWidth="4" />
    <circle cx="64" cy="66" r="12" fill={accent} />
    <path d="M70 24L26 72" stroke={accent} strokeWidth="4" />
  </Frame>
);

/** Protocols — a clipboard of checked-off steps. */
export const ProtocolsArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <rect x="22" y="18" width="52" height="62" rx="8" fill={tint} stroke={accent} strokeWidth="4" />
    <rect x="38" y="10" width="20" height="14" rx="5" fill={accent} />
    <path d="M32 42l5 5 9-9" stroke={accent} strokeWidth="4" />
    <path d="M54 42h12" stroke={accent} strokeWidth="4" />
    <path d="M32 62l5 5 9-9" stroke={accent} strokeWidth="4" />
    <path d="M54 62h12" stroke={accent} strokeWidth="4" />
  </Frame>
);

/** Oops — something went wrong, and it is recoverable. */
export const OopsArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <path d="M48 16l32 58a4 4 0 0 1-3.5 6h-57A4 4 0 0 1 16 74z" fill={tint} stroke={accent} strokeWidth="4" />
    <path d="M48 40v18" stroke={accent} strokeWidth="5" />
    <circle cx="48" cy="68" r="3.5" fill={accent} />
  </Frame>
);

/** Primers — a duplex with primers annealed to each strand. */
export const PrimerArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <path d="M14 34q17-14 34 0t34 0" stroke={tint} strokeWidth="7" />
    <path d="M14 62q17 14 34 0t34 0" stroke={tint} strokeWidth="7" />
    <path d="M14 34q17-14 34 0t34 0" stroke={accent} strokeWidth="4" />
    <path d="M14 62q17 14 34 0t34 0" stroke={accent} strokeWidth="4" />
    <path d="M30 30v34M48 41v14M66 30v34" stroke={accent} strokeWidth="3.5" opacity="0.65" />
  </Frame>
);

/** SDS-PAGE — a run gel with a ladder and two sample lanes. */
export const GelArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <rect x="18" y="14" width="60" height="68" rx="7" fill={tint} stroke={accent} strokeWidth="4" />
    <rect x="26" y="22" width="12" height="5" rx="2" fill={accent} />
    <rect x="42" y="22" width="12" height="5" rx="2" fill={accent} />
    <rect x="58" y="22" width="12" height="5" rx="2" fill={accent} />
    <rect x="26" y="38" width="12" height="5" rx="2.5" fill={accent} />
    <rect x="26" y="52" width="12" height="5" rx="2.5" fill={accent} />
    <rect x="26" y="66" width="12" height="5" rx="2.5" fill={accent} />
    <rect x="42" y="44" width="12" height="5" rx="2.5" fill={accent} opacity="0.7" />
    <rect x="58" y="60" width="12" height="5" rx="2.5" fill={accent} opacity="0.7" />
  </Frame>
);

/** Cell counting — the hemocytometer grid with cells in it. */
export const CellArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <rect x="18" y="18" width="60" height="60" rx="8" fill={tint} stroke={accent} strokeWidth="4" />
    <path d="M38 18v60M58 18v60M18 38h60M18 58h60" stroke={accent} strokeWidth="3" opacity="0.5" />
    <circle cx="28" cy="29" r="5" fill={accent} />
    <circle cx="48" cy="48" r="5" fill={accent} />
    <circle cx="67" cy="30" r="4" fill={accent} opacity="0.6" />
    <circle cx="30" cy="67" r="4" fill={accent} opacity="0.6" />
    <circle cx="67" cy="66" r="5" fill={accent} />
  </Frame>
);

/** Logarithm — a log curve on axes. */
export const LogArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <path d="M26 72c14 0 10-38 50-44v44z" fill={tint} />
    <path d="M22 18v54a4 4 0 0 0 4 4h54" stroke={accent} strokeWidth="4.5" />
    <path d="M26 72c14 0 10-38 50-44" stroke={accent} strokeWidth="4.5" />
  </Frame>
);

/** Lab timer — a stopwatch. */
export const TimerArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <circle cx="48" cy="56" r="26" fill={tint} stroke={accent} strokeWidth="4" />
    <rect x="40" y="12" width="16" height="10" rx="4" fill={accent} />
    <path d="M48 22v6" stroke={accent} strokeWidth="4" />
    <path d="M70 34l6-6" stroke={accent} strokeWidth="4" />
    <path d="M48 56V40M48 56h12" stroke={accent} strokeWidth="4.5" />
  </Frame>
);

/** FASTA — a sequence file. */
export const FastaArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <path d="M28 12h26l16 16v52a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6V18a6 6 0 0 1 6-6z" fill={tint} stroke={accent} strokeWidth="4" />
    <path d="M54 12v16h16" stroke={accent} strokeWidth="4" />
    <path d="M32 44h20M32 56h30M32 68h22" stroke={accent} strokeWidth="4" />
  </Frame>
);

/** Restriction digest — a duplex about to be cut. */
export const ScissorsArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <rect x="8" y="26" width="34" height="18" rx="9" fill={tint} stroke={accent} strokeWidth="4" />
    <rect x="54" y="26" width="34" height="18" rx="9" fill={tint} stroke={accent} strokeWidth="4" />
    <path d="M20 26v18M76 26v18" stroke={accent} strokeWidth="3.5" opacity="0.6" />
    <path d="M34 73L62 46M62 73L34 46" stroke={accent} strokeWidth="4" />
    <circle cx="31" cy="77" r="6.5" fill="none" stroke={accent} strokeWidth="4" />
    <circle cx="65" cy="77" r="6.5" fill="none" stroke={accent} strokeWidth="4" />
  </Frame>
);

/** AI illustrator — a generated picture. */
export const IllustratorArt: React.FC<ArtProps> = ({ accent, tint, className }) => (
  <Frame className={className}>
    <rect x="14" y="24" width="60" height="48" rx="8" fill={tint} stroke={accent} strokeWidth="4" />
    <circle cx="31" cy="40" r="5" fill={accent} />
    <path d="M18 66l14-15 9 9 11-13 20 21z" fill={accent} opacity="0.7" />
    <path d="M76 10l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill={accent} />
  </Frame>
);

/** The brand mark: a flask whose body is the "S" of Sidlab. */
export const BrandMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="48" height="48" rx="13" fill="#0f172a" />
    <path d="M20 11v8L12.5 33a4 4 0 0 0 3.5 6h16a4 4 0 0 0 3.5-6L28 19v-8" stroke="#ec4899" strokeWidth="3.2" />
    <path d="M17.5 11h13" stroke="#ec4899" strokeWidth="3.2" />
    <path d="M15.5 29h17l3 5a4 4 0 0 1-3.5 5H16a4 4 0 0 1-3.5-5z" fill="#ec4899" />
  </svg>
);
