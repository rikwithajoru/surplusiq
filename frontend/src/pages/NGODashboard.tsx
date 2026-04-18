import React, { useEffect, useState } from 'react';
import { foodApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';
import FoodMap from '../components/FoodMap';
import { colors, radius, shadow } from '../styles/theme';

interface FoodListing {
  _id: string; foodName: string; quantity: number; expiryDatetime: string;
  status: string; foodType?: string; location: { lat: number; lng: number };
  score?: number; distance?: number;
}

interface AcceptedRequest {
  _id: string; status: 'requested' | 'accepted' | 'delivered';
  listing: FoodListing;
  restaurant: { orgName: string; location: { lat: number; lng: number } };
}

interface ClaimState { [id: string]: { loading: boolean; claimed: boolean; error: string }; }

// Dummy delivery partners
const DELIVERY_PARTNERS = [
  { name: 'Ravi Kumar', phone: '+91 98765 43210', vehicle: '🛵 Bike', eta: '15 min', rating: 4.8 },
  { name: 'Priya Sharma', phone: '+91 87654 32109', vehicle: '🚗 Car', eta: '20 min', rating: 4.9 },
  { name: 'Arjun Singh', phone: '+91 76543 21098', vehicle: '🛵 Bike', eta: '10 min', rating: 4.7 },
  { name: 'Meena Patel', phone: '+91 65432 10987', vehicle: '🚐 Van', eta: '25 min', rating: 4.6 },
];

function getDeliveryPartner(id: string) {
  const idx = id.charCodeAt(id.length - 1) % DELIVERY_PARTNERS.length;
  return DELIVERY_PARTNERS[idx];
}

function hoursLeft(dt: string) { return (new Date(dt).getTime() - Date.now()) / 3600000; }

const STATUS_STEPS = ['requested', 'accepted', 'delivered'];
const STATUS_LABELS: Record<string, string> = { requested: 'Request Sent', accepted: 'Accepted by Restaurant', delivered: 'Delivered ✓' };
const STATUS_COLORS: Record<string, string> = { requested: colors.warning, accepted: colors.info, delivered: colors.success };

export default function NGODashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'available' | 'accepted'>('available');
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [accepted, setAccepted] = useState<AcceptedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [claimState, setClaimState] = useState<ClaimState>({});
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

  const ngoLat = (user as { location?: { lat: number; lng: number } } | null)?.location?.lat;
  const ngoLng = (user as { location?: { lat: number; lng: number } } | null)?.location?.lng;

  useEffect(() => { fetchListings(); fetchAccepted(); }, []);

  async function fetchListings() {
    setLoading(true); setFetchError('');
    try {
      const res = await foodApi.getAvailableFood(ngoLat ?? 0, ngoLng ?? 0);
      setListings(res.data as FoodListing[]);
    } catch { setFetchError('Failed to load listings.'); }
    finally { setLoading(false); }
  }

  async function fetchAccepted() {
    try {
      const res = await foodApi.getMyRequests();
      setAccepted(res.data as AcceptedRequest[]);
    } catch { /* ignore */ }
  }

  async function handleAccept(id: string) {
    setClaimState(p => ({ ...p, [id]: { loading: true, claimed: false, error: '' } }));
    try {
      await foodApi.acceptRequest(id);
      setClaimState(p => ({ ...p, [id]: { loading: false, claimed: true, error: '' } }));
      setListings(p => p.map(l => l._id === id ? { ...l, status: 'claimed' } : l));
      await fetchAccepted();
      // Auto-switch to accepted tab
      setTab('accepted');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to claim.';
      setClaimState(p => ({ ...p, [id]: { loading: false, claimed: false, error: msg } }));
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 24px', border: 'none', borderRadius: radius.md, fontWeight: 600, fontSize: '14px',
    cursor: 'pointer', transition: 'all 0.2s',
    background: active ? colors.primary : 'transparent',
    color: active ? '#fff' : colors.textMuted,
  });

  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      <NavBar />
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', background: colors.surface, padding: '6px', borderRadius: radius.lg, border: `1px solid ${colors.border}`, width: 'fit-content' }}>
          <button style={tabStyle(tab === 'available')} onClick={() => setTab('available')}>
            🍽 Available Food {listings.filter(l => l.status === 'available').length > 0 && <span style={{ marginLeft: '6px', background: colors.success, color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>{listings.filter(l => l.status === 'available').length}</span>}
          </button>
          <button style={tabStyle(tab === 'accepted')} onClick={() => { setTab('accepted'); fetchAccepted(); }}>
            📦 My Accepted Food {accepted.length > 0 && <span style={{ marginLeft: '6px', background: colors.warning, color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>{accepted.length}</span>}
          </button>
        </div>

        {/* ── TAB 1: Available Food ── */}
        {tab === 'available' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: colors.text }}>Available Food</h1>
              <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '4px' }}>Ranked by AI score — closest, most urgent, largest first</p>
            </div>

            {/* Map */}
            {listings.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: colors.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📍 Food Locations — India</h3>
                <FoodMap listings={listings} ngoLat={ngoLat} ngoLng={ngoLng} />
              </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[['🟢', 'Best match', colors.success], ['🔴', 'Expires ≤ 2h', colors.danger], ['🟡', 'Expires ≤ 6h', colors.warning]].map(([icon, label, color]) => (
                <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: color as string }}>
                  <span>{icon}</span><span>{label}</span>
                </div>
              ))}
            </div>

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '20px', animation: 'pulse 1.5s infinite' }}>
                    <div style={{ height: '16px', background: colors.border, borderRadius: '4px', width: '40%', marginBottom: '10px' }} />
                    <div style={{ height: '12px', background: colors.border, borderRadius: '4px', width: '70%' }} />
                  </div>
                ))}
              </div>
            )}

            {fetchError && <div style={{ background: colors.dangerLight, border: `1px solid ${colors.danger}`, borderRadius: radius.md, padding: '14px 16px', color: colors.danger }}>✕ {fetchError}</div>}

            {!loading && !fetchError && listings.length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px 24px', color: colors.textMuted }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                <p style={{ fontSize: '16px', fontWeight: 500, color: colors.text }}>No available listings right now</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {listings.map((listing, index) => {
                const hours = hoursLeft(listing.expiryDatetime);
                const isTop = index === 0;
                const claim = claimState[listing._id];
                const isClaimed = listing.status === 'claimed' || listing.status === 'delivered' || claim?.claimed;
                const borderColor = isTop ? colors.success : hours <= 2 ? colors.danger : hours <= 6 ? colors.warning : colors.border;
                const urgencyIcon = isTop ? '🟢' : hours <= 2 ? '🔴' : hours <= 6 ? '🟡' : null;
                const urgencyLabel = isTop ? 'Best match' : hours <= 2 ? 'High urgency' : hours <= 6 ? 'Medium urgency' : null;

                return (
                  <div key={listing._id} className="fade-in"
                    style={{ background: colors.surface, border: `1px solid ${borderColor}`, borderRadius: radius.lg, padding: '20px 24px', boxShadow: isTop ? `0 0 0 1px ${colors.success}22, ${shadow.md}` : shadow.sm, transition: 'transform 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                          <span style={{ fontSize: '17px', fontWeight: 700, color: colors.text }}>{listing.foodName}</span>
                          {listing.score != null && <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: radius.full, background: colors.primaryLight, color: colors.primary, fontWeight: 700 }}>AI {listing.score.toFixed(2)}</span>}
                          {urgencyIcon && <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: radius.full, background: borderColor + '22', color: borderColor, fontWeight: 600 }}>{urgencyIcon} {urgencyLabel}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: colors.textMuted }}>
                          <span>⚖️ <strong style={{ color: colors.text }}>{listing.quantity} kg</strong></span>
                          {listing.foodType && <span>🏷 <strong style={{ color: colors.text }}>{listing.foodType}</strong></span>}
                          {listing.distance != null && <span>📍 <strong style={{ color: colors.text }}>{listing.distance.toFixed(1)} km</strong></span>}
                          <span style={{ color: hours < 2 ? colors.danger : hours < 6 ? colors.warning : colors.textMuted }}>⏱ <strong>{hours > 0 ? `${hours.toFixed(1)}h left` : 'Expired'}</strong></span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                        {isClaimed ? (
                          <span style={{ padding: '8px 20px', borderRadius: radius.md, background: colors.border, color: colors.textMuted, fontWeight: 600, fontSize: '13px' }}>
                            {listing.status === 'delivered' ? '✓ Delivered' : '✓ Claimed'}
                          </span>
                        ) : (
                          <button onClick={() => handleAccept(listing._id)} disabled={claim?.loading}
                            style={{ padding: '9px 20px', background: claim?.loading ? colors.border : colors.success, color: '#fff', border: 'none', borderRadius: radius.md, fontWeight: 700, fontSize: '13px', cursor: claim?.loading ? 'not-allowed' : 'pointer' }}>
                            {claim?.loading ? 'Claiming…' : 'Accept'}
                          </button>
                        )}
                        {claim?.error && <span style={{ fontSize: '11px', color: colors.danger, maxWidth: '180px', textAlign: 'right' }}>{claim.error}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── TAB 2: My Accepted Food ── */}
        {tab === 'accepted' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: colors.text }}>My Accepted Food</h1>
              <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '4px' }}>Track your claimed donations and delivery status</p>
            </div>

            {/* Map of accepted listings */}
            {accepted.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: colors.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📍 Tracking Map — India</h3>
                <FoodMap listings={accepted.map(r => r.listing)} ngoLat={ngoLat} ngoLng={ngoLng} />
              </div>
            )}

            {accepted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 24px', color: colors.textMuted }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                <p style={{ fontSize: '16px', fontWeight: 500, color: colors.text }}>No accepted food yet</p>
                <p style={{ fontSize: '13px', marginTop: '6px' }}>Go to Available Food tab and accept a listing.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {accepted.map(req => {
                  const partner = getDeliveryPartner(req._id);
                  const stepIdx = STATUS_STEPS.indexOf(req.status);
                  const isExpanded = expandedRequest === req._id;

                  return (
                    <div key={req._id} className="fade-in"
                      style={{ background: colors.surface, border: `1px solid ${STATUS_COLORS[req.status]}44`, borderRadius: radius.lg, overflow: 'hidden', boxShadow: shadow.sm }}>

                      {/* Status bar */}
                      <div style={{ height: '3px', background: STATUS_COLORS[req.status] }} />

                      <div style={{ padding: '20px 24px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div style={{ fontSize: '17px', fontWeight: 700, color: colors.text, marginBottom: '4px' }}>{req.listing?.foodName || 'Food Item'}</div>
                            <div style={{ fontSize: '13px', color: colors.textMuted }}>
                              From: <strong style={{ color: colors.text }}>{req.restaurant?.orgName || 'Restaurant'}</strong>
                            </div>
                          </div>
                          <span style={{ padding: '5px 14px', borderRadius: radius.full, background: STATUS_COLORS[req.status] + '22', color: STATUS_COLORS[req.status], fontWeight: 700, fontSize: '12px' }}>
                            {STATUS_LABELS[req.status]}
                          </span>
                        </div>

                        {/* Progress tracker */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                          {STATUS_STEPS.map((step, i) => (
                            <React.Fragment key={step}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, background: i <= stepIdx ? STATUS_COLORS[req.status] : colors.border, color: '#fff', transition: 'background 0.3s' }}>
                                  {i < stepIdx ? '✓' : i + 1}
                                </div>
                                <span style={{ fontSize: '10px', color: i <= stepIdx ? STATUS_COLORS[req.status] : colors.textDim, fontWeight: i === stepIdx ? 700 : 400, whiteSpace: 'nowrap' }}>
                                  {step === 'requested' ? 'Requested' : step === 'accepted' ? 'Accepted' : 'Delivered'}
                                </span>
                              </div>
                              {i < STATUS_STEPS.length - 1 && (
                                <div style={{ flex: 1, height: '2px', background: i < stepIdx ? STATUS_COLORS[req.status] : colors.border, margin: '0 4px', marginBottom: '18px', transition: 'background 0.3s' }} />
                              )}
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Food details */}
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: colors.textMuted, marginBottom: '16px' }}>
                          {req.listing?.quantity && <span>⚖️ <strong style={{ color: colors.text }}>{req.listing.quantity} kg</strong></span>}
                          {req.listing?.foodType && <span>🏷 <strong style={{ color: colors.text }}>{req.listing.foodType}</strong></span>}
                          {req.listing?.expiryDatetime && <span>⏱ <strong style={{ color: colors.text }}>Expires {new Date(req.listing.expiryDatetime).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</strong></span>}
                        </div>

                        {/* Delivery partner — show when accepted or delivered */}
                        {(req.status === 'accepted' || req.status === 'delivered') && (
                          <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '14px 16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🚴 Delivery Partner</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👤</div>
                                <div>
                                  <div style={{ fontWeight: 700, color: colors.text, fontSize: '14px' }}>{partner.name}</div>
                                  <div style={{ fontSize: '12px', color: colors.textMuted }}>{partner.vehicle} · ⭐ {partner.rating}</div>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '13px', color: colors.text, fontWeight: 600 }}>{partner.phone}</div>
                                {req.status === 'accepted' && <div style={{ fontSize: '12px', color: colors.success, marginTop: '2px' }}>ETA: {partner.eta}</div>}
                                {req.status === 'delivered' && <div style={{ fontSize: '12px', color: colors.success, marginTop: '2px' }}>✓ Delivered</div>}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Expand/collapse details */}
                        <button onClick={() => setExpandedRequest(isExpanded ? null : req._id)}
                          style={{ marginTop: '12px', background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: '12px', padding: 0 }}>
                          {isExpanded ? '▲ Hide details' : '▼ Show details'}
                        </button>

                        {isExpanded && (
                          <div className="fade-in" style={{ marginTop: '12px', padding: '14px', background: colors.bg, borderRadius: radius.md, border: `1px solid ${colors.border}`, fontSize: '13px', color: colors.textMuted }}>
                            <div style={{ marginBottom: '6px' }}>📋 Request ID: <span style={{ color: colors.text, fontFamily: 'monospace' }}>{req._id}</span></div>
                            <div style={{ marginBottom: '6px' }}>🏪 Restaurant: <span style={{ color: colors.text }}>{req.restaurant?.orgName}</span></div>
                            {req.restaurant?.location && (
                              <div>📍 Location: <span style={{ color: colors.text }}>{req.restaurant.location.lat.toFixed(4)}, {req.restaurant.location.lng.toFixed(4)}</span></div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
