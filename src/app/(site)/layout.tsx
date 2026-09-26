import { Footer } from "../../components/footer";
import { Header } from "../../components/header";

// Marketing shell: every non chat page keeps the header, content, footer.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
