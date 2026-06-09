"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { randomTypologyPhotos, typologyPhoto } from "@/lib/brand-images";
import { TYPOLOGIES, type TypologyId } from "@/lib/typologies";

interface Props {
  typology: TypologyId;
}

export default function PhotoCollage({ typology }: Props) {
  const label = TYPOLOGIES[typology].label;

  // Start from the deterministic first three shots so SSR and the first
  // client render agree (no hydration mismatch), then swap to a random
  // distinct trio on mount and whenever the typology changes.
  const [imgs, setImgs] = useState<string[]>(() => [
    typologyPhoto(typology, 0),
    typologyPhoto(typology, 1),
    typologyPhoto(typology, 2),
  ]);
  useEffect(() => {
    setImgs(randomTypologyPhotos(typology, 3));
  }, [typology]);

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
          quality={65}
          style={{ objectFit: "cover" }}
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
          quality={60}
          loading="lazy"
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
          quality={60}
          loading="lazy"
          style={{ objectFit: "cover" }}
        />
      </div>
    </div>
  );
}
