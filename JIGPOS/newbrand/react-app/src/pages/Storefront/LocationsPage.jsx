// P37 — Locations page: hero with badge+search, province filter, rich location cards
import { useState, useMemo } from 'react';

const LOCATIONS = [
  { name: 'Ormonde HQ', subtitle: 'Johannesburg South, Gauteng', province: 'Gauteng', type: 'hq', address: '123 Main Road, Ormonde, Johannesburg South, 2091', phone: '+27 11 123 4567', email: 'ormonde@jig.cleva-ai.co.za', medical: true, hours: [['Mon-Sat', '9:00 - 17:00'], ['Sun', 'Closed']] },
  { name: 'Spruitview', subtitle: 'Ekurhuleni, Gauteng', province: 'Gauteng', type: 'retail', address: '45 Spruitview Avenue, Ekurhuleni, 1570', phone: '+27 11 234 5678', email: 'spruitview@jig.cleva-ai.co.za', medical: false, hours: [['Mon-Sat', '9:00 - 17:00'], ['Sun', 'Closed']] },
  { name: 'Rustenburg', subtitle: 'Rustenburg, North West', province: 'North West', type: 'retail', address: '78 Heystek Street, Rustenburg Central, 0299', phone: '+27 14 345 6789', email: 'rustenburg@jig.cleva-ai.co.za', medical: false, hours: [['Mon-Sat', '9:00 - 17:00'], ['Sun', 'Closed']] },
  { name: 'Klerksdorp', subtitle: 'Klerksdorp, North West', province: 'North West', type: 'retail', address: '23 Central Avenue, Klerksdorp Central, 2570', phone: '+27 18 456 7890', email: 'klerksdorp@jig.cleva-ai.co.za', medical: false, hours: [['Mon-Sat', '9:00 - 17:00'], ['Sun', 'Closed']] },
  { name: 'Mayfair', subtitle: 'Johannesburg, Gauteng', province: 'Gauteng', type: 'retail', address: '156 Central Road, Mayfair, Johannesburg, 2092', phone: '+27 11 567 8901', email: 'mayfair@jig.cleva-ai.co.za', medical: false, hours: [['Mon-Sat', '9:00 - 17:00'], ['Sun', 'Closed']] },
  { name: 'Ladybrand', subtitle: 'Ladybrand, Free State', province: 'Free State', type: 'retail', address: '34 Church Street, Ladybrand Central, 9745', phone: '+27 51 678 9012', email: 'ladybrand@jig.cleva-ai.co.za', medical: false, hours: [['Mon-Sat', '9:00 - 17:00'], ['Sun', 'Closed']] },
  { name: 'Ficksburg', subtitle: 'Ficksburg, Free State', province: 'Free State', type: 'retail', address: '12 Voortrekker Street, Ficksburg Central, 9730', phone: '+27 51 789 0123', email: 'ficksburg@jig.cleva-ai.co.za', medical: false, hours: [['Mon-Sat', '9:00 - 17:00'], ['Sun', 'Closed']] },
  { name: 'Wonderboom', subtitle: 'Pretoria, Gauteng', province: 'Gauteng', type: 'retail', address: '89 Lavender Road, Wonderboom, Pretoria, 0182', phone: '+27 12 890 1234', email: 'wonderboom@jig.cleva-ai.co.za', medical: false, hours: [['Mon-Sat', '9:00 - 17:00'], ['Sun', 'Closed']] },
];

const PROVINCES = [
  { label: 'All Provinces', value: 'All' },
  { label: 'Gauteng (4)', value: 'Gauteng' },
  { label: 'North West (2)', value: 'North West' },
  { label: 'Free State (2)', value: 'Free State' },
];

export default function LocationsPage() {
  const [search, setSearch] = useState('');
  const [province, setProvince] = useState('All');

  const filtered = useMemo(() => {
    return LOCATIONS.filter((loc) => {
      const matchProvince = province === 'All' || loc.province === province;
      const q = search.toLowerCase();
      const matchSearch = !q || loc.name.toLowerCase().includes(q) || loc.subtitle.toLowerCase().includes(q) || loc.address.toLowerCase().includes(q);
      return matchProvince && matchSearch;
    });
  }, [search, province]);

  return (
    <div>
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden" style={{ background: 'linear-gradient(160deg, #7C3AED 0%, #6D28D9 50%, #1E1E1E 100%)' }}>
        <div className="absolute top-20 -left-32 w-96 h-96 bg-jig-amber/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="inline-block px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-full mb-6" style={{ background: 'linear-gradient(135deg, #D97706, #E8C45A)', color: '#1E1E1E' }}>
            8 Locations Across SA
          </span>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-white uppercase mb-4">Our Collection Points</h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10">
            Find a JIG Craft Cannabis collection point near you. Quality products and expert guidance at every location.
          </p>
          <div className="max-w-lg mx-auto relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city, area, or province..."
              className="w-full px-5 py-4 pr-14 bg-white border-2 border-gray-200 rounded-xl text-white placeholder:text-gray-400 focus:outline-none focus:border-jig-amber focus:shadow-[0_0_0_4px_rgba(212,175,55,0.2)] transition-all"
            />
            <svg className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
        </div>
      </section>

      {/* Province filter + cards */}
      <section className="py-16 sm:py-20 bg-jig-slate">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Province buttons */}
          <div className="flex flex-wrap gap-3 mb-10 justify-center">
            {PROVINCES.map((p) => (
              <button
                key={p.value}
                onClick={() => setProvince(p.value)}
                className={`px-5 py-2.5 text-sm font-semibold rounded-xl border-2 transition-all ${
                  province === p.value
                    ? 'bg-jig-purple text-white border-jig-purple'
                    : 'bg-white text-jig-purple-dark border-gray-200 hover:bg-jig-purple hover:text-white hover:border-jig-purple'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No locations match your search.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((loc) => (
                <div
                  key={loc.name}
                  className={`bg-white rounded-2xl p-7 border-2 transition-all hover:-translate-y-1 ${
                    loc.type === 'hq'
                      ? 'border-jig-amber shadow-[0_0_20px_rgba(212,175,55,0.15)]'
                      : 'border-gray-200 hover:border-jig-purple'
                  }`}
                  style={{ boxShadow: loc.type !== 'hq' ? '0 4px 15px rgba(58,95,72,0.08)' : undefined }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-heading text-2xl text-white uppercase">{loc.name}</h3>
                      <p className="text-sm text-gray-500">{loc.subtitle}</p>
                    </div>
                    <span className={`px-3 py-1 text-[0.7rem] font-bold uppercase rounded-full whitespace-nowrap ${
                      loc.type === 'hq'
                        ? 'bg-gradient-to-r from-jig-amber to-jig-amber-light text-white'
                        : 'bg-gray-100 text-jig-purple'
                    }`}>
                      {loc.type === 'hq' ? 'HQ + Section 21' : 'Retail'}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-jig-purple animate-pulse" />
                    <span className="text-xs font-semibold text-jig-purple">Open Now</span>
                  </div>

                  {/* Info rows */}
                  <div className="space-y-3 text-sm mb-5">
                    <div className="flex items-start gap-3">
                      <svg className="w-[18px] h-[18px] text-gray-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 384 512"><path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>
                      <span className="text-gray-600">{loc.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-[18px] h-[18px] text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 512 512"><path d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z"/></svg>
                      <span className="text-gray-600">{loc.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-[18px] h-[18px] text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 512 512"><path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48L48 64zM0 176L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-208L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/></svg>
                      <span className="text-gray-600">{loc.email}</span>
                    </div>
                    {loc.medical && (
                      <div className="flex items-center gap-3">
                        <svg className="w-[18px] h-[18px] text-jig-amber shrink-0" fill="currentColor" viewBox="0 0 576 512"><path d="M142.4 21.9c5.6-16.8-3.5-34.9-20.2-40.5s-34.9 3.5-40.5 20.2L48 64 17.7 64C8 64 0 72 0 81.7l0 .1C0 198.6 79.8 288.7 183.9 307.5C232.3 348 293.1 372.6 360 380.2L360 456l-48 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l128 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-48 0 0-75.8c66.9-7.6 127.7-32.2 176.1-72.7C672.2 288.7 752 198.6 752 81.8l0-.1C752 72 744 64 734.3 64L704 64l-33.7-82.4c-5.6-16.8-23.7-25.8-40.5-20.2s-25.8 23.7-20.2 40.5L626.2 64l-500.4 0L142.4 21.9z"/></svg>
                        <span className="text-jig-amber-dark font-semibold">Section 21 Medical Cannabis Available</span>
                      </div>
                    )}
                  </div>

                  {/* Hours */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-5">
                    <table className="w-full text-sm">
                      <tbody>
                        {loc.hours.map(([day, time]) => (
                          <tr key={day}>
                            <td className="py-1 text-gray-500 font-medium">{day}</td>
                            <td className="py-1 text-gray-700 text-right">{time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider bg-jig-purple text-white rounded-xl hover:bg-jig-purple-dark hover:-translate-y-0.5 transition-all">
                      Get Directions
                    </button>
                    <a href={`tel:${loc.phone}`} className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider text-center border-2 border-jig-purple text-jig-purple rounded-xl hover:bg-jig-purple hover:text-white transition-all">
                      Call
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-16 bg-white border-2 border-gray-200 rounded-2xl p-10 sm:p-14 text-center">
            <h2 className="font-heading text-3xl text-white uppercase mb-4">Expand With Us</h2>
            <p className="text-gray-500 max-w-xl mx-auto mb-8">Interested in bringing JIG Craft Cannabis to your area? We're always looking for passionate partners.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="px-8 py-3 text-sm font-bold uppercase tracking-wider bg-jig-purple text-white rounded-xl hover:bg-jig-purple-dark hover:-translate-y-0.5 transition-all">
                Become a Driver
              </button>
              <button className="px-8 py-3 text-sm font-bold uppercase tracking-wider border-2 border-jig-purple text-jig-purple rounded-xl hover:bg-jig-purple hover:text-white transition-all">
                Franchise Enquiry
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
