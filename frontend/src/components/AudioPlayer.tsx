"use client";

import React from "react";

interface AudioPlayerProps {
  audioUrl: string | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onPlayStateChange: (playing: boolean) => void;
}

export function AudioPlayer({
  audioUrl,
  audioRef,
  onPlayStateChange,
}: AudioPlayerProps) {
  if (!audioUrl) return null;

  return (
    <audio
      ref={audioRef}
      src={audioUrl}
      controls
      onPlay={() => onPlayStateChange(true)}
      onPause={() => onPlayStateChange(false)}
      className="w-full h-10"
    />
  );
}
