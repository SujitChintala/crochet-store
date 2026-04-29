"use client";

import Image from "next/image";
import { type UIEvent, useRef, useState } from "react";

type ProductGalleryProps = {
  images: string[];
  productName: string;
};

function clampIndex(index: number, count: number) {
  return Math.min(Math.max(index, 0), Math.max(count - 1, 0));
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const galleryImages = images.length > 0 ? images : ["/product-placeholder.svg"];
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const scrollToImage = (index: number) => {
    const nextIndex = clampIndex(index, galleryImages.length);
    setActiveIndex(nextIndex);

    if (!carouselRef.current) {
      return;
    }

    carouselRef.current.scrollTo({
      left: carouselRef.current.clientWidth * nextIndex,
      behavior: "smooth",
    });
  };

  const handleCarouselScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;

    if (!element.clientWidth) {
      return;
    }

    const nextIndex = clampIndex(Math.round(element.scrollLeft / element.clientWidth), galleryImages.length);
    setActiveIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
  };

  return (
    <div className="space-y-3">
      <div
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        className="flex max-w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-2xl bg-zinc-100 scroll-smooth"
      >
        {galleryImages.map((image, index) => (
          <div key={`${image}-${index}`} className="relative aspect-square min-w-full snap-center overflow-hidden">
            <Image
              src={image || "/product-placeholder.svg"}
              alt={index === 0 ? productName : `${productName} image ${index + 1}`}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      {galleryImages.length > 1 ? (
        <div className="flex flex-wrap justify-center gap-2">
          {galleryImages.map((image, index) => (
            <button
              key={`${image}-thumb-${index}`}
              type="button"
              aria-label={`Open image ${index + 1}`}
              onClick={() => scrollToImage(index)}
              className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 ${
                activeIndex === index ? "border-zinc-900" : "border-transparent"
              }`}
            >
              <Image
                src={image || "/product-placeholder.svg"}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                unoptimized
                className="object-cover"
                sizes="72px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
