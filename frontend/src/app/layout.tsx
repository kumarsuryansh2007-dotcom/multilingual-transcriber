import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multilingual Conversation Transcriber",
  description: "Audio-only multilingual conversation transcription with speaker diarization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
