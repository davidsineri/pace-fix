export async function generateTravelItinerary(days: number, interests: string, budget: string, originCity?: string): Promise<string> {
  const prompt = `Buat itinerary perjalanan ${days} hari di Papua Indonesia dengan minat ${interests} dan budget ${budget}${originCity ? ` dari ${originCity}` : ''}. Berikan detail setiap hari termasuk tempat wisata, aktivitas, makanan lokal, dan tips perjalanan dalam bahasa Indonesia yang menarik.`;

  const res = await fetch('/api/ai-planner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, itinerary tidak dapat dibuat.';
}

export async function chatWithAgent(
  message: string,
  history: { role: string; text: string }[] = [],
  productsContext: any[] = []
): Promise<string> {
  let prompt = message;
  if (productsContext?.length > 0) {
    prompt += `\n\nProduk yang tersedia: ${JSON.stringify(productsContext.map((p: any) => ({ id: p.id, name: p.name, price: p.price })))}`;
  }

  const res = await fetch('/api/ai-planner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, saya tidak dapat menjawab saat ini.';
}

export async function smartSearchProducts(query: string, products: any[]): Promise<any[]> {
  const q = query.toLowerCase();
  return products.filter(p =>
    p.name?.toLowerCase().includes(q) ||
    p.description?.toLowerCase().includes(q) ||
    p.category?.toLowerCase().includes(q)
  );
}

export async function generateProductDescription(imageUrl: string): Promise<string> {
  const prompt = `Deskripsikan produk dari gambar ini dalam bahasa Indonesia yang menarik untuk ecommerce.`;

  const res = await fetch('/api/ai-planner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function getPackagingAdvice(question: string): Promise<string> {
  const prompt = `Kamu adalah ahli packaging produk Papua. Berikan advice dalam bahasa Indonesia untuk pertanyaan ini: ${question}`;

  const res = await fetch('/api/ai-planner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
