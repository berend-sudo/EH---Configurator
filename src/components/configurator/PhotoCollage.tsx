"use client";

import Image from "next/image";
import { typologyPhotosFor } from "@/lib/brand-images";
import { TYPOLOGIES, type TypologyId } from "@/lib/typologies";

interface Props {
  typology: TypologyId;
  /** Subtype id, used to pick a subtype-specific photo set when curated. */
  subtype?: string | null;
  /** Bedroom count, used to pick the closest model-specific photo set. */
  bedrooms?: number | null;
}

export default function PhotoCollage({ typology, subtype, bedrooms }: Props) {
  const label = TYPOLOGIES[typology].label;

  // Fixed 1:1 set of three curated photos for the selected model (P1/P2).
  // No rotation, no random fallback — the photos always represent the
  // model the user picked (subtype + bedroom count).
  const imgs = typologyPhotosFor(typology, subtype, bedrooms);

  return (
    <div key={typology} className="eh-photo-collage">
      <div
        className="photo eh-photo-fade eh-photo-collage__hero"
      >
        <Image
          src={imgs[0]}
          alt={`${label} home, Easy Housing project`}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          quality={65}
          style={{ objectFit: "cover" }}
        />
        <div className="photo__label">{label} · Easy Housing project</div>
      </div>
      <div className="photo eh-photo-fade eh-photo-collage__thumb">
        <Image
          src={imgs[1]}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, 100vw"
          quality={60}
          loading="lazy"
          style={{ objectFit: "cover" }}
        />
      </div>
      <div className="photo eh-photo-fade eh-photo-collage__thumb">
        <Image
          src={imgs[2]}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, 100vw"
          quality={60}
          loading="lazy"
          style={{ objectFit: "cover" }}
        />
      </div>
    </div>
  );
}
