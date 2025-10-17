import { Mountain } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t py-12 px-6 bg-card">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Mountain className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">temps.rocks</span>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Free climbing conditions for everyone. Built with ❤️ for the climbing community.
          </p>
          
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-smooth">
              About
            </a>
            <a href="#" className="hover:text-primary transition-smooth">
              Privacy
            </a>
            <a href="#" className="hover:text-primary transition-smooth">
              GitHub
            </a>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t text-center text-xs text-muted-foreground">
          <p>Data from Open-Meteo and OpenBeta. Community-powered reports.</p>
          <p className="mt-2">© 2025 temps.rocks. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
