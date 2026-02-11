// 楽天API呼び出しクライアント（フロントエンド用）

let rakutenConfig = null;

// 楽天APIキーを取得
async function loadRakutenConfig() {
  if (rakutenConfig) return rakutenConfig;
  
  try {
    const response = await axios.get('/api/config');
    rakutenConfig = response.data;
    return rakutenConfig;
  } catch (error) {
    console.error('楽天APIキー取得エラー:', error);
    return null;
  }
}

// 楽天API検索関数（フロントエンドから直接呼び出し）
async function searchRakutenProducts(keyword, maxItems = 10) {
  const config = await loadRakutenConfig();
  
  if (!config || !config.hasApiKeys) {
    console.log('楽天APIキーが未設定です。デモデータを使用します。');
    return [];
  }
  
  try {
    const params = new URLSearchParams({
      format: 'json',
      applicationId: config.rakutenAppId,
      accessKey: config.rakutenAccessKey,
      keyword: keyword,
      hits: maxItems.toString(),
      minPrice: '1000',
      maxPrice: '10000',
      sort: '-reviewCount',
      affiliateId: config.rakutenAffiliateId
    });
    
    const apiUrl = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?${params.toString()}`;
    
    console.log('楽天API呼び出し:', keyword);
    
    // ブラウザから直接呼び出し（Refererヘッダーが自動的に送信される）
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('楽天APIエラー:', response.status, errorText);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.Items || data.Items.length === 0) {
      console.log('楽天APIから商品が見つかりませんでした');
      return [];
    }
    
    console.log(`楽天APIから${data.Items.length}件取得成功`);
    
    // データを整形
    return data.Items.map(item => ({
      name: item.Item.itemName,
      price: item.Item.itemPrice,
      url: item.Item.affiliateUrl || item.Item.itemUrl,
      imageUrl: item.Item.mediumImageUrls?.[0]?.imageUrl || '/static/placeholder.jpg',
      reviewCount: item.Item.reviewCount || 0,
      rating: item.Item.reviewAverage || 0,
      category: 'おすすめ商品',
      caption: item.Item.itemCaption || ''
    }));
    
  } catch (error) {
    console.error('楽天API呼び出しエラー:', error);
    return [];
  }
}
