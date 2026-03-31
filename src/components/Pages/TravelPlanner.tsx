import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Map, Calendar, Wallet, Sparkles, Loader2, ArrowRight, ShoppingBag, MapPin, X, Star, Users, Check, ChevronDown, Clock, Plane } from 'lucide-react';
import { generateTravelItinerary, smartSearchProducts } from '../../services/aiService';
import ReactMarkdown from 'react-markdown';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '../../types';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../components/ui/Toast';
import { attractions, Attraction } from '../../data/attractions';

interface DayPlan {
  day: number;
  theme: string;
  activities: { time: string; title: string; location: string; image: string; description: string }[];
}

export default function TravelPlanner() {
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState('Alam & Budaya');
  const [budget, setBudget] = useState('Menengah (Nyaman)');
  const [originCity, setOriginCity] = useState('');
  const [itinerary, setItinerary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [recommendedAttractions, setRecommendedAttractions] = useState<Attraction[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setAllProducts(data))
      .catch(err => console.error("Failed to fetch products:", err));
  }, []);

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

  const toggleDay = (day: number) => {
    setExpandedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const getVisualItinerary = () => {
    const plans: DayPlan[] = [];
    const interestLower = interests.toLowerCase();
    const locationImages: Record<string, string> = {
      'sentani': 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800',
      'jayapura': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
      'raja ampat': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
      'biak': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      'fakfak': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      'manokwari': 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800',
      'sorong': 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800',
      'merauke': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800',
      'tembagapura': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
      'lake': 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800',
      'waterfall': 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800',
      'beach': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      'island': 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800',
      'mountain': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
      'default': 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800'
    };
    
    const getImage = (location: string) => {
      const locLower = location.toLowerCase();
      for (const [key, url] of Object.entries(locationImages)) {
        if (locLower.includes(key)) return url;
      }
      return locationImages['default'];
    };

    const activityTemplates = {
      'Alam & Budaya': [
        { time: '08:00', title: 'Sarapan Lokal & Briefing', location: 'Hotel', description: 'Nikmati sarapan khas Papua dengan tradisi lokal' },
        { time: '09:30', title: 'Kunjung Danau Sentani', location: 'Danau Sentani', description: 'Terjun langsung ke keindahan danau terbesar di Papua' },
        { time: '12:30', title: 'Makan Siang di Dermaga', location: 'Sentani', description: 'Cicipi ikan bakar segar dari danau' },
        { time: '14:00', title: 'Museum汶兰', location: 'Jayapura', description: 'Telusuri sejarah dan budaya Papua' },
        { time: '17:00', title: 'Sunset di Pantai Base-G', location: 'Jayapura', description: 'Nikmati matahari terbenam di bibir pantai' },
        { time: '19:00', title: 'Makan Malam & Kuliner Lokal', location: 'Sentani', description: 'Explorasi kuliner malam di kota' }
      ],
      'Pantai & Diving': [
        { time: '07:00', title: 'Sarapan Pagi', location: 'Hotel', description: 'Persiapan fisik untuk aktivitas air' },
        { time: '08:30', title: 'Snorkeling di Pulau Rhode', location: 'Pulau Rhode', description: 'Terjun ke bawah laut dengan terumbu karang menakjubkan' },
        { time: '12:00', title: 'Makan Siang Seafood', location: 'Pantai', description: 'Nikmati hidangan laut segar' },
        { time: '13:30', title: 'Diving Eksplorasi', location: 'Spot Diving', description: 'Explore bawah laut Raja Ampat' },
        { time: '16:00', title: 'Relax di Pantai Putih', location: 'Pantai', description: 'Bersantai di pasir putih murni' },
        { time: '18:30', title: 'BBQ Dinner di Pantai', location: 'Resort', description: 'Makan malam dengan tema beach party' }
      ],
      'Petualangan Ekstrem': [
        { time: '06:00', title: 'Sarapan Energi', location: 'Base Camp', description: 'Persiapan untuk petualangan harian' },
        { time: '07:30', title: 'Trekking Gunung Cycloop', location: 'Gunung Cycloop', description: 'Petualangan mendaki dengan pemandangan spektakuler' },
        { time: '12:00', title: 'Packed Lunch di Puncak', location: 'Puncak', description: 'Makan siang dengan pemandangan udara' },
        { time: '14:00', title: 'Rafting di Sungai Drait', location: 'Sungai Drait', description: 'Arus deras yang mendebarkan' },
        { time: '17:00', title: 'Kembali ke Penginapan', location: 'Hotel', description: 'Istirahat dan pemulihan' },
        { time: '19:00', title: 'Dinner & Story Telling', location: 'Base Camp', description: 'Cerita pengalaman petualangan' }
      ],
      'Kuliner & Santai': [
        { time: '08:00', title: 'Sarapan Tradisional', location: 'Kedai Lokal', description: 'Cicipi papeda, sagu, dan ikan bakar' },
        { time: '10:00', title: 'Market Tour', location: 'Pasar Sentani', description: 'Jelajahi pasar tradisional dan oleh-oleh' },
        { time: '12:30', title: 'Makan Siang Kuliner Tour', location: 'Kuliner Spots', description: 'Sampling berbagai makanan lokal' },
        { time: '14:30', title: 'Coffee Break', location: 'Cafe Lokal', description: 'Nikmati kopi Papua berkualitas tinggi' },
        { time: '16:00', title: 'Spa & Massage', location: 'Spa', description: 'Relaksasi dengan tradisional message' },
        { time: '19:00', title: 'Dinner Experience', location: 'Restaurant', description: 'Fine dining dengan cita rasa lokal' }
      ],
      'Wisata Sejarah': [
        { time: '08:00', title: 'Museum Cenderawasih', location: 'Jayapura', description: 'Koleksi satwa Papua dan sejarah' },
        { time: '10:30', title: 'Monumen Papua', location: 'Monumen', description: 'Pelajari sejarah perjuangan rakyat Papua' },
        { time: '12:30', title: 'Makan Siang', location: 'Restaurant', description: 'Istirahat dan isi tenaga' },
        { time: '14:00', title: 'Desa Budaya Asmat', location: 'Sorong', description: 'Kesenian dan peradaban tribe Asmat' },
        { time: '17:00', title: 'Pertunjukan Seni', location: 'Village', description: 'Tarian tradisional dan rituals' },
        { time: '19:00', title: 'Dinner & Diskusi', location: 'Hotel', description: 'Sharing tentang pengetahuan baru' }
      ],
      'Fotografi & Konten': [
        { time: '05:00', title: 'Sunrise Hunting', location: 'Spot Alam', description: 'Golden hour untuk foto terbaik' },
        { time: '08:00', title: 'Portrait Session', location: 'Lokasi Ikonik', description: 'Dokumentasi diri di spot estetik' },
        { time: '11:00', title: 'Underwater Shooting', location: 'Diving Spot', description: 'Capture keindahan bawah laut' },
        { time: '13:00', title: 'Lunch Break', location: 'Beach Club', description: 'Waktu untuk edit foto' },
        { time: '15:00', title: 'Aerial Photography', location: 'Drone Spots', description: ' Panorama dari atas' },
        { time: '18:00', title: 'Sunset Content', location: 'Sunset Spot', description: 'Golden hour kedua untuk konten' }
      ],
      'Ekowisata & Birdwatching': [
        { time: '05:30', title: 'Bird Watching Awal', location: 'Hutan Fog', description: 'Spotting burung langka like bird of paradise' },
        { time: '09:00', title: 'Jungle Trekking', location: 'Hutan Tropis', description: 'Explore keanekaragaman hayati' },
        { time: '12:00', title: 'Picnic Lunch', location: 'Forest Camp', description: 'Makan di tengah alam' },
        { time: '14:00', title: 'River Cruise', location: 'Sungai', description: 'Explore sungai dan ekosistem' },
        { time: '16:30', title: 'Butterfly Garden', location: 'Garden', description: 'Observation kupu-kupu' },
        { time: '18:30', title: 'Night Walk', location: 'Forest', description: 'Search nocturnal wildlife' }
      ],
      'Kerajinan & Seni Lokal': [
        { time: '08:00', title: 'Workshop Tenun', location: 'Village', description: 'Belajar tenun tradisional Papua' },
        { time: '10:30', title: 'Carving Session', location: 'Studio', description: 'Ukir kayu仁丹 khas Papua' },
        { time: '12:30', title: 'Makan Siang', location: 'Village', description: 'Makan tradisional bersama keluarga' },
        { time: '14:00', title: 'Beadwork Class', location: 'Workshop', description: 'Membuat perhiasan khas tribe' },
        { time: '16:00', title: 'Gallery Visit', location: 'Gallery', description: 'Koleksi seni terkini' },
        { time: '18:00', title: 'Souvenir Shopping', location: 'Market', description: 'Beli kerajinan untuk kenang-kenangan' }
      ]
    };

    const template = activityTemplates[interests as keyof typeof activityTemplates] || activityTemplates['Alam & Budaya'];
    
    for (let day = 1; day <= days; day++) {
      const activities = template.map((act, idx) => ({
        ...act,
        location: act.location.replace('Hotel', day <= 1 ? 'Jayapura' : 'Sentani'),
        image: getImage(act.location)
      }));
      
      plans.push({
        day,
        theme: interests,
        activities
      });
    }
    
    return plans;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setItinerary('');
    setRecommendedProducts([]);
    setRecommendedAttractions([]);
    setError('');

    abortRef.current = new AbortController();

    try {
      const result = await generateTravelItinerary(days, interests, budget, originCity);
      setItinerary(result);

      // Filter attractions based on interests
      const interestLower = interests.toLowerCase();
      let filteredAttractions = attractions;
      
      if (interestLower.includes('pantai') || interestLower.includes('diving')) {
        filteredAttractions = attractions.filter(a => 
          a.category.toLowerCase().includes('bahari') || 
          a.category.toLowerCase().includes('pantai')
        );
      } else if (interestLower.includes('budaya')) {
        filteredAttractions = attractions.filter(a => 
          a.category.toLowerCase().includes('budaya') ||
          a.category.toLowerCase().includes('danau')
        );
      } else if (interestLower.includes('petualangan') || interestLower.includes('ekstrem')) {
        filteredAttractions = attractions.filter(a => 
          a.category.toLowerCase().includes('pegunungan') ||
          a.category.toLowerCase().includes('bahari')
        );
      } else if (interestLower.includes('fotografi')) {
        filteredAttractions = attractions;
      }
      
      setRecommendedAttractions(filteredAttractions.slice(0, 3));

      if (allProducts.length > 0) {
        const query = `Rekomendasi produk Papua untuk wisatawan minat ${interests} selama ${days} hari`;
        const recommendations = await smartSearchProducts(query, allProducts);
        setRecommendedProducts(recommendations.slice(0, 3));
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (err.message?.includes('timeout') || err.message?.includes('AbortError')) {
        setError('Permintaan timeout. Koneksi lambat atau server sedang sibuk, coba lagi.');
      } else {
        setError(`Terjadi kesalahan: ${err.message}. Silakan coba lagi.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-6 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-black uppercase tracking-[0.4em] rounded-full mb-6">
            PACE AI Planner
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-black dark:text-white italic uppercase tracking-tighter mb-6">
            RENCANAKAN <span className="text-emerald-600">PERJALANANMU</span>
          </h1>
          <p className="text-xl font-serif italic text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
            Biarkan AI kami menyusun itinerary sempurna untuk liburanmu di Papua, lengkap dengan rekomendasi destinasi dan oleh-oleh lokal.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-stone-900 p-8 rounded-[40px] shadow-xl border border-stone-100 dark:border-stone-800 sticky top-32">
              <h2 className="text-2xl font-black text-black dark:text-white italic uppercase tracking-tight mb-8">Detail Liburan</h2>

              <form onSubmit={handleGenerate} className="space-y-6">
                {/* Durasi */}
                <div>
                  <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2 uppercase tracking-widest">Durasi (Hari)</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                    <input
                      type="number" min="1" max="14"
                      value={days}
                      onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl py-4 pl-12 pr-4 text-black dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Minat */}
                <div>
                  <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2 uppercase tracking-widest">Minat Utama</label>
                  <div className="relative">
                    <Map className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                    <select
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl py-4 pl-12 pr-4 text-black dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                    >
                      <option>Alam & Budaya</option>
                      <option>Pantai & Diving</option>
                      <option>Petualangan Ekstrem</option>
                      <option>Kuliner & Santai</option>
                      <option>Wisata Sejarah</option>
                      <option>Fotografi & Konten</option>
                      <option>Ekowisata & Birdwatching</option>
                      <option>Kerajinan & Seni Lokal</option>
                    </select>
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2 uppercase tracking-widest">Gaya Liburan</label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                    <select
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl py-4 pl-12 pr-4 text-black dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                    >
                      <option>Backpacker (Hemat)</option>
                      <option>Menengah (Nyaman)</option>
                      <option>Mewah (Premium)</option>
                    </select>
                  </div>
                </div>

                {/* Kota Asal */}
                <div>
                  <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2 uppercase tracking-widest">Kota Asal <span className="text-stone-400 normal-case font-normal">(opsional)</span></label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                    <input
                      type="text"
                      placeholder="cth: Jakarta, Surabaya..."
                      value={originCity}
                      onChange={(e) => setOriginCity(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl py-4 pl-12 pr-4 text-black dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 nike-button flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                    {isLoading ? 'Membuat...' : 'Buat Itinerary'}
                  </button>
                  {isLoading && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Batalkan"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Result */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-stone-900 p-8 md:p-12 rounded-[40px] shadow-xl border border-stone-100 dark:border-stone-800 min-h-[600px]">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-6 py-32">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-stone-100 dark:border-stone-800 rounded-full"></div>
                    <div className="w-24 h-24 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin absolute inset-0"></div>
                    <Sparkles className="absolute inset-0 m-auto text-emerald-500 animate-pulse" size={32} />
                  </div>
                  <p className="text-xl font-serif italic animate-pulse">AI sedang meracik perjalanan impianmu...</p>
                  <p className="text-sm text-stone-400">Biasanya selesai dalam 10–20 detik</p>
                </div>
              ) : error ? (
                <div className="h-full flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                    <X size={36} className="text-red-400" />
                  </div>
                  <h3 className="text-xl font-black text-red-500 mb-3">Ups, Ada Masalah</h3>
                  {error.includes('Groq API key') ? (
                    <div className="max-w-sm text-center">
                      <p className="text-stone-500 dark:text-stone-400 mb-3">
                        <code className="bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded text-sm font-mono">GROQ_API_KEY</code> belum diisi di dashboard Vercel atau file <code className="bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded text-sm font-mono">.env</code>.
                      </p>
                    </div>
                  ) : (
                    <p className="text-stone-500 dark:text-stone-400 max-w-sm text-center">{error}</p>
                  )}
                  <button
                    onClick={() => setError('')}
                    className="mt-6 px-6 py-3 bg-stone-100 dark:bg-stone-800 rounded-2xl font-bold text-sm hover:bg-stone-200 transition-colors"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : itinerary ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <Plane className="text-emerald-500" size={20} />
                      <span className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Trip to Papua</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-black dark:text-white italic uppercase tracking-tighter">
                      {days} Hari {interests}
                    </h2>
                    <p className="text-stone-500 dark:text-stone-400 mt-2">Total Budget: {budget}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    {getVisualItinerary().map((dayPlan) => (
                      <div key={dayPlan.day} className="bg-stone-50 dark:bg-stone-950 rounded-3xl overflow-hidden border border-stone-100 dark:border-stone-800">
                        <button
                          onClick={() => toggleDay(dayPlan.day)}
                          className="w-full p-6 flex items-center justify-between hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-black text-xl">
                              H{dayPlan.day}
                            </div>
                            <div className="text-left">
                              <h3 className="font-black text-lg text-black dark:text-white">Hari {dayPlan.day}</h3>
                              <p className="text-sm text-stone-500">{dayPlan.theme}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-stone-400 text-sm">
                              <Clock size={16} />
                              {dayPlan.activities.length} Activities
                            </div>
                            <ChevronDown className={`text-stone-400 transition-transform ${expandedDays.includes(dayPlan.day) ? 'rotate-180' : ''}`} size={24} />
                          </div>
                        </button>
                        
                        {expandedDays.includes(dayPlan.day) && (
                          <div className="px-6 pb-6 space-y-4">
                            {dayPlan.activities.map((activity, idx) => (
                              <div key={idx} className="flex gap-4 group">
                                <div className="flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden bg-stone-200">
                                  <img src={activity.image} alt={activity.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <div className="flex-1 min-w-0 py-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-emerald-600">{activity.time}</span>
                                    <span className="text-xs text-stone-400">•</span>
                                    <span className="text-xs text-stone-500">{activity.location}</span>
                                  </div>
                                  <h4 className="font-bold text-black dark:text-white mb-1">{activity.title}</h4>
                                  <p className="text-sm text-stone-500 line-clamp-2">{activity.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {recommendedAttractions.length > 0 && (
                    <div className="mt-12 pt-12 border-t border-stone-100 dark:border-stone-800">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                          <Map className="text-emerald-500" size={24} />
                          Destinasi Wisata Pilihan
                        </h3>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
                          <Check className="text-emerald-600" size={20} />
                          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                            Rekomendasi dari AI Planner
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {recommendedAttractions.map(attraction => (
                          <Link 
                            to={`/attraction/${attraction.id}`} 
                            key={attraction.id} 
                            className="group block bg-stone-50 dark:bg-stone-950 rounded-3xl overflow-hidden border border-stone-100 dark:border-stone-800 hover:border-emerald-500 transition-all duration-300 hover:shadow-xl"
                          >
                            <div className="aspect-[4/3] overflow-hidden bg-stone-200 dark:bg-stone-800">
                              <img 
                                src={attraction.image_url} 
                                alt={attraction.name} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                              />
                            </div>
                            <div className="p-5">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest rounded-full">
                                  {attraction.category}
                                </span>
                                <div className="flex items-center gap-1 text-amber-500">
                                  <Star size={14} fill="currentColor" />
                                  <span className="text-xs font-bold">{attraction.rating}</span>
                                </div>
                              </div>
                              <h4 className="font-black text-lg text-black dark:text-white mb-1 group-hover:text-emerald-600 transition-colors">
                                {attraction.name}
                              </h4>
                              <p className="text-sm text-stone-500 dark:text-stone-400 mb-3 flex items-center gap-1">
                                <MapPin size={12} />
                                {attraction.location}
                              </p>
                              <div className="flex flex-wrap gap-2 mb-4">
                                {attraction.facilities.slice(0, 3).map(facility => (
                                  <span key={facility} className="text-xs px-2 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-lg">
                                    {facility}
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
                                <p className="text-emerald-600 font-black">
                                  Rp {attraction.price.toLocaleString('id-ID')}
                                </p>
                                <div className="flex items-center gap-1 text-stone-400 text-xs">
                                  <Users size={12} />
                                  {attraction.reviews.toLocaleString('id-ID')} review
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <div className="mt-6 text-center">
                        <Link 
                          to="/wisata" 
                          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-colors"
                        >
                          Lihat Semua Destinasi <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  )}

                  {recommendedProducts.length > 0 && (
                    <div className="mt-12 pt-12 border-t border-stone-100 dark:border-stone-800">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                          <Sparkles className="text-emerald-500" size={24} />
                          Rekomendasi Oleh-oleh AI
                        </h3>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
                          <ShoppingBag className="text-emerald-600" size={20} />
                          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                            Pesan di PACE, dikirim ke rumahmu!
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {recommendedProducts.map(product => (
                          <Link to={`/product/${product.id}`} key={product.id} className="group block bg-stone-50 dark:bg-stone-950 rounded-3xl overflow-hidden border border-stone-100 dark:border-stone-800 hover:border-emerald-500 transition-colors">
                            <div className="aspect-square overflow-hidden bg-stone-200 dark:bg-stone-800">
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="p-4">
                              <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-1">{product.category}</p>
                              <h4 className="font-bold text-black dark:text-white line-clamp-1 mb-2">{product.name}</h4>
                              <p className="text-emerald-600 font-black mb-4">Rp {product.price.toLocaleString('id-ID')}</p>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  addToCart(product);
                                  showToast('Produk berhasil ditambahkan ke keranjang!');
                                  navigate('/checkout');
                                }}
                                className="w-full py-2 bg-black text-white rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors"
                              >
                                Beli Sekarang
                              </button>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-16 pt-12 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <button
                      onClick={() => { setItinerary(''); setRecommendedProducts([]); setRecommendedAttractions([]); }}
                      className="text-sm font-bold text-stone-400 hover:text-black dark:hover:text-white transition-colors"
                    >
                      ← Buat Itinerary Baru
                    </button>
                    <Link to="/wisata" className="nike-button px-8 flex items-center gap-2 text-sm">
                      Lihat Semua Tiket Wisata <ArrowRight size={16} />
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-6 py-32 text-center">
                  <div className="w-24 h-24 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center">
                    <Map size={40} className="text-stone-300 dark:text-stone-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-stone-300 dark:text-stone-600 italic uppercase tracking-tighter mb-2">Belum Ada Rencana</h3>
                    <p className="text-lg font-serif italic">Isi form di samping untuk mulai merencanakan liburanmu.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
