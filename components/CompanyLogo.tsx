"use client";

import { useState } from "react";

interface CompanyLogoProps {
  src: string;
  alt: string;
  className?: string;
}

export default function CompanyLogo({
  src,
  alt,
  className = "w-4 h-4 rounded-full object-contain",
}: CompanyLogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
