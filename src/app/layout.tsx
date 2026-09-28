import type { Metadata, Viewport } from "next";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-sans-kr/400.css";
import "@fontsource/noto-serif-kr/400.css";
import "@fontsource/ibm-plex-sans-jp/400.css";
import "@fontsource/noto-sans-sc/400.css";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const metadata: Metadata = { title: "Nocturne — 오늘 밤 운행", description: "공부 계획을 고요한 야간 열차 노선으로 바꾸는 로컬 우선 플래너", manifest: `${basePath}/manifest.webmanifest`, icons: { icon: `${basePath}/favicon.svg` } };
export const viewport: Viewport = { themeColor: "#070a10", colorScheme: "dark" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ko"><body>{children}</body></html>; }
