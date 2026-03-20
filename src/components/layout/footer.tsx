export function Footer() {
  return (
    <footer className="border-t border-gem-border py-8 mt-auto">
      <div className="gem-container flex items-center justify-between text-sm text-gem-text-muted">
        <span>&copy; {new Date().getFullYear()} GEM. All rights reserved.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-gem-text-secondary transition-colors">Terms</a>
          <a href="#" className="hover:text-gem-text-secondary transition-colors">Privacy</a>
          <a href="#" className="hover:text-gem-text-secondary transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
