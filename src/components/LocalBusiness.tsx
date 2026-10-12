/** Structured data for search engines: who and where the restaurant is (from the About page). */
const data = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: 'Hearth & Bean',
  description:
    'A neighbourhood restaurant, roastery and bakery on Walcot Street, Bath, with a wood-fired kitchen.',
  telephone: '+441632960418',
  email: 'hello@hearthandbean.co.uk',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'The Old Ironworks, Walcot Street',
    addressLocality: 'Bath',
    postalCode: 'BA1 5BG',
    addressCountry: 'GB',
  },
  servesCuisine: ['British', 'Coffee', 'Bakery'],
  acceptsReservations: true,
};

export default function LocalBusiness() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
