"use client";

import Image from "next/image";
import { typologyPhotosFor } from "@/lib/brand-images";
import { TYPOLOGIES, type TypologyId } from "@/lib/typologies";

interface Props {
  typology: TypologyId;
  /** Subtype id, used to pick a subtype-specific photo set when curated. */
  subtype?: string | null;
}

export default function PhotoCollage({ typology, subtype }: Props) {
  const label = TYPOLOGIES[typology].label;

  // Fixed 1:1 set of three curated photos for the selected model (P1/P2).
  // No rotation, no random fallback — the photos always represent the
  // model the user picked.
  const imgs = typologyPhotosFor(typology, subtype);

  return (
    <div
      key={typology}
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 14,
        minHeight: 0,
      }}
    >
      <div
        className="photo eh-photo-fade"
        style={{ gridRow: "1 / span 2", borderRadius: 18, overflow: "hidden" }}
      >
        <Image
          src={imgs[0]}
          alt={`${label} home, Easy Housing project`}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          style={{ objectFit: "cover" }}
          priority
        />
        <div className="photo__label">{label} · Easy Housing project</div>
      </div>
      <div
        className="photo eh-photo-fade"
        style={{ borderRadius: 18, overflow: "hidden" }}
      >
        <Image
          src={imgs[1]}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          style={{ objectFit: "cover" }}
        />
      </div>
      <div
        className="photo eh-photo-fade"
        style={{ borderRadius: 18, overflow: "hidden" }}
      >
        <Image
          src={imgs[2]}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          style={{ objectFit: "cover" }}
        />
      </div>
    </div>
  );
}
