import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TEventImage } from "../../reducers/eventImages/eventImagesAPI";

type EventImageCarouselProps = {
  images: TEventImage[];
};

// Renders ONLY event_images rows. The hero image (events.image_url) is a
// separate static element on the details surface and never reaches this
// component — see eventor-event-images-frontend-plan.md §2.
export default function EventImageCarousel({ images }: EventImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Nothing to show.
  if (images.length === 0) return null;

  // One photo doesn't justify the Embla machinery.
  if (images.length === 1) {
    return (
      <img
        src={images[0].url}
        alt=""
        className="w-full h-48 object-cover rounded-box border border-base-300"
      />
    );
  }

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-box border border-base-300" ref={emblaRef}>
        <div className="flex">
          {images.map((image) => (
            <div key={image.id} className="flex-[0_0_100%] min-w-0">
              <img src={image.url} alt="" className="w-full h-48 object-cover" />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => emblaApi?.scrollPrev()}
        className="btn btn-sm btn-circle absolute left-2 top-1/2 -translate-y-1/2"
        aria-label="Previous photo"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        onClick={() => emblaApi?.scrollNext()}
        className="btn btn-sm btn-circle absolute right-2 top-1/2 -translate-y-1/2"
        aria-label="Next photo"
      >
        <ChevronRight size={16} />
      </button>

      <div className="flex justify-center gap-1.5 mt-2">
        {images.map((image, i) => (
          <button
            key={image.id}
            type="button"
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={`Go to photo ${i + 1}`}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === selected ? "bg-primary" : "bg-base-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
