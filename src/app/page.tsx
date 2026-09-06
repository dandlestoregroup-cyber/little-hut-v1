import Link from "next/link";
import { BookingForm } from "@/components/BookingForm";
import { getRuntimeConfig } from "@/lib/env";
import { listGuestMomentProperties } from "@/services/discovery";

export const revalidate = 60;

const momentLanguage = [
  {
    name: "Slow Morning",
    time: "07:14",
    copy: "Curtains open. Coffee stays hot. Nobody needs to rush the day into becoming something.",
    tone: "dawn",
  },
  {
    name: "Barefoot Afternoon",
    time: "14:38",
    copy: "Wet hair, cold fruit, a door left open to the outside. The house disappears into the afternoon.",
    tone: "salt",
  },
  {
    name: "Golden Dinner",
    time: "18:21",
    copy: "One table, the last warm light and enough time for dinner to become the whole evening.",
    tone: "gold",
  },
  {
    name: "Quiet Reset",
    time: "16:05",
    copy: "A chair worth staying in. A view with nothing urgent inside it. A little distance from everything else.",
    tone: "stone",
  },
  {
    name: "Saltwater Hour",
    time: "11:47",
    copy: "Swim before lunch. Dry in the sun. Return only when the water stops calling you back.",
    tone: "water",
  },
  {
    name: "Afterglow",
    time: "21:12",
    copy: "Lights low, air still warm, conversations with nowhere else to be.",
    tone: "night",
  },
] as const;

function propertyFacts(item: Awaited<ReturnType<typeof listGuestMomentProperties>>[number]) {
  return [
    item.locationLabel,
    item.maxGuests ? `Up to ${item.maxGuests}` : null,
    item.bedrooms !== undefined ? `${item.bedrooms} bedroom${item.bedrooms === 1 ? "" : "s"}` : null,
    item.bathrooms !== undefined ? `${item.bathrooms} bath${item.bathrooms === 1 ? "" : "s"}` : null,
  ].filter(Boolean) as string[];
}

export default async function HomePage() {
  const config = getRuntimeConfig();
  let moments = [] as Awaited<ReturnType<typeof listGuestMomentProperties>>;
  let discoveryUnavailable = false;

  try {
    moments = await listGuestMomentProperties();
  } catch {
    discoveryUnavailable = true;
  }

  return (
    <main>
      <header className="siteHeader">
        <Link className="wordmark" href="#top" aria-label="Little Hut home">Little Hut</Link>
        <nav className="siteNav" aria-label="Primary navigation">
          <a href="#moments">Moments</a>
          <a href="#proof">How it works</a>
          <Link href="/auth">Sign in</Link>
        </nav>
        {config.environment !== "LIVE" ? <span className="environmentBadge">Editorial preview</span> : null}
      </header>

      <section className="hero" id="top">
        <div className="heroKicker">
          <span>Little Hut</span>
          <span>Stays, selected by feeling</span>
        </div>
        <h1>Book the Moment,<br />not the Property.</h1>
        <div className="heroBottom">
          <p className="heroCopy">
            Start with the day you want to remember. A home is revealed only when Little Hut has current, property-specific proof that it can deliver that Moment.
          </p>
          <a className="textLink" href="#moments">Find your Moment <span aria-hidden>↓</span></a>
        </div>
      </section>

      <section className="proofRail" id="proof" aria-label="Little Hut verification chain">
        <div><span>01</span><strong>Choose the feeling</strong><p>Intent comes before inventory.</p></div>
        <div><span>02</span><strong>See only proof</strong><p>No property is attached to a Moment without verified evidence.</p></div>
        <div><span>03</span><strong>Verify the stay</strong><p>Availability, rate, readiness and risk are checked again for your dates.</p></div>
        <div><span>04</span><strong>Request with confidence</strong><p>Mastermind recommends, blocks or sends the case to a human.</p></div>
      </section>

      <section className="momentLanguage" id="moments" aria-labelledby="moment-language-title">
        <header className="sectionIntro">
          <p className="eyebrow">The Moment language</p>
          <h2 id="moment-language-title">How do you want the day to feel?</h2>
          <p>These are experience directions, not property claims. Homes enter them only after evidence review.</p>
        </header>
        <div className="editorialMoments">
          {momentLanguage.map((moment, index) => (
            <article className={`editorialMoment tone-${moment.tone}`} key={moment.name}>
              <div className="editorialMomentNumber">0{index + 1}</div>
              <div className="editorialMomentTime">{moment.time}</div>
              <div className="editorialMomentCopy">
                <p>Moment</p>
                <h3>{moment.name}</h3>
                <span>{moment.copy}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="verifiedSection" aria-labelledby="verified-title">
        <header className="sectionIntro sectionIntroDark">
          <p className="eyebrow">Verified now</p>
          <h2 id="verified-title">Homes earn their place here.</h2>
          <p>Nothing below is populated from a demo fixture or a marketing guess.</p>
        </header>

        <div className="momentStream" aria-label="Qualified Moments">
          {moments.length > 0 ? (
            moments.map((item) => {
              const facts = propertyFacts(item);
              return (
                <article className="momentScene" key={`${item.propertyId}:${item.momentId}`}>
                  <img src={item.heroUrl} alt={`${item.momentName} at ${item.propertyName}`} className="momentImage" />
                  <div className="momentShade" />
                  <div className="momentCopy">
                    <div className="momentProofTag">Evidence qualified · readiness current</div>
                    <p className="momentLabel">Moment</p>
                    <h2>{item.momentName}</h2>
                    <p>{item.momentPromise}</p>
                    <div className="propertyReveal">
                      <div>
                        <span>Revealed home</span>
                        <strong>{item.propertyName}</strong>
                        {item.shortDescription ? <p>{item.shortDescription}</p> : null}
                      </div>
                      {facts.length ? <ul>{facts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : null}
                    </div>
                    <BookingForm propertyId={item.propertyId} momentId={item.momentId} propertyName={item.propertyName} />
                  </div>
                </article>
              );
            })
          ) : (
            <div className="truthEmpty" role="status">
              <p className="eyebrow">Nothing invented.</p>
              <h2>{discoveryUnavailable ? "Verified discovery is temporarily unavailable." : "No home has cleared every publishing gate yet."}</h2>
              <p>
                {config.environment === "LIVE"
                  ? "Little Hut will publish a home only after current Moment evidence, public-safe imagery, operational readiness and material-risk checks all pass."
                  : "This preview intentionally contains no fake homes. Connect the dedicated database and qualify the first real property to make this section come alive."}
              </p>
              <div className="emptyActions">
                <Link href="/auth">Enter the workspace</Link>
                <a href="#proof">Review the proof chain</a>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="siteFooter">
        <div>
          <span className="wordmark">Little Hut</span>
          <p>A small collection of stays chosen for the moments they can genuinely deliver.</p>
        </div>
        <div className="footerTruth">
          <span>{config.environment}</span>
          <span>Evidence before promise</span>
          <Link href="/workspace">Workspace</Link>
        </div>
      </footer>
    </main>
  );
}
