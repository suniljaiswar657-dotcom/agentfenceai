import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "AGENTFENCE AI — Control Every Agent", description: "Security, governance and human oversight for autonomous AI agents." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
