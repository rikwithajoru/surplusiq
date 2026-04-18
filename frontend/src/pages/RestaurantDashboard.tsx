import React, { useState, useEffect } from 'react';
import NavBar from '../components/NavBar';
import apiClient, { foodApi, analyticsApi } from '../api/client';
import { colors, radius, shadow, input, btn } from '../styles/theme';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type Screen = 'predict' | 'action' | 'post' | 'shortage' | 'myListings' | 'csr';

interface AnalyticsData {
  totalKgSaved: number;
  totalDonations: number;
  estimatedPeopleFed: number;
  estimatedCO2Reduced: number;
}

interface PredictForm {
  foodType: string;
  quantity: string;
  expectedGuests: string;
  prepTime: string;
  expiryTime: string;
}

interface PredictionResult {
  predictedSurplus: number;
  predictedConsumption: number;
  surplusPercent: number;
  consumptionRate: number;
  r2Score: number;
  hoursUntilExpiry: number;
  urgency: string;
  recommendation: string;
}

interface PostForm {
  foodName: string;
  quantity: string;
  expiryDatetime: string;
  foodType: string;
  lat: string;
  lng: string;
}

interface FoodListing {
  _id: string;
  foodName: string;
  quantity: number;
  status: string;
  expiryDatetime: string;
  requests?: { ngoName?: string; status: string }[];
}

interface FoodRequest {
  _id: string;
  ngoName?: string;
  foodName?: string;
  quantity?: number;
  status: string;
  listing?: { foodName: string; quantity: number };
}

const card: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.lg,
  padding: '24px',
  boxShadow: shadow.md,
};

const label: React.CSSProperties = {
  display: 'block',
  color: colors.textMuted,
  fontSize: '13px',
  marginBottom: '6px',
  fontWeight: 500,
};

const fieldGroup = (children: React.ReactNode): React.ReactNode => (
  <div style={{ marginBottom: '16px' }}>{children}</div>
);

export default function RestaurantDashboard() {
  const [screen, setScreen] = useState<Screen>('predict');
  const [predictForm, setPredictForm] = useState<PredictForm>({
    foodType: 'Rice',
    quantity: '',
    expectedGuests: '',
    prepTime: '',
    expiryTime: '',
  });
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predictError, setPredictError] = useState('');
  const [predicting, setPredicting] = useState(false);

  const [postForm, setPostForm] = useState<PostForm>({
    foodName: '',
    quantity: '',
    expiryDatetime: '',
    foodType: '',
    lat: '',
    lng: '',
  });
  const [postSuccess, setPostSuccess] = useState(false);
  const [postError, setPostError] = useState('');
  const [posting, setPosting] = useState(false);

  const [listings, setListings] = useState<FoodListing[]>([]);
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);

  // CSR state
  const [csrData, setCsrData] = useState<AnalyticsData | null>(null);
  const [csrLoading, setCsrLoading] = useState(false);
  const [csrError, setCsrError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (screen === 'myListings') fetchMyListings();
    if (screen === 'csr') fetchCsrData();
  }, [screen]);

  async function fetchMyListings() {
    setListingsLoading(true);
    try {
      const [l, r] = await Promise.all([
        foodApi.getMyListingsWithRequests(),
        foodApi.getIncomingRequests(),
      ]);
      setListings(l.data);
      setRequests(r.data);
    } catch {
      // ignore
    } finally {
      setListingsLoading(false);
    }
  }

  async function fetchCsrData() {
    setCsrLoading(true);
    setCsrError('');
    try {
      const res = await analyticsApi.getAnalytics();
      setCsrData(res.data);
    } catch {
      setCsrError('Failed to load CSR data.');
    } finally {
      setCsrLoading(false);
    }
  }

  async function handleExportPDF() {
    setExporting(true);
    try {
      const res = await analyticsApi.exportCSRReport();
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `csr-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Only admin role can export PDF reports.');
    } finally {
      setExporting(false);
    }
  }

  async function handlePredict(e: React.FormEvent) {
    e.preventDefault();
    setPredictError('');
    setPredicting(true);
    try {
      const res = await apiClient.post('/predict-surplus', {
        foodType: predictForm.foodType,
        quantity: Number(predictForm.quantity),
        expectedGuests: Number(predictForm.expectedGuests),
        prepTime: predictForm.prepTime,
        expiryTime: predictForm.expiryTime,
      });
      const data = res.data;
      setPrediction(data);
      if (data.urgency === 'shortage') {
        setScreen('shortage');
      } else {
        setScreen('action');
      }
    } catch (err: any) {
      setPredictError(err?.response?.data?.message || 'Prediction failed. Please try again.');
    } finally {
      setPredicting(false);
    }
  }

  function handleActionChoice(type: 'donate' | 'sell') {
    setPostForm({
      foodName: predictForm.foodType,
      quantity: predictForm.quantity,
      expiryDatetime: predictForm.expiryTime,
      foodType: predictForm.foodType,
      lat: '',
      lng: '',
    });
    setPostSuccess(false);
    setPostError('');
    setScreen('post');
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setPostError('');

    // Validate
    if (!postForm.foodName.trim()) { setPostError('Food name is required.'); return; }
    if (!postForm.quantity || Number(postForm.quantity) <= 0) { setPostError('Quantity must be greater than 0.'); return; }
    if (!postForm.expiryDatetime) { setPostError('Expiry date/time is required.'); return; }
    const expiryDate = new Date(postForm.expiryDatetime);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) { setPostError('Expiry must be a future date/time.'); return; }
    if (!postForm.lat || !postForm.lng) { setPostError('Latitude and longitude are required.'); return; }

    setPosting(true);
    try {
      await foodApi.addFood({
        foodName: postForm.foodName.trim(),
        quantity: Number(postForm.quantity),
        expiryDatetime: expiryDate.toISOString(),
        foodType: postForm.foodType || undefined,
        location: { lat: Number(postForm.lat), lng: Number(postForm.lng) },
      });
      setPostSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        || (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message
        || 'Failed to post listing.';
      setPostError(msg);
    } finally {
      setPosting(false);
    }
  }

  async function handleRequestAction(requestId: string, status: string) {
    try {
      await foodApi.updateRequestStatus(requestId, status);
      fetchMyListings();
    } catch {
      // ignore
    }
  }

  function resetToPredict() {
    setPredictForm({ foodType: 'Rice', quantity: '', expectedGuests: '', prepTime: '', expiryTime: '' });
    setPrediction(null);
    setPredictError('');
    setPostSuccess(false);
    setScreen('predict');
  }

  const navItems = [
    { label: '🔮 Predict Surplus', key: 'predict' as Screen },
    { label: '📋 My Listings', key: 'myListings' as Screen },
    { label: '🌱 CSR Dashboard', key: 'csr' as Screen },
  ];

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text }}>
      <NavBar />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 16px' }}>
        {/* Top nav tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setScreen(item.key)}
              style={{
                ...btn.ghost,
                ...(screen === item.key || (item.key === 'predict' && ['predict', 'action', 'post', 'shortage'].includes(screen))
                  ? { background: colors.primaryLight, color: colors.primary, borderColor: colors.primary }
                  : {}),
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Screen: predict */}
        {screen === 'predict' && (
          <div style={card}>
            <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>Predict Food Surplus</h2>
            <form onSubmit={handlePredict}>
              {fieldGroup(
                <>
                  <label style={label}>Food Type</label>
                  <select
                    value={predictForm.foodType}
                    onChange={(e) => setPredictForm({ ...predictForm, foodType: e.target.value })}
                    style={{ ...input }}
                    required
                  >
                    {['Rice', 'Curry', 'Pizza', 'Bread', 'Pasta', 'Biryani', 'Salad', 'Other'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </>
              )}
              {fieldGroup(
                <>
                  <label style={label}>Quantity (kg / units)</label>
                  <input
                    type="number"
                    min={1}
                    value={predictForm.quantity}
                    onChange={(e) => setPredictForm({ ...predictForm, quantity: e.target.value })}
                    style={{ ...input }}
                    placeholder="e.g. 50"
                    required
                  />
                </>
              )}
              {fieldGroup(
                <>
                  <label style={label}>Expected Guests</label>
                  <input
                    type="number"
                    min={1}
                    value={predictForm.expectedGuests}
                    onChange={(e) => setPredictForm({ ...predictForm, expectedGuests: e.target.value })}
                    style={{ ...input }}
                    placeholder="e.g. 100"
                    required
                  />
                </>
              )}
              {fieldGroup(
                <>
                  <label style={label}>Prep Time</label>
                  <input
                    type="datetime-local"
                    value={predictForm.prepTime}
                    onChange={(e) => setPredictForm({ ...predictForm, prepTime: e.target.value })}
                    style={{ ...input }}
                    required
                  />
                </>
              )}
              {fieldGroup(
                <>
                  <label style={label}>Expiry Time</label>
                  <input
                    type="datetime-local"
                    value={predictForm.expiryTime}
                    onChange={(e) => setPredictForm({ ...predictForm, expiryTime: e.target.value })}
                    style={{ ...input }}
                    required
                  />
                </>
              )}
              {predictError && (
                <p style={{ color: colors.danger, fontSize: '13px', marginBottom: '12px' }}>{predictError}</p>
              )}
              <button type="submit" style={{ ...btn.primary, width: '100%' }} disabled={predicting}>
                {predicting ? 'Predicting...' : 'Predict Surplus'}
              </button>
            </form>
          </div>
        )}

        {/* Screen: action */}
        {screen === 'action' && prediction && (
          <div style={card}>
            <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>Prediction Results</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              {[
                { label: 'Predicted Surplus', value: `${prediction.predictedSurplus} units` },
                { label: 'Predicted Consumption', value: `${prediction.predictedConsumption} units` },
                { label: 'Surplus %', value: `${prediction.surplusPercent}%` },
                { label: 'Consumption Rate', value: `${prediction.consumptionRate}` },
                { label: 'R² Score', value: `${prediction.r2Score}` },
                { label: 'Hours Until Expiry', value: `${prediction.hoursUntilExpiry}h` },
              ].map((m) => (
                <div key={m.label} style={{ background: colors.bg, borderRadius: radius.md, padding: '12px 16px', border: `1px solid ${colors.border}` }}>
                  <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>{m.label}</div>
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: '20px', padding: '12px 16px', background: colors.warningLight, borderRadius: radius.md, border: `1px solid ${colors.warning}` }}>
              <span style={{ color: colors.warning, fontWeight: 600, fontSize: '13px' }}>Urgency: {prediction.urgency}</span>
              <p style={{ margin: '6px 0 0', color: colors.text, fontSize: '14px' }}>{prediction.recommendation}</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                style={{ ...btn.primary, flex: 1, background: '#16a34a', borderRadius: radius.md }}
                onClick={() => handleActionChoice('donate')}
              >
                Donate
              </button>
              <button
                style={{ ...btn.primary, flex: 1, background: colors.primary, borderRadius: radius.md }}
                onClick={() => handleActionChoice('sell')}
              >
                Sell
              </button>
            </div>
          </div>
        )}

        {/* Screen: shortage */}
        {screen === 'shortage' && prediction && (
          <div style={{ ...card, border: `1px solid ${colors.danger}` }}>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
              <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 700, color: colors.danger }}>Shortage Detected</h2>
              <p style={{ color: colors.textMuted, marginBottom: '20px' }}>
                Based on your inputs, there may not be enough food for your expected guests.
              </p>
              <div style={{ background: colors.dangerLight, borderRadius: radius.md, padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <div style={{ color: colors.textMuted, fontSize: '12px' }}>Predicted Consumption</div>
                    <div style={{ fontWeight: 700 }}>{prediction.predictedConsumption} units</div>
                  </div>
                  <div>
                    <div style={{ color: colors.textMuted, fontSize: '12px' }}>Predicted Surplus</div>
                    <div style={{ fontWeight: 700, color: colors.danger }}>{prediction.predictedSurplus} units</div>
                  </div>
                  <div>
                    <div style={{ color: colors.textMuted, fontSize: '12px' }}>Urgency</div>
                    <div style={{ fontWeight: 700, color: colors.danger }}>{prediction.urgency}</div>
                  </div>
                  <div>
                    <div style={{ color: colors.textMuted, fontSize: '12px' }}>Hours Until Expiry</div>
                    <div style={{ fontWeight: 700 }}>{prediction.hoursUntilExpiry}h</div>
                  </div>
                </div>
                {prediction.recommendation && (
                  <p style={{ margin: '12px 0 0', color: colors.text, fontSize: '14px' }}>{prediction.recommendation}</p>
                )}
              </div>
              <button style={{ ...btn.danger, width: '100%' }} onClick={resetToPredict}>
                Adjust &amp; Re-predict
              </button>
            </div>
          </div>
        )}

        {/* Screen: post */}
        {screen === 'post' && (
          <div style={card}>
            {postSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: colors.success }}>Listing Posted!</h2>
                <p style={{ color: colors.textMuted, marginBottom: '24px' }}>Your food listing is now live for NGOs to claim.</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button style={btn.primary} onClick={resetToPredict}>New Prediction</button>
                  <button style={btn.ghost} onClick={() => setScreen('myListings')}>View My Listings</button>
                </div>
              </div>
            ) : (
              <>
                <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 700 }}>Post Food Listing</h2>
                <form onSubmit={handlePost}>
                  {fieldGroup(
                    <>
                      <label style={label}>Food Name</label>
                      <input
                        type="text"
                        value={postForm.foodName}
                        onChange={(e) => setPostForm({ ...postForm, foodName: e.target.value })}
                        style={{ ...input }}
                        required
                      />
                    </>
                  )}
                  {fieldGroup(
                    <>
                      <label style={label}>Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={postForm.quantity}
                        onChange={(e) => setPostForm({ ...postForm, quantity: e.target.value })}
                        style={{ ...input }}
                        required
                      />
                    </>
                  )}
                  {fieldGroup(
                    <>
                      <label style={label}>Expiry Date & Time</label>
                      <input
                        type="datetime-local"
                        value={postForm.expiryDatetime}
                        onChange={(e) => setPostForm({ ...postForm, expiryDatetime: e.target.value })}
                        style={{ ...input }}
                        required
                      />
                    </>
                  )}
                  {fieldGroup(
                    <>
                      <label style={label}>Food Type</label>
                      <select
                        value={postForm.foodType}
                        onChange={(e) => setPostForm({ ...postForm, foodType: e.target.value })}
                        style={{ ...input }}
                        required
                      >
                        <option value="">Select type</option>
                        {['Rice', 'Curry', 'Pizza', 'Bread', 'Pasta', 'Biryani', 'Salad', 'Other'].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={label}>Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={postForm.lat}
                        onChange={(e) => setPostForm({ ...postForm, lat: e.target.value })}
                        style={{ ...input }}
                        placeholder="e.g. 28.6139"
                        required
                      />
                    </div>
                    <div>
                      <label style={label}>Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={postForm.lng}
                        onChange={(e) => setPostForm({ ...postForm, lng: e.target.value })}
                        style={{ ...input }}
                        placeholder="e.g. 77.2090"
                        required
                      />
                    </div>
                  </div>
                  {postError && (
                    <p style={{ color: colors.danger, fontSize: '13px', marginBottom: '12px' }}>{postError}</p>
                  )}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="submit" style={{ ...btn.primary, flex: 1 }} disabled={posting}>
                      {posting ? 'Posting...' : 'Post Listing'}
                    </button>
                    <button type="button" style={btn.ghost} onClick={() => setScreen('action')}>
                      Back
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* Screen: myListings */}
        {screen === 'myListings' && (
          <div>
            <div style={{ ...card, marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700 }}>My Food Listings</h2>
              {listingsLoading ? (
                <p style={{ color: colors.textMuted }}>Loading...</p>
              ) : listings.length === 0 ? (
                <p style={{ color: colors.textMuted }}>No listings yet.</p>
              ) : (
                listings.map((listing) => {
                  const claimed = listing.requests?.find((r) => r.status === 'accepted' || r.status === 'delivered');
                  return (
                    <div
                      key={listing._id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: radius.md,
                        border: `1px solid ${colors.border}`,
                        marginBottom: '10px',
                        background: colors.bg,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{listing.foodName}</div>
                        <div style={{ color: colors.textMuted, fontSize: '13px' }}>
                          {listing.quantity} units · Expires {new Date(listing.expiryDatetime).toLocaleString()}
                        </div>
                        {claimed?.ngoName && (
                          <div style={{ color: colors.info, fontSize: '12px', marginTop: '4px' }}>
                            Claimed by: {claimed.ngoName}
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: radius.full,
                          fontSize: '12px',
                          fontWeight: 600,
                          background:
                            listing.status === 'available' ? colors.successLight :
                            listing.status === 'claimed' ? colors.infoLight :
                            colors.warningLight,
                          color:
                            listing.status === 'available' ? colors.success :
                            listing.status === 'claimed' ? colors.info :
                            colors.warning,
                        }}
                      >
                        {listing.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div style={card}>
              <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700 }}>📬 Incoming NGO Requests</h2>
              {listingsLoading ? (
                <p style={{ color: colors.textMuted }}>Loading...</p>
              ) : requests.length === 0 ? (
                <p style={{ color: colors.textMuted }}>No incoming requests.</p>
              ) : (
                requests.map((req) => (
                  <div
                    key={req._id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: radius.md,
                      border: `1px solid ${colors.border}`,
                      marginBottom: '10px',
                      background: colors.bg,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{req.ngoName || 'NGO'}</div>
                      <div style={{ color: colors.textMuted, fontSize: '13px' }}>
                        {req.listing?.foodName || req.foodName} · {req.listing?.quantity || req.quantity} units
                      </div>
                    </div>
                    <div>
                      {req.status === 'requested' && (
                        <button
                          style={{ ...btn.primary, background: '#16a34a', padding: '6px 14px', fontSize: '13px' }}
                          onClick={() => handleRequestAction(req._id, 'accepted')}
                        >
                          ✓ Accept
                        </button>
                      )}
                      {req.status === 'accepted' && (
                        <button
                          style={{ ...btn.primary, background: colors.info, padding: '6px 14px', fontSize: '13px' }}
                          onClick={() => handleRequestAction(req._id, 'delivered')}
                        >
                          📦 Mark Delivered
                        </button>
                      )}
                      {req.status === 'delivered' && (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: radius.full,
                            fontSize: '12px',
                            fontWeight: 600,
                            background: colors.successLight,
                            color: colors.success,
                          }}
                        >
                          ✓ Delivered
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── CSR Dashboard ── */}
        {screen === 'csr' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: colors.text, margin: 0 }}>🌱 CSR Impact Dashboard</h1>
                <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '4px' }}>Your restaurant's social & environmental contribution</p>
              </div>
              <button
                onClick={handleExportPDF}
                disabled={exporting || !csrData}
                style={{ padding: '10px 20px', background: exporting ? colors.border : colors.success, color: '#fff', border: 'none', borderRadius: radius.md, fontWeight: 600, fontSize: '13px', cursor: (exporting || !csrData) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {exporting ? '⏳ Exporting…' : '⬇ Download CSR Report'}
              </button>
            </div>

            {csrLoading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '24px', animation: 'pulse 1.5s infinite', height: '100px' }} />
                ))}
              </div>
            )}

            {csrError && (
              <div style={{ background: colors.dangerLight, border: `1px solid ${colors.danger}`, borderRadius: radius.md, padding: '14px 16px', color: colors.danger, marginBottom: '20px' }}>
                ✕ {csrError}
              </div>
            )}

            {csrData && (
              <>
                {/* Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '28px' }}>
                  {[
                    { icon: '🌾', label: 'Total Food Saved', value: `${csrData.totalKgSaved.toFixed(1)} kg`, color: colors.success, bg: colors.successLight },
                    { icon: '🤝', label: 'Total Donations', value: String(csrData.totalDonations), color: colors.primary, bg: colors.primaryLight },
                    { icon: '🍽', label: 'People Fed', value: String(csrData.estimatedPeopleFed), color: colors.warning, bg: colors.warningLight },
                    { icon: '🌍', label: 'CO₂ Reduced', value: `${csrData.estimatedCO2Reduced.toFixed(1)} kg`, color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
                  ].map(m => (
                    <div key={m.label} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: m.color }} />
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{m.icon}</div>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
                      <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px', fontWeight: 500 }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Bar Chart */}
                <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.textMuted, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 20px' }}>Impact Summary</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={[
                        { name: 'Food Saved (kg)', value: csrData.totalKgSaved, fill: colors.success },
                        { name: 'People Fed', value: csrData.estimatedPeopleFed, fill: colors.warning },
                        { name: 'CO₂ Reduced (kg)', value: csrData.estimatedCO2Reduced, fill: '#22d3ee' },
                        { name: 'Donations', value: csrData.totalDonations, fill: colors.primary },
                      ]}
                      margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: colors.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: colors.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, color: colors.text, fontSize: '13px' }}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill={colors.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Impact statement */}
                <div style={{ marginTop: '20px', background: colors.successLight, border: `1px solid ${colors.success}`, borderRadius: radius.lg, padding: '20px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏆</div>
                  <p style={{ color: colors.success, fontWeight: 700, fontSize: '15px', margin: 0 }}>
                    Your restaurant has helped feed {csrData.estimatedPeopleFed} people and saved {csrData.estimatedCO2Reduced.toFixed(1)} kg of CO₂ emissions!
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
