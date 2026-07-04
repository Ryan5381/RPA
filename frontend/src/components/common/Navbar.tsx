import logo from "@/assets/logo.png";

export const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur pt-2 pb-1">
      <div className="container flex min-h-16 items-center gap-4 px-4 md:gap-6 md:px-6">
        <a className="mr-4 flex items-center" href="/">
          <img src={logo} alt="logo" className="w-40 h-auto object-contain" />
        </a>
      </div>
    </header>
  );
};
