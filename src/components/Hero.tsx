import { Button } from "@/components/ui/button";
import { MessageCircle, Mountain } from "lucide-react";
import heroImage from "@/assets/hero-climbing.jpg";

const Hero = () => {
  const scrollToChat = () => {
    document.getElementById('chat-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-hero" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/20 backdrop-blur-sm border border-white/20 mb-6">
          <Mountain className="w-4 h-4 text-white" />
          <span className="text-sm font-medium text-white">Real-time climbing conditions</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
          Know before you go
        </h1>
        
        <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
          Chat with temps.rocks to get instant conditions for any climbing crag, 
          sector, or route worldwide
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            onClick={scrollToChat}
            className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-elevated transition-smooth text-lg px-8"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Start Chatting
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={scrollToChat}
            className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 transition-smooth text-lg px-8"
          >
            View Conditions
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white mb-2">100%</div>
            <div className="text-sm text-white/80">Free Forever</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white mb-2">Global</div>
            <div className="text-sm text-white/80">Any Crag</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white mb-2">Live</div>
            <div className="text-sm text-white/80">Real-time Data</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-1.5 bg-white/70 rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
