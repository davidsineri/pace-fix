export async function generateTravelItinerary(days: number, interests: string, budget: string, originCity?: string): Promise<string> {
  const prompt = `Buat itinerary perjalanan ${days} hari di Papua Indonesia dengan minat ${interests} dan budget ${budget}${originCity ? ` dari ${originCity}` : ''}. Berikan detail setiap hari termasuk tempat wisata, aktivitas, makanan lokal, dan tips perjalanan dalam bahasa Indonesia yang menarik.`;

  try {
    const puter = (window as any).puter;
    if (!puter) throw new Error("Puter SDK tidak dimuat");

    const response = await puter.ai.chat(prompt, { model: 'x-ai/grok-4.20-beta' });
    return response?.message?.content || 'Maaf, itinerary tidak dapat dibuat.';
  } catch (err: any) {
    throw new Error(err.message || "Gagal menghubungi Grok AI via Puter");
  }
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

  try {
    const puter = (window as any).puter;
    if (!puter) throw new Error("Puter SDK tidak dimuat");

    const response = await puter.ai.chat(prompt, { model: 'x-ai/grok-4.20-beta' });
    return response?.message?.content || 'Maaf, saya tidak dapat menjawab saat ini.';
  } catch (err: any) {
    throw new Error(err.message || "Gagal menghubungi Grok AI via Puter");
  }
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

  try {
    const puter = (window as any).puter;
    if (!puter) throw new Error("Puter SDK tidak dimuat");

    const response = await puter.ai.chat(prompt, { model: 'x-ai/grok-4.20-beta' });
    return response?.message?.content || '';
  } catch (err: any) {
    throw new Error(err.message || "Gagal menghubungi Grok AI via Puter");
  }
}

export async function getPackagingAdvice(question: string): Promise<string> {
  const prompt = `Kamu adalah ahli packaging produk Papua. Berikan advice dalam bahasa Indonesia untuk pertanyaan ini: ${question}`;

  try {
    const puter = (window as any).puter;
    if (!puter) throw new Error("Puter SDK tidak dimuat");

    const response = await puter.ai.chat(prompt, { model: 'x-ai/grok-4.20-beta' });
    return response?.message?.content || '';
  } catch (err: any) {
    throw new Error(err.message || "Gagal menghubungi Grok AI via Puter");
  }
}
