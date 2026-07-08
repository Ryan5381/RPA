import logo from "@/assets/logo.png";

export const Navbar = () => {
  return (
    <header className=" top-0 z-50 w-full border-b bg-background/95 backdrop-blur pt-2 pb-1">
      <div className="container flex min-h-16 items-center gap-4 px-4 md:gap-6 md:px-6">
        <a className="mr-4 flex items-center gap-2" href="/">
          <img src={logo} alt="logo" className="w-25 h-auto object-contain" />
          <p className="text-xl font-bold tracking-wider bg-linear-to-r from-slate-50 via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
            智慧預約與購票自動化系統
          </p>
        </a>
      </div>
    </header>
  );
};
