import { Button } from "@/components/ui/button";
import { Globe, Menu } from "lucide-react";

const Header = () => {
  return (
    <header className="w-full bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Globe className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold font-ui text-foreground">CantoneseScribe</h1>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-foreground hover:text-primary transition-colors font-ui">Features</a>
          <a href="#pricing" className="text-foreground hover:text-primary transition-colors font-ui">Pricing</a>
          <a href="#about" className="text-foreground hover:text-primary transition-colors font-ui">About</a>
        </nav>
        
        <div className="hidden md:flex items-center space-x-4">
          <Button variant="ghost" className="font-ui">
            Sign In
          </Button>
          <Button className="font-ui">
            Get Started
          </Button>
        </div>
        
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </div>
    </header>
  );
};

export default Header;