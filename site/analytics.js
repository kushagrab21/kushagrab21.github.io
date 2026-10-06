// Visitor analytics (Google Analytics 4). Off until MEASUREMENT_ID is set.
// Counts visits, where people came from, country, device, and which stations and films they reach. It never identifies a person.
// Pages inside the stations call parent.__track(name, params), so their events land in the same report.
export const MEASUREMENT_ID = 'G-MDNTL2C1WB';   // e.g. 'G-ABC123XYZ', from analytics.google.com → Admin → Data streams

const on = /^G-[A-Z0-9]+$/.test(MEASUREMENT_ID) && !/^(127\.|localhost)/.test(location.hostname);   // never counts local previews

if (on) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, { send_page_view: false });
  const s = document.createElement('script'); s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.append(s);
}

export function track(name, params = {}) { if (on) gtag('event', name, params); }

// A station counts as a page of its own, so the report shows how far along the line people ride.
export function stationView(id, title) {
  if (!on) return;
  gtag('event', 'page_view', { page_title: title, page_location: `${location.origin}${location.pathname}#${id}`, page_path: `${location.pathname}#${id}` });
}

window.__track = track;
