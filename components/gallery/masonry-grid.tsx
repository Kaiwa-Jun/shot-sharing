"use client";

import Masonry from "react-masonry-css";
import { PhotoCard, PhotoCardProps } from "./photo-card";
import "./masonry-grid.css";

interface MasonryGridProps {
  photos: PhotoCardProps[];
}

export function MasonryGrid({ photos }: MasonryGridProps) {
  const breakpointColumns = {
    default: 2, // デフォルト（スマホ）: 2列
    640: 2, // スマホ: 2列
    1024: 3, // タブレット: 3列
    1280: 4, // デスクトップ: 4列
  };

  return (
    <Masonry
      breakpointCols={breakpointColumns}
      className="masonry-grid"
      columnClassName="masonry-grid_column"
    >
      {photos.map((photo) => (
        <PhotoCard key={photo.id} {...photo} />
      ))}
    </Masonry>
  );
}
