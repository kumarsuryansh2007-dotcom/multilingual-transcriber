"use client";

import React, { useRef } from "react";
import { Upload, FileAudio, Trash2 } from "lucide-react";

const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/ogg",
  "audio/flac",
];

const ACCEPTED_EXTENSIONS = ".mp3,.wav,.m4a,.ogg,.flac";

interface AudioUploaderProps {
  audioFile: File | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  onValidationError: (message: string) => void;
}

export function AudioUploader({
  audioFile,
  onFileSelect,
  onFileClear,
  onValidationError,
}: AudioUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateAndSelect = (file: File) => {
    if (
      file.type.startsWith("video/") ||
      (!ACCEPTED_AUDIO_TYPES.includes(file.type) &&
        !file.name.match(/\.(mp3|wav|m4a|ogg|flac)$/i))
    ) {
      onValidationError(
        "Only audio files (.mp3, .wav, .m4a, .ogg, .flac) are supported. Video files are not allowed."
      );
      return;
    }
    onFileSelect(file);
  };

  if (!audioFile) {
    return (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) validateAndSelect(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 hover:border-[#10594A] rounded-xl p-10 text-center cursor-pointer transition-colors bg-slate-50/50"
      >
        <Upload className="w-10 h-10 text-[#10594A] mx-auto mb-3" />
        <p className="text-base font-semibold text-slate-800">
          Drop your audio file here, or click to browse
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Supports MP3, WAV, M4A, OGG, and FLAC (Video files are disabled)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndSelect(file);
          }}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2.5 bg-emerald-100 text-[#10594A] rounded-lg">
          <FileAudio className="w-6 h-6" />
        </div>
        <div className="truncate">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {audioFile.name}
          </p>
          <p className="text-xs text-slate-500">
            {(audioFile.size / (1024 * 1024)).toFixed(2)} MB •{" "}
            {audioFile.type || "Audio"}
          </p>
        </div>
      </div>
      <button
        onClick={() => {
          if (fileInputRef.current) fileInputRef.current.value = "";
          onFileClear();
        }}
        className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
        title="Remove audio file"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}
