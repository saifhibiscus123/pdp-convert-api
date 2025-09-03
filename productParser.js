function parseZepto(json) {
  const product = json?.pageLayout?.header?.Widget?.data?.productInfo?.product || {};
  const variant = json?.pageLayout?.header?.Widget?.data?.productInfo?.productVariant || {};
  const availability = variant?.availability || {};
  const stockStatus = availability.avail_status === '001' ? 'Available' : 'Out of Stock';
  const availableBool = stockStatus === 'Available';
  return {
    title: product.name || '',
    brand: product.brand || '',
    price: variant.discountedSellingPrice
      ? (variant.discountedSellingPrice / 100).toFixed(2)
      : (variant.mrp / 100).toFixed(2) || '',
    imageUrl: (variant.images && variant.images.length) ? ('https://www.zeptonow.com/' + variant.images[0].path) : '',
    rating: (variant.ratingSummary && variant.ratingSummary.averageRating) || '',
    reviewCount: (variant.ratingSummary && variant.ratingSummary.totalRatings) || '',
    description: (product.description && Array.isArray(product.description)) ? product.description.join(' ') : '',
    offers: '',
    highlights: (variant.l4AttributesResponse && variant.l4AttributesResponse.highlights) ?
      variant.l4AttributesResponse.highlights.map(h => `${h.key}: ${h.value}`) : [],
    stock: stockStatus,
    available: availableBool,
    eta: availability.medium_eta || ''
  };
}

function parseBigbasket(json) {
  const p = json?.data?.product || {};
  const availability = p.availability || {};
  const stockStatus = availability.avail_status === '001' ? 'Available' : 'Out of Stock';
  const availableBool = stockStatus === 'Available';
  return {
    title: p.desc || '',
    brand: p.brand?.name || '',
    price: '', // Add price logic if needed
    imageUrl: (p.images && p.images.length) ? p.images[0].l : '',
    rating: '',
    reviewCount: '',
    description: p.desc || '',
    offers: '',
    highlights: [p.w, p.pack_desc].filter(Boolean),
    stock: stockStatus,
    available: availableBool,
    eta: availability.medium_eta || ''
  };
}

function parseBlinkit(json) {
  const item = json?.response?.snippets?.[0]?.data?.items?.[0]?.data;
  const availability = item?.availability || {};
  const stockStatus = availability.status === 'AVAILABLE' ? 'Available' : 'Out of Stock';
  const availableBool = stockStatus === 'Available';
  return {
    title: item?.display_name?.text || '',
    brand: item?.brand || '',
    price: item?.pricing_info?.price?.text?.replace(/[^\d]/g, '') || '',
    imageUrl: item?.media_container?.items?.[0]?.image?.url || '',
    rating: item?.rating?.bar?.value || '',
    reviewCount: item?.rating?.bar?.title?.text?.replace(/[^\d]/g, '') || '',
    description: '',
    offers: '',
    highlights: item?.highlights?.items?.map(h => h.text?.text) || [],
    stock: stockStatus,
    available: availableBool,
    eta: availability.eta || ''
  };
}

function universalParser(fileContent) {
  let data;
  try { data = JSON.parse(fileContent); } catch (e) { data = null; }
  if (data) {
    if (data.pageLayout && data.pageLayout.header) return parseZepto(data);
    if (data.data && data.data.product) return parseBigbasket(data);
    if (data.response && data.response.snippets) return parseBlinkit(data);
  }
  return {
    title: '', brand: '', price: '', imageUrl: '', rating: '', reviewCount: '',
    description: '', offers: '', highlights: [], stock: '', available: false, eta: ''
  };
}

module.exports = universalParser;
