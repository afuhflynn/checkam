import { Footer } from "../../components/footer";
import { Header } from "../../components/header";
import { WhatsAppFloatButton } from "../../components/whatsapp/float-button";

// Marketing shell: every non chat page keeps the header, content, footer.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      {/* Mounted once here rather than per page, so no page can forget it. */}
      <WhatsAppFloatButton />
    </>
  );
}
