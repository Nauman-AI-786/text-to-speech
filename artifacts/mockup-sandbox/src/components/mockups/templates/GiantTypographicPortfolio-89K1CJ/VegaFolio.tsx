import React from 'react';

export default function VegaFolio() {
  return (
    <div className="w-full h-full bg-white text-black overflow-hidden flex flex-col p-12 relative font-['Inter',sans-serif] antialiased box-border">
      {/* Top Nav */}
      <header className="flex justify-between items-start w-full text-[14px] font-bold uppercase tracking-[0.1em] z-20 relative">
        <div className="leading-tight">
          Jonah Vega <br />
          Design Engineer
        </div>
        <nav className="flex gap-16">
          <a href="#" className="hover:opacity-50 transition-opacity">Work</a>
          <a href="#" className="hover:opacity-50 transition-opacity">About</a>
          <a href="#" className="hover:opacity-50 transition-opacity border-b-2 border-black pb-1">Get in touch</a>
        </nav>
      </header>

      {/* Giant Typography */}
      <div className="absolute inset-0 flex flex-col justify-center px-12 pointer-events-none">
        <h1 className="text-[420px] leading-[0.74] font-black tracking-[-0.06em] uppercase flex flex-col justify-center h-full text-black">
          <span className="block text-left -ml-4">PORT</span>
          <span className="block text-right -mr-4">FOLIO</span>
        </h1>
      </div>

      {/* Bottom Info */}
      <footer className="mt-auto flex justify-between items-end w-full z-20 relative">
        <div className="uppercase text-[12px] font-bold tracking-[0.15em] leading-snug">
          Selected Work <br />
          &copy; 2031
        </div>
        
        <div className="text-[14px] font-semibold leading-relaxed text-justify max-w-[340px]">
          Jonah Vega is an independent design engineer based in San Francisco. Specializing in brutalist, type-driven digital experiences and high-contrast user interfaces for ambitious technology brands.
        </div>
      </footer>
    </div>
  );
}
