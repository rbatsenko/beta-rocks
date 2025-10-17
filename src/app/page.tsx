import ChatInterface from "@/components/ChatInterface";
import Features from "@/components/Features";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <ChatInterface />
      <Features />
      <Footer />
    </main>
  );
}
