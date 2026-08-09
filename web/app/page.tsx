import data from "@/lib/models.json";
import { Nav } from "@/components/Chrome";
import { Hero } from "@/components/Hero";
import { Corpus, Measured, Problem, Solution } from "@/components/Sections";
import { Models } from "@/components/Models";
import { Business } from "@/components/Business";
import { Footer } from "@/components/Footer";

export default function Page() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero trained={data.trained_count} total={data.models.length} />
        <Problem />
        <Solution />
        <Measured />
        <Models />
        <Corpus />
        <Business />
      </main>
      <Footer />
    </>
  );
}
