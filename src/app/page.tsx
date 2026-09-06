import { listGuestMomentProperties } from "@/services/discovery";

export const revalidate = 60;

export default async function HomePage() {
  const environment = process.env.LH_ENVIRONMENT === "LIVE" ? "LIVE" : "DEMO";
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
        <a className="wordmark" href="#top" aria-label="Little Hut home">Little Hut</a>
        {environment !== "LIVE" ? <span className="environmentBadge">Preview</span> : null}
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">A stay starts with a feeling.</p>
        <h1>Book the Moment,<br />not the Property.</h1>
        <p className="heroCopy">
          Choose how you want the day to feel. We reveal only homes with current,
          property-specific proof that they can deliver it.
        </p>
      </section>

      <section className="momentStream" aria-label="Qualified Moments">
        {moments.length > 0 ? (
          moments.map((item) => (
            <article className="momentScene" key={`${item.propertyId}:${item.momentId}`}>
              <img src={item.heroUrl} alt={item.momentName} className="momentImage" />
              <div className="momentShade" />
              <div className="momentCopy">
                <p className="momentLabel">Moment</p>
                <h2>{item.momentName}</h2>
                <p>{item.momentPromise}</p>
                <div className="propertyReveal">
                  <span>Proven here</span>
                  <strong>{item.propertyName}</strong>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="truthEmpty" role="status">
            <p className="eyebrow">Nothing invented.</p>
            <h2>{discoveryUnavailable ? "Discovery is temporarily unavailable." : "No qualified Moments are published yet."}</h2>
            <p>
              A home appears here only after its Moment evidence, public imagery and live status have been verified.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
