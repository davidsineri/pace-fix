import { useState, useEffect } from 'react';
import { Users, Package, ShoppingBag, Trash2, CheckCircle, XCircle, DollarSign, Eye, Clock, CreditCard } from 'lucide-react';

interface Order {
  id: string;
  user_id: string;
  total: number;
  status: string;
  items: any[];
  proof_url?: string;
  reject_reason?: string;
  created_at: string;
  seller_paid_at?: string;
  seller_amount?: number;
  pace_commission?: number;
  transfer_note?: string;
  shipping_method?: string;
  destination_city?: string;
  shipping_cost?: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [stats, setStats] = useState({ users: 0, products: 0, orders: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProofModal, setShowProofModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, productsRes, ordersRes, allOrdersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/products'),
        fetch('/api/admin/orders?status=MENUNGGU_KONFIRMASI'),
        fetch('/api/admin/orders')
      ]);
      
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (allOrdersRes.ok) setAllOrders(await allOrdersRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Hapus pengguna ini?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Hapus produk ini?')) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DIBAYAR' })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('Gagal approve order');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    if (!rejectReason.trim()) {
      alert('Masukkan alasan penolakan');
      return;
    }
    setProcessingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DITOLAK', reject_reason: rejectReason })
      });
      if (res.ok) {
        setShowRejectInput(null);
        setRejectReason('');
        await fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menolak order');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkPaidToSeller = async (orderId: string) => {
    const note = prompt('Tandai sudah ditransfer? Masukkan catatan bukti transfer (opsional):');
    if (note === null) return; // Cancelled
    
    setProcessingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/mark-paid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transfer_note: note })
      });
      if (res.ok) {
        await fetchData();
      } else {
        alert('Gagal update status: ' + await res.text());
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      'MENUNGGU_PEMBAYARAN': { bg: 'bg-stone-100', text: 'text-stone-600', label: 'Menunggu Bayar' },
      'MENUNGGU_KONFIRMASI': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Perlu Verifikasi' },
      'DIBAYAR': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Dibayar' },
      'DIPROSES': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Diproses' },
      'DIKIRIM': { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Dikirim' },
      'SELESAI': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Selesai' },
      'DITOLAK': { bg: 'bg-red-100', text: 'text-red-700', label: 'Ditolak' },
    };
    const s = map[status] || { bg: 'bg-stone-100', text: 'text-stone-600', label: status };
    return <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const pendingOrders = orders.filter(o => o.status === 'MENUNGGU_KONFIRMASI');
  const paidOrders = allOrders.filter(o => o.status === 'DIBAYAR');
  const totalRevenue = allOrders.filter(o => o.status === 'SELESAI').reduce((sum, o) => sum + (o.pace_commission || 0), 0);

  if (loading) return <div className="p-24 text-center">Memuat admin panel...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-black text-black dark:text-white italic mb-8">SUPER ADMIN</h1>

      {/* Tabs */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {['Dashboard', 'Verifikasi', 'Pencairan Dana', 'Semua Pesanan', 'Pengguna', 'Produk'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-full font-bold transition-colors whitespace-nowrap text-sm ${
              activeTab === tab 
                ? 'bg-black dark:bg-white text-white dark:text-black' 
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            {tab}
            {tab === 'Verifikasi' && pendingOrders.length > 0 && (
              <span className="ml-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full inline-flex items-center justify-center">
                {pendingOrders.length}
              </span>
            )}
            {tab === 'Pencairan Dana' && paidOrders.length > 0 && (
              <span className="ml-2 w-5 h-5 bg-blue-500 text-white text-[10px] font-black rounded-full inline-flex items-center justify-center">
                {paidOrders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'Dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-stone-50 dark:bg-stone-800 p-8 rounded-[32px] border border-stone-200 dark:border-stone-700 flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Users size={32} />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">Pengguna</p>
              <p className="text-4xl font-black italic">{stats.users}</p>
            </div>
          </div>
          <div className="bg-stone-50 dark:bg-stone-800 p-8 rounded-[32px] border border-stone-200 dark:border-stone-700 flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <Package size={32} />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">Produk</p>
              <p className="text-4xl font-black italic">{stats.products}</p>
            </div>
          </div>
          <div className="bg-stone-50 dark:bg-stone-800 p-8 rounded-[32px] border border-stone-200 dark:border-stone-700 flex items-center gap-6">
            <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center">
              <Clock size={32} />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">Perlu Verifikasi</p>
              <p className="text-4xl font-black italic text-yellow-600">{pendingOrders.length}</p>
            </div>
          </div>
          <div className="bg-stone-50 dark:bg-stone-800 p-8 rounded-[32px] border border-stone-200 dark:border-stone-700 flex items-center gap-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <DollarSign size={32} />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">Komisi PACE</p>
              <p className="text-3xl font-black italic text-green-600">Rp {totalRevenue.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
      )}

      {/* VERIFIKASI TAB — Fase 2 */}
      {activeTab === 'Verifikasi' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black italic dark:text-white">Verifikasi Pembayaran</h2>
            <span className="text-sm text-stone-400 font-bold">{pendingOrders.length} menunggu</span>
          </div>
          
          {pendingOrders.length === 0 ? (
            <div className="py-20 text-center bg-stone-50 dark:bg-stone-800 rounded-[40px] border-2 border-dashed border-stone-200 dark:border-stone-700">
              <CheckCircle size={48} className="mx-auto text-emerald-300 mb-4" />
              <p className="text-stone-500 font-bold">Semua pembayaran sudah diverifikasi! 🎉</p>
            </div>
          ) : (
            pendingOrders.map(order => (
              <div key={order.id} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-[32px] p-8 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Order Info */}
                  <div className="flex-grow space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-xs font-black text-stone-400 uppercase tracking-widest">Order #{order.id}</p>
                      {getStatusBadge(order.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">Total</p>
                        <p className="text-2xl font-black italic text-black dark:text-white">Rp {(order.total || 0).toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">User ID</p>
                        <p className="text-sm font-mono text-stone-600 dark:text-stone-300 truncate">{order.user_id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">Tanggal</p>
                        <p className="text-sm text-stone-600 dark:text-stone-300">{formatDate(order.created_at)}</p>
                      </div>
                    </div>

                    {/* Items */}
                    {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Item Pesanan</p>
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm bg-stone-50 dark:bg-stone-800 p-3 rounded-xl">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-black text-white rounded-lg flex items-center justify-center text-[10px] font-black">{item.quantity || 1}</span>
                              <span className="font-bold text-stone-700 dark:text-stone-300">{item.name}</span>
                            </div>
                            <span className="font-black italic">Rp {((item.price || 0) * (item.quantity || 1)).toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => handleApproveOrder(order.id)}
                        disabled={processingId === order.id}
                        className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={20} />
                        {processingId === order.id ? 'Memproses...' : 'APPROVE'}
                      </button>
                      {showRejectInput === order.id ? (
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            placeholder="Alasan penolakan..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            className="w-full p-3 rounded-xl border-2 border-red-200 bg-red-50 dark:bg-red-900/20 outline-none focus:border-red-400 text-sm"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleRejectOrder(order.id)} disabled={processingId === order.id} className="flex-1 py-2 bg-red-500 text-white rounded-xl font-bold text-sm disabled:opacity-50">Kirim Tolak</button>
                            <button onClick={() => { setShowRejectInput(null); setRejectReason(''); }} className="py-2 px-4 bg-stone-200 rounded-xl font-bold text-sm">Batal</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowRejectInput(order.id)}
                          className="flex-1 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-200 transition-colors"
                        >
                          <XCircle size={20} />
                          TOLAK
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Proof Image */}
                  <div className="lg:w-64 shrink-0">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Bukti Bayar</p>
                    {order.proof_url ? (
                      <div className="space-y-2">
                        <img 
                          src={order.proof_url} 
                          alt="Bukti transfer" 
                          className="w-full h-48 object-contain rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setShowProofModal(order.proof_url!)}
                        />
                        <button
                          onClick={() => setShowProofModal(order.proof_url!)}
                          className="w-full py-2 text-sm font-bold text-stone-500 flex items-center justify-center gap-1 hover:text-black dark:hover:text-white transition-colors"
                        >
                          <Eye size={16} /> Perbesar
                        </button>
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center text-stone-400">
                        <p className="text-sm font-medium">Belum ada bukti</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PENCAIRAN DANA TAB — Fase 3 */}
      {activeTab === 'Pencairan Dana' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black italic dark:text-white">Pencairan Dana</h2>
            <span className="text-sm text-stone-400 font-bold">{paidOrders.length} perlu transfer</span>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-5 rounded-2xl flex items-start gap-3">
            <CreditCard className="text-blue-500 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-bold text-blue-800 dark:text-blue-300 text-sm">Alur Dana — Komisi 10%</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Pembeli bayar penuh → Masuk ke PACE → Transfer 90% ke Seller, 10% komisi PACE
              </p>
            </div>
          </div>

          {paidOrders.length === 0 ? (
            <div className="py-20 text-center bg-stone-50 dark:bg-stone-800 rounded-[40px] border-2 border-dashed border-stone-200 dark:border-stone-700">
              <DollarSign size={48} className="mx-auto text-stone-300 mb-4" />
              <p className="text-stone-500 font-bold">Tidak ada order yang perlu ditransfer ke seller saat ini.</p>
            </div>
          ) : (
            paidOrders.map(order => {
              const total = order.total || 0;
              const shippingCost = order.shipping_cost || 0;
              const subtotal = total - shippingCost;
              const commission = Math.round(subtotal * 0.10);
              const sellerAmount = total - commission;
              
              return (
                <div key={order.id} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-[32px] p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="flex-grow space-y-4">
                      <div className="flex items-center gap-3">
                        <p className="text-xs font-black text-stone-400 uppercase tracking-widest">Order #{order.id}</p>
                        {getStatusBadge(order.status)}
                      </div>

                      {/* Commission breakdown */}
                      <div className="bg-stone-50 dark:bg-stone-800 rounded-2xl p-5 space-y-3">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-stone-500">Total dibayar pembeli</p>
                          <p className="font-black text-black dark:text-white">Rp {total.toLocaleString('id-ID')}</p>
                        </div>
                        {shippingCost > 0 && (
                          <div className="flex justify-between items-center text-stone-500">
                            <p className="text-sm">Ongkos Kirim</p>
                            <p className="font-bold">Rp {shippingCost.toLocaleString('id-ID')}</p>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-stone-500">Subtotal Produk</p>
                          <p className="font-bold text-black dark:text-white">Rp {subtotal.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="flex justify-between items-center text-red-500">
                          <p className="text-sm">Komisi PACE (10% dari Subtotal)</p>
                          <p className="font-bold">− Rp {commission.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-stone-200 dark:border-stone-600">
                          <p className="text-sm font-bold text-emerald-600">Diterima Penjual</p>
                          <p className="text-xl font-black text-emerald-600">Rp {sellerAmount.toLocaleString('id-ID')}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">Tanggal Order</p>
                          <p className="text-stone-600 dark:text-stone-300">{formatDate(order.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">User ID</p>
                          <p className="text-stone-600 dark:text-stone-300 font-mono truncate">{order.user_id}</p>
                        </div>
                      </div>
                    </div>

                    <div className="md:w-48 shrink-0 space-y-3">
                      <button
                        onClick={() => handleMarkPaidToSeller(order.id)}
                        disabled={processingId === order.id}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <DollarSign size={18} />
                        {processingId === order.id ? 'Proses...' : 'TANDAI SUDAH DIBAYAR'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SEMUA PESANAN TAB */}
      {activeTab === 'Semua Pesanan' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-black italic dark:text-white">Semua Pesanan ({allOrders.length})</h2>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-[32px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                  <tr>
                    <th className="p-4 font-bold text-stone-500 text-sm">ID</th>
                    <th className="p-4 font-bold text-stone-500 text-sm">Total</th>
                    <th className="p-4 font-bold text-stone-500 text-sm">Status</th>
                    <th className="p-4 font-bold text-stone-500 text-sm">Komisi</th>
                    <th className="p-4 font-bold text-stone-500 text-sm">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrders.map(order => (
                    <tr key={order.id} className="border-b border-stone-100 dark:border-stone-800 last:border-0">
                      <td className="p-4 font-mono text-sm text-stone-600 dark:text-stone-300">{order.id}</td>
                      <td className="p-4 font-black">Rp {(order.total || 0).toLocaleString('id-ID')}</td>
                      <td className="p-4">{getStatusBadge(order.status)}</td>
                      <td className="p-4 text-sm font-bold text-emerald-600">
                        {order.status === 'SELESAI' ? `Rp ${(order.pace_commission || 0).toLocaleString('id-ID')}` : '—'}
                      </td>
                      <td className="p-4 text-sm text-stone-500">{formatDate(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Pengguna' && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-[32px] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
              <tr>
                <th className="p-4 font-bold text-stone-500">Email</th>
                <th className="p-4 font-bold text-stone-500">Role</th>
                <th className="p-4 font-bold text-stone-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-stone-100 dark:border-stone-800 last:border-0">
                  <td className="p-4 font-medium dark:text-stone-200">{u.email}</td>
                  <td className="p-4"><span className="px-3 py-1 bg-stone-100 dark:bg-stone-700 rounded-full text-xs font-bold uppercase dark:text-stone-300">{u.role || 'User'}</span></td>
                  <td className="p-4">
                    <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Produk' && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-[32px] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
              <tr>
                <th className="p-4 font-bold text-stone-500">Produk</th>
                <th className="p-4 font-bold text-stone-500">Harga</th>
                <th className="p-4 font-bold text-stone-500">Kategori</th>
                <th className="p-4 font-bold text-stone-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b border-stone-100 dark:border-stone-800 last:border-0">
                  <td className="p-4 flex items-center gap-3">
                    <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <span className="font-bold dark:text-stone-200">{p.name}</span>
                  </td>
                  <td className="p-4 font-medium dark:text-stone-300">Rp {p.price.toLocaleString('id-ID')}</td>
                  <td className="p-4 text-sm text-stone-500">{p.category}</td>
                  <td className="p-4">
                    <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Proof Modal (Zoom) */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowProofModal(null)}>
          <div className="max-w-3xl max-h-[90vh] overflow-auto">
            <img src={showProofModal} alt="Bukti Bayar" className="w-full h-auto rounded-2xl" />
          </div>
          <button className="absolute top-6 right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg text-black font-bold">✕</button>
        </div>
      )}
    </div>
  );
}
