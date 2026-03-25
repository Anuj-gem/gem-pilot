export function Footer() {
  return (
    <footer className="border-t border-zinc-200 py-8 mt-auto bg-white">
      <div className="gem-container flex items-center justify-between text-sm text-zinc-400">
        <span>&copy; {new Date().getFullYear()} GEM. All rights reserved.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-zinc-600 transition-colors">Terms</a>
          <a href="#" className="hover:text-zinc-600 transition-colors">Privacy</a>
          <a href="#" className="hover:text-zinc-600 transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
