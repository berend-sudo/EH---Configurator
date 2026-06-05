import Image from "next/image";
import { typologyPhoto } from "@/lib/brand-images";
import { TYPOLOGIES, type TypologyId } from "@/lib/typologies";

interface Props {
  typology: TypologyId;
}

export default function PhotoCollage({ typology }: Props) {
  const label = TYPOLOGIES[typology].label;
  // key on typology so React mounts a fresh set of images on switch,
  // triggering the .eh-photo-fade keyframe defined in globals.css.
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
          src={typologyPhoto(typology, 0)}
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
          src={typologyPhoto(typology, 1)}
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
          src={typologyPhoto(typology, 2)}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          style={{ objectFit: "cover" }}
        />
      </div>
    </div>
  );
}
